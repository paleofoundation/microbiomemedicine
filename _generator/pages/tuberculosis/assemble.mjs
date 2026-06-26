import fs from "node:fs";
const SC = "/private/tmp/claude-501/-Users-karenpendergrass/1ffe11f1-4bc6-43a0-ac00-158c667135b1/scratchpad/tb";

const order = [
  "h-overview", "h-causal-chain", "h-metallomic-signature", "h-nutritional-immunity",
  "h-microbiome-signature", "h-ecosystem-story", "h-vulnerabilities", "h-interventions",
  "h-stops", "h-in-progress", "h-research-gaps", "h-diagnosis", "h-faqs",
];

const allSections = [];
for (const f of ["a1", "a2", "a3", "a4", "a5", "a6", "a7"]) {
  const j = JSON.parse(fs.readFileSync(`${SC}/${f}.json`, "utf8"));
  for (const s of j.sections) allSections.push(s);
}
const byId = new Map(allSections.map((s) => [s.id, s]));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Canonical identity for a citation: collapse the same paper cited via different
// URL forms (pmc.ncbi vs www.ncbi/pmc, pubmed vs PMC) to one reference number.
const norm = (u) => {
  const s = (u || "").trim();
  let m = s.match(/PMC(\d+)/i);
  if (m) return "pmc:" + m[1];
  m = s.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i);
  if (m) return "pmid:" + m[1];
  m = s.match(/(10\.\d{4,9}\/[^\s"/?#]+)/);
  if (m) return "doi:" + m[1].toLowerCase();
  return s.replace(/\/+$/, "").toLowerCase();
};

const urlToNum = new Map();
const refsList = []; // [{citation,url}]
const missing = [];
let html = "";

for (const id of order) {
  const s = byId.get(id);
  if (!s) { console.error("!! MISSING SECTION", id); continue; }
  const keyToRef = new Map((s.refs || []).map((r) => [r.key, r]));
  const out = s.html.replace(/\{\{cite:([^}]+)\}\}/g, (_m, rawkey) => {
    const ref = keyToRef.get(rawkey.trim());
    if (!ref) { missing.push(`${id}:${rawkey}`); return ""; }
    const nu = norm(ref.url);
    let num = urlToNum.get(nu);
    if (!num) { num = refsList.length + 1; urlToNum.set(nu, num); refsList.push({ citation: ref.citation, url: ref.url }); }
    return `<sup><a class="rgbc-reference" href="#ref-${num}">[${num}]</a></sup>`;
  });
  html += out + "\n";
}

let refsHtml = `<h2 class="wp-block-heading" id="h-references"><strong>References</strong></h2>\n<ol>\n`;
refsList.forEach((r, i) => {
  const n = i + 1;
  refsHtml += `<li id="ref-${n}">${esc(r.citation)} <a href="${r.url}" target="_blank" rel="noreferrer noopener">${esc(r.url)}</a></li>\n`;
});
refsHtml += `</ol>\n`;

const dry = JSON.parse(fs.readFileSync(`${SC}/tb-dry.json`, "utf8"));
let studiesHtml = `<h2 class="wp-block-heading" id="h-studies"><strong>Studies</strong></h2>\n<p>The studies behind this signature are summarized as individual research-feed pages, built like the rest of the microbiome library:</p>\n<ul>\n`;
for (const f of dry.feeds) studiesHtml += `<li><a href="/research-feeds/${f.slug}">${esc(f.title)}</a></li>\n`;
studiesHtml += `</ul>\n`;

const full = html + refsHtml + studiesHtml;
fs.writeFileSync(`${SC}/tb-content.html`, full);

const distinctInline = new Set([...full.matchAll(/\[(\d{1,3})\]/g)].map((m) => m[1])).size;
console.log(`sections assembled: ${order.length}`);
console.log(`references: ${refsList.length} (distinct inline [n]: ${distinctInline})`);
console.log(`studies (research-feed links): ${dry.feeds.length}`);
console.log(`unresolved {{cite}} markers: ${missing.length}${missing.length ? " -> " + missing.join(", ") : ""}`);
console.log(`leftover {{cite markers in output: ${(full.match(/\{\{cite/g) || []).length}`);
console.log(`content_html length: ${full.length} chars`);
