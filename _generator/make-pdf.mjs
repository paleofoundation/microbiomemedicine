// Generate a journal-format PDF for a condition page (reusing the "Journal of Microbiome
// Medicine" aesthetic), rendered as a TEXT pdf via headless Chrome (Scholar-readable).
// Usage: node _generator/make-pdf.mjs <slug>
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "fs";
import { execFileSync } from "child_process";

const slug = process.argv[2];
if (!slug) { console.error("usage: make-pdf.mjs <slug>"); process.exit(1); }
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: ci } = await db.from("content_items").select("id,title,seo_description,excerpt_html,published_at,meta").eq("slug", slug).eq("type", "condition").maybeSingle();
if (!ci) { console.error("condition not found:", slug); process.exit(1); }
const { data: wr } = await db.from("wp_render").select("html").eq("id", ci.id).maybeSingle();
const html = wr ? wr.html : "";

// Slice a section from its opening <h2 id="START"> up to the next <h2 id="END"> (or end of doc).
function section(startId, endId) {
  const s = html.search(new RegExp(`<h2[^>]*id="${startId}"`));
  if (s < 0) return "";
  const rest = html.slice(s);
  const e = endId ? rest.search(new RegExp(`<h2[^>]*id="${endId}"`)) : -1;
  return e > 0 ? rest.slice(0, e) : rest;
}
function clean(s) {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<button[\s\S]*?<\/button>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<[^>]*data-modal-id="[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/gi, "") // interactive chart triggers
    // inline citation tooltip anchors -> keep just the [n] text
    .replace(/<a [^>]*class="rgbc-reference[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, "$1")
    // references list links: keep as plain text (no live links needed in print)
    .replace(/ (data-[a-z-]+|title|target|rel|onclick)="[^"]*"/gi, "")
    .replace(/<img[^>]*>/gi, "");
}

const overview = clean(section("h-overview", "rgbc-database"));
const interventions = clean(section("h-interventions", "h-faqs"));
let references = clean(section("h-references", null));
// trim references to the end of the rgbc-references list
const olEnd = references.indexOf("</ol>");
if (olEnd > 0) references = references.slice(0, olEnd + 5);

const authors = (ci.meta?.authors || []).map((a) => a.name);
const abstract = (ci.seo_description || ci.excerpt_html || "").replace(/<[^>]+>/g, " ").trim();
const pubDate = (ci.published_at || "").slice(0, 10);

const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${ci.title}</title>
<style>
@page { size: Letter; margin: 22mm 18mm 20mm; }
* { box-sizing: border-box; }
body { font-family: Georgia, "Times New Roman", serif; font-size: 10.5pt; line-height: 1.5; color: #1a1a1a; }
.jm-running { text-align:center; font-size: 8pt; letter-spacing: .12em; text-transform: uppercase; color:#cc3333; border-bottom:1.5px solid #cc3333; padding-bottom:6px; margin-bottom:18px; }
h1.jm-title { font-size: 20pt; line-height:1.15; margin: 0 0 8px; color:#111; }
.jm-authors { font-size: 11pt; margin: 0 0 2px; }
.jm-affil { font-size: 9.5pt; font-style: italic; color:#444; margin:0 0 14px; }
.jm-abstract { background:#f6f8fa; border-left:3px solid #cc3333; padding: 10px 14px; font-size:10pt; margin: 0 0 8px; }
.jm-abstract b { color:#cc3333; }
.jm-meta { font-size: 8.5pt; color:#666; margin: 0 0 20px; border-bottom:1px dotted #ccc; padding-bottom:10px; }
h2 { font-size: 14pt; color:#cc3333; margin: 20px 0 6px; padding-bottom:3px; border-bottom:1px solid #eee; }
h3 { font-size: 12pt; color:#222; margin: 14px 0 4px; }
h4 { font-size: 10.5pt; color:#333; margin: 10px 0 3px; }
p { margin: 0 0 8px; text-align: justify; }
table { width:100%; border-collapse: collapse; font-size: 9pt; margin: 8px 0 12px; page-break-inside: avoid; }
th, td { border:1px solid #d0d4da; padding: 5px 7px; text-align: left; vertical-align: top; }
th { background:#f6f8fa; }
sup { font-size: 7pt; color:#cc3333; }
details { margin: 6px 0; } summary { font-weight: 600; cursor: default; }
ol.rgbc-references { font-size: 8.5pt; line-height:1.45; padding-left: 1.2em; }
ol.rgbc-references li { margin-bottom: 5px; }
a { color:#1a1a1a; text-decoration: none; }
.jm-foot { margin-top: 18px; border-top:1px solid #ccc; padding-top:8px; font-size:8pt; color:#666; }
</style></head>
<body>
<div class="jm-running">Microbiome Signatures &middot; microbiomemedicine.com</div>
<h1 class="jm-title">${ci.title}</h1>
<div class="jm-authors">${authors.join(", ")}</div>
<div class="jm-affil">Microbiome Signatures, Microbiome Medicine</div>
<div class="jm-abstract"><b>Abstract.</b> ${abstract}</div>
<div class="jm-meta">Published ${pubDate} &middot; https://microbiomemedicine.com/conditions/${slug} &middot; A Microbiome Signatures condition monograph</div>
${overview}
${interventions}
${references}
<div class="jm-foot">Generated from microbiomemedicine.com/conditions/${slug}. &copy; Microbiome Signatures.</div>
</body></html>`;

mkdirSync("public/pdf", { recursive: true });
const htmlPath = `/tmp/pdf-${slug}.html`;
writeFileSync(htmlPath, doc);
const out = `public/pdf/${slug}.pdf`;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
execFileSync(CHROME, ["--headless", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${out}`, "--virtual-time-budget=4000", "file://" + htmlPath], { stdio: "inherit" });
console.log("wrote", out, "| overview", overview.length, "| interventions", interventions.length, "| references", references.length, "chars");
