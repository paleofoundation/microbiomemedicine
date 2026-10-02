// Karen's sitewide rule: punctuation first, then superscripted bracketed citations.
// This is presentation only: retain authored numbers, order, link targets and IDs.
const NUMBER_LIST = String.raw`\d+(?:\s*(?:[,;]|[-–])\s*\d+)*`;
const MARKER = new RegExp(String.raw`\[+\s*(${NUMBER_LIST})\s*\]+`, "g");
const SPACE = String.raw`(?:\s|&nbsp;|&#160;|&#x0*a0;)*`;
const TOKEN = "\u0001C\\d+\u0001";
const visibleText = (html: string) => html.replace(/<[^>]*>/g, "").replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ").trim();

export function formatInlineCitations(html: string, options?: { numericSuperscripts?: boolean }): string {
  if (!html) return html;
  const protectedHtml: string[] = [];
  const citations: string[] = [];
  const protect = (value: string) => `\u0002${protectedHtml.push(value) - 1}\u0002`;
  const cite = (value: string) => `\u0001C${citations.push(value) - 1}\u0001`;
  // Code, diagrams and bibliography numbering are not inline citations.
  let out = html.replace(/<!--[^]*?-->|<(script|style|pre|code|textarea|svg|math)\b[^>]*>[^]*?<\/\1\s*>|<ol\b[^>]*\bclass\s*=\s*["'][^"']*\brgbc-references\b[^"']*["'][^>]*>[^]*?<\/ol>/gi, (block) => protect(block));
  // Imported bibliographies can mix numbered paragraphs with annotations. Keep
  // those reference entries at baseline, even when they are not inside an ol.
  out = out.replace(/(<(p|h[1-6])\b[^>]*>(?:\s|<br\b[^>]*>|<\/?(?:strong|b|span)\b[^>]*>)*References(?:\s|<\/?(?:strong|b|span)\b[^>]*>)*<\/\2>)([^]*?)(?=<h[1-6]\b|$)/gi,
    (_region, heading: string, _tag: string, body: string) => heading + body.replace(/<p\b[^>]*>(?:\s|&nbsp;)*\[\d+\][^]*?<\/p>/gi, (entry) => protect(entry)));
  out = out.replace(/<sup\b[^>]*>([^<>]*)<\/sup>/gi, (sup, body: string) => {
    const label = visibleText(body);
    if (options?.numericSuperscripts && /^[,\s]*\d+(?:[\s,;–-]+\d+)*$/.test(label)) {
      return cite(`[${label.match(/\d+/g)!.join(", ")}]`);
    }
    // Preserve genuine numeric exponents before repairing malformed outer wrappers.
    return /^\d+[+-]?$/.test(label) ? protect(sup) : sup;
  });

  // Accept linked [N] markers, including reversed <a><sup>[N]</sup></a> nesting.
  // A bare numeric link is a citation only when its attributes identify it as one.
  out = out.replace(/<a\b([^>]*)>([^]*?)<\/a>/gi, (anchor, attrs: string, body: string) => {
    const label = visibleText(body);
    const match = label.match(new RegExp(`^\\[*\\s*(${NUMBER_LIST})\\s*\\]*([.]?)$`));
    if (!match || (!label.startsWith("[") && !/\brgbc-reference\b|\bdata-signature-reference\b|\brole=["']doc-noteref["']/i.test(attrs))) return anchor;
    return cite(`<a${attrs}>[${match[1].trim()}]</a>`) + match[2];
  });

  const bracketMarkers = (value: string) => value.replace(MARKER, (_marker, numbers: string) => cite(`[${numbers.trim()}]`));
  const unwrapBrackets = (value: string) => value
    .replace(new RegExp(`\\[+${SPACE}(${TOKEN})`, "g"), "$1")
    .replace(new RegExp(`(${TOKEN})${SPACE}\\]+`, "g"), "$1");

  // Captures contain nested superscripts and formatting wrappers. Match balanced
  // outer blocks so normalization cannot leave an orphan or add nesting on rerender.
  const superscripts: { start: number; end: number; bodyStart: number; bodyEnd: number }[] = [];
  let depth = 0, start = 0, bodyStart = 0;
  for (const match of out.matchAll(/<\/?sup\b[^>]*>|<\/(?:p|td|th|li|div|section|details|summary|h[1-6])\s*>/gi)) {
    if (!/^<\/?sup\b/i.test(match[0])) {
      // HTML block boundaries also end malformed, unclosed legacy superscripts.
      if (depth > 0) superscripts.push({ start, end: match.index, bodyStart, bodyEnd: match.index });
      depth = 0;
      continue;
    }
    if (!/^<\//.test(match[0])) {
      if (depth++ === 0) { start = match.index; bodyStart = start + match[0].length; }
    } else if (depth > 0 && --depth === 0) {
      superscripts.push({ start, end: match.index + match[0].length, bodyStart, bodyEnd: match.index });
    }
  }
  if (depth > 0) superscripts.push({ start, end: out.length, bodyStart, bodyEnd: out.length });
  for (const block of superscripts.reverse()) {
    const original = out.slice(block.start, block.end);
    const body = out.slice(block.bodyStart, block.bodyEnd);
    const withoutSup = body.replace(/<\/?sup\b[^>]*>/gi, "");
    const normalized = unwrapBrackets(bracketMarkers(withoutSup))
      .replace(/<\/?(?:sup|sub|span|strong|b|i|em|small|mark)\b[^>]*>/gi, "");
    const remainder = visibleText(normalized).replace(new RegExp(TOKEN, "g"), "").replace(/[\s,;.–-]/g, "");
    // An unclosed citation sup can enclose the rest of a paragraph. Restore its
    // prose to baseline while leaving scientific superscripts protected above.
    const replacement = normalized.includes("\u0001C") ? (!remainder ? normalized : withoutSup) : original;
    out = out.slice(0, block.start) + replacement + out.slice(block.end);
  }

  // Normalize unlinked [N] markers too, without inventing a missing source link.
  // Tokenize tags separately so numeric brackets in attributes/URLs stay untouched.
  out = out.replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>|([^<]+)/g,
    (part, prose: string | undefined) => prose === undefined ? part : bracketMarkers(prose));
  out = unwrapBrackets(out);

  const cluster = `${TOKEN}(?:${SPACE}(?:[,;]${SPACE})?${TOKEN})*`;
  const closing = `(?:${SPACE}(?:<\\/(?:em|strong|span|i|b|small|mark)\\s*>|<a\\b[^>]*>${SPACE}<\\/a>))*`;
  const periodAfter = new RegExp(`\\.?${SPACE}(${cluster})(${closing})${SPACE}\\.`, "g");
  let previous: string;
  do {
    previous = out;
    out = out.replace(periodAfter, ".$1$2");
  } while (out !== previous);
  // Citations attach directly to the preceding text or sentence punctuation.
  out = out.replace(new RegExp(`${SPACE}(${TOKEN})`, "g"), "$1");

  // Restore protected markup before citation tokens (some protected superscripts
  // can contain a linked note), so no temporary tokens can reach rendered HTML.
  out = out.replace(/\u0002(\d+)\u0002/g, (_token, index: string) => protectedHtml[Number(index)]);
  return out.replace(/\u0001C(\d+)\u0001/g, (_token, index: string) => `<sup class="inline-citation">${citations[Number(index)]}</sup>`);
}

/** Safe for snippets already reduced to plain text, with no source URL to recover. */
export function formatCitationText(text: string): string {
  return formatInlineCitations(text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"));
}
