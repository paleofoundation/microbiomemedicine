// Universal content rules (Karen): NO em-dashes and NO visible ampersands, anywhere.
// Applied at render to every page body so the 575+ migrated rows are covered without
// hand-editing each one. Self-protecting against URLs / entities / attributes:
//   - em-dash (— or &mdash;) never appears in URLs or attributes; a numeric range becomes
//     "to", any other em-dash becomes ", " (a comma).
//   - an ampersand is only rewritten to "and" when it is SPACE-flanked prose ("X & Y" or
//     "X &amp; Y"). URL params (?s=96&d=mm), HTML entities (&amp; &nbsp; &mdash;), and the
//     JS && operator have no surrounding space, so they are left untouched by construction.
import { ORCID_SVG } from "@/components/OrcidIcon";

// Inline citation rule: every reference citation must render as a superscripted,
// bracketed, linked number — <sup><a class="rgbc-reference ...">[N]</a></sup>.
// Migration damaged the original markup (lost <sup> wrappers, broken bracket
// nesting, junk like "[4][x]"). This NORMALIZES that markup while PRESERVING each
// citation's authored number — it never renumbers (the numbers were assigned at
// authoring by reference-list position and are not safely recomputable from markup,
// since a source cited N times legitimately shows N different numbers). Anchors with
// no number left (unfilled "x" placeholders) are left for per-page repair; bare
// superscripted "[x]" placeholders (never given a reference) are removed.
const CITE = "";
function normalizeCitations(html: string): string {
  if (!html || html.indexOf("rgbc-reference") === -1) return html;
  const cites: { a: string; n: string }[] = [];
  let out = html.replace(/<a\b([^>]*\bid="[^"]*-back"[^>]*)>([\s\S]*?)<\/a>/g, (m, attrs, inner) => {
    if (!/rgbc-reference/.test(attrs) || !/js-rgbc-scroll-link/.test(attrs)) return m;
    const d = (inner.match(/\d+/) || [])[0];
    if (!d) return m; // no recoverable number — leave for per-page repair
    cites.push({ a: attrs, n: d });
    return CITE + (cites.length - 1) + CITE;
  });
  if (cites.length) {
    const s = CITE + "\\d+" + CITE;
    out = out
      .replace(new RegExp("\\[\\s*(" + s + ")", "g"), "$1")
      .replace(new RegExp("(" + s + ")\\s*\\]", "g"), "$1")
      .replace(new RegExp("<sup>\\s*((?:" + s + "[\\s\\[\\]]*)+)</sup>", "g"), "$1")
      .replace(new RegExp("<sup>\\s*(" + s + ")", "g"), "$1")
      .replace(new RegExp("(" + s + ")\\s*</sup>", "g"), "$1")
      .replace(new RegExp(CITE + "(\\d+)" + CITE, "g"), (_m, i) => `<sup><a${cites[+i].a}>[${cites[+i].n}]</a></sup>`);
  }
  return out.replace(/<sup>\s*\[\s*x\s*\]\s*<\/sup>/gi, "");
}

export function applyTextRules(html: string): string {
  if (!html) return html;
  return normalizeCitations(html)
    .replace(/(\d)\s*(?:—|&mdash;|—)\s*(\d)/g, "$1 to $2")
    .replace(/\s*(?:—|&mdash;|—)\s*/g, ", ")
    .replace(/([A-Za-z0-9)\]])\s(?:&amp;|&)\s([A-Za-z0-9(\[])/g, "$1 and $2")
    // Author ORCID links captured from WP render their text as "ID"; swap in the real ORCID iD logo.
    .replace(/(<a\b[^>]*\borchid-id\b[^>]*>)\s*ID\s*(<\/a>)/gi, `$1${ORCID_SVG}$2`);
}
