// Generate FAQ Q&As from a page's own sections, and inject the accordion into the
// (empty) "FAQs" section of WP content. Shared by ArticleView + the verbatim WP renderer.

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function getFaqs(html: string, title: string): { q: string; a: string }[] {
  if (!/id="h-faqs"/.test(html)) return [];
  const qmap: [RegExp, string][] = [
    [/overview/i, `What is ${title}?`],
    [/associated conditions/i, `What conditions are associated with ${title}?`],
    [/causes/i, `What causes ${title}?`],
    [/symptoms/i, `What are the symptoms of ${title}?`],
    [/diagnos/i, `How is ${title} diagnosed?`],
    [/treatment|intervention/i, `What helps treat ${title}?`],
    [/prevent/i, `Can ${title} be prevented?`],
    [/risk/i, `What are the risk factors for ${title}?`],
  ];
  const faqs: { q: string; a: string }[] = [];
  const re = /<h([23])\b[^>]*>([\s\S]*?)<\/h\1>([\s\S]*?)(?=<h[23]\b|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (faqs.length >= 3) break;
    const heading = m[2].replace(/<[^>]+>/g, "").trim();
    if (!heading) continue;
    let q = "";
    for (const [rx, qq] of qmap) { if (rx.test(heading)) { q = qq; break; } }
    if (!q || faqs.some((f) => f.q === q)) continue;
    let a = "";
    const pre = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pm: RegExpExecArray | null;
    while ((pm = pre.exec(m[3]))) {
      const t = pm[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (t.length >= 40) { a = t; break; }
    }
    if (!a) continue;
    if (a.length > 700) a = a.slice(0, 700).replace(/\s+\S*$/, "") + "…";
    faqs.push({ q, a });
  }
  return faqs;
}

export function injectFaqs(html: string, faqs: { q: string; a: string }[]): string {
  if (!faqs.length || !/id="h-faqs"/.test(html)) return html;
  const acc =
    `<div class="rgbc-faq-block">` +
    faqs.map((f) => `<details class="rgbc-faq-item"><summary><span class="rgbc-faq-icon"></span><span class="rgbc-faq-q">${escapeHtml(f.q)}</span></summary><div class="rgbc-faq-a"><strong>Quick answer:</strong> ${escapeHtml(f.a)}</div></details>`).join("") +
    `</div>`;
  return html.replace(/(<h2\b[^>]*id="h-faqs"[^>]*>)[\s\S]*?(<\/h2>)((?:\s*<p[^>]*>\s*<\/p>)*)/i, `$1Frequently Asked Questions$2${acc}`);
}
