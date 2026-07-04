// Build the "Faecalibacterium prausnitzii" TAXON page (NCBI taxid 853). This is a BENEFICIAL
// commensal (major butyrate producer, anti-inflammatory, depleted in disease), so the template
// is reframed: "Health Role" instead of Pathogenicity, "Beneficial Factors" instead of Virulence
// Factors, and Interventions are how to SUPPORT it. Uses real Unicode chars (no HTML entities).
//
// Sidebar: Overview (Morphology, Metabolism & Butyrate, Anti-inflammatory Role, Beneficial
// Factors, Vulnerabilities) · Interventions · Conditions · FAQs · Research Feed · Update History
// · References.  Modes: (stats) | --json <file> | --publish
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseCsvObjects } from "../../lib/csv.mjs";
import { experimentWeight } from "../../lib/grade.mjs";
import { abstractToSections, sectionsToHtml, slugify, buildResearchFeeds } from "../../lib/feeds.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLES = join(HERE, "../../samples/faecalibacterium-prausnitzii");
const TAXON = { taxid: "853", species: "Faecalibacterium prausnitzii", genus: "Faecalibacterium", slug: "faecalibacterium-prausnitzii", title: "Faecalibacterium prausnitzii", clade: "s__Faecalibacterium prausnitzii" };

const R = {
  sokol: { name: "Faecalibacterium prausnitzii is an anti-inflammatory commensal bacterium identified by gut microbiota analysis of Crohn disease patients.", authors: "Sokol H, Pigneur B, Watterlot L, et al.", date: "Proc Natl Acad Sci U S A. 2008", url: "https://doi.org/10.1073/pnas.0804812105" },
  hiippala: { name: "The potential of gut commensals in reinforcing intestinal barrier function and alleviating inflammation.", authors: "Hiippala K, Jouhten H, Ronkainen A, et al.", date: "Nutrients. 2018", url: "https://doi.org/10.3390/nu10080988" },
};

const order = [];
const numByKey = new Map();
function esc(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function cite(...keys) {
  let out = "";
  for (const k of keys) {
    if (!R[k]) throw new Error("unknown ref: " + k);
    if (!numByKey.has(k)) { order.push(k); numByKey.set(k, order.length); }
    const n = numByKey.get(k), r = R[k];
    out += `<sup><a class="rgbc-reference rgbc-tooltip js-rgbc-scroll-link" href="#ref-${k}" id="ref-${k}-back" data-title="${esc(r.authors)}" data-link="${r.url}" data-link-name="${esc(r.name)}" data-date="${esc(r.date)}" target="_blank" data-options="position:left" title=".wiki-ref-${k}">[${n}]</a></sup>`;
  }
  return out;
}
const P = (s) => `<p class="wp-block-paragraph">${s}</p>`;
const dlink = (href, text) => `<a href="${href}" target="_blank">${text}</a>`;
const mred = (t) => `<span class="has-inline-color has-vivid-red-color">${t}</span>`;

let AUTHORED = {};
try { AUTHORED = JSON.parse(readFileSync(join(HERE, "authored.json"), "utf8")); } catch { AUTHORED = {}; }

const sigCsv = readFileSync(join(SAMPLES, "signatures.csv"), "utf8");
const expCsv = readFileSync(join(SAMPLES, "experiments.csv"), "utf8");
const stuCsv = readFileSync(join(SAMPLES, "studies.csv"), "utf8");
const sigs = parseCsvObjects(sigCsv);
const exps = parseCsvObjects(expCsv);
const studies = parseCsvObjects(stuCsv);
const studyByName = new Map(studies.map((s) => [(s["Study page name"] || "").trim(), s]));
const expByComposite = new Map();
const expByStudy = new Map();
for (const e of exps) { const st = (e["Study"] || "").trim(); expByComposite.set(st + "||" + (e["Experiment page name"] || "").trim(), e); if (!expByStudy.has(st)) expByStudy.set(st, e); }
const hasTaxon = (row) => {
  const ids = (row["NCBI Taxonomy IDs"] || "").split(";").some((lin) => lin.split("|").map((x) => x.trim()).includes(TAXON.taxid));
  const nm = (row["MetaPhlAn taxon names"] || "").includes(TAXON.clade);
  return ids || nm;
};
const gradeLetter = (w) => (w >= 0.55 ? "A" : w >= 0.38 ? "B" : w >= 0.22 ? "C" : "D");
const obs = [];
for (const row of sigs) {
  if (!hasTaxon(row)) continue;
  const st = (row["Study"] || "").trim();
  const e = expByComposite.get(st + "||" + (row["Experiment"] || "").trim()) || expByStudy.get(st) || {};
  const study = studyByName.get(st) || {};
  const dir = String(row["Abundance in Group 1"] || "").toLowerCase();
  if (dir !== "increased" && dir !== "decreased") continue;
  obs.push({ condition: (e["Condition"] || "Unspecified").trim(), direction: dir, w: experimentWeight(e, study).w, pmid: st, site: (e["Body site"] || "").trim(), host: (e["Host species"] || "").trim(), seq: (e["Sequencing type"] || "").trim(), region: (e["16S variable region"] || "").trim(), design: (study["Study design"] || "").trim(), n0: e["Group 0 sample size"], n1: e["Group 1 sample size"], title: (study["Title"] || "").trim(), journal: (study["Journal"] || "").trim(), year: (study["Year"] || "").trim(), paper: (study["URL"] || "").trim() || (study["DOI"] ? "https://doi.org/" + study["DOI"].trim() : "") });
}
const taxonStudyIds = new Set(obs.map((o) => o.pmid));
const byCond = new Map();
for (const o of obs) { let g = byCond.get(o.condition); if (!g) { g = { condition: o.condition, items: [], dirs: new Set() }; byCond.set(o.condition, g); } g.items.push(o); g.dirs.add(o.direction); }
const perStudyCaveats = (o) => { const c = []; if (/16S|PCR/i.test(o.seq)) c.push("marker-gene method; this strict anaerobe can be under-detected in stool"); if (o.host && o.host !== "Homo sapiens") c.push(`non-human host (${o.host})`); if (Math.min(+o.n0 || 999, +o.n1 || 999) < 20) c.push("small cohort"); return c; };
const conds = [...byCond.values()].map((g) => {
  const best = g.items.reduce((a, b) => (b.w > a.w ? b : a), g.items[0]);
  const direction = g.dirs.size > 1 ? "mixed" : ([...g.dirs][0] === "increased" ? "enriched" : "depleted");
  const byPmid = new Map();
  for (const o of g.items) { const p = byPmid.get(o.pmid); if (!p || o.w > p.w) byPmid.set(o.pmid, o); }
  const studies = [...byPmid.values()].sort((a, b) => b.w - a.w).map((o) => ({ title: o.title, journal: o.journal, year: o.year, design: o.design, participants: (+o.n0 || 0) + (+o.n1 || 0), site: o.site, method: o.seq + (o.region ? " V" + o.region : ""), direction: o.direction === "increased" ? "enriched" : "depleted", grade: gradeLetter(o.w), paper: o.paper, url: "/research-feeds/" + slugify(o.title), caveats: perStudyCaveats(o) }));
  const nStudies = studies.length; const signal = best.w * 0.6 + Math.min(nStudies, 3) / 3 * 0.4;
  return { condition: g.condition, direction, grade: gradeLetter(best.w), score: +best.w.toFixed(3), magnitude: signal >= 0.62 ? 3 : signal >= 0.45 ? 2 : 1, nStudies, participants: studies.reduce((s, x) => s + x.participants, 0), studies };
});
const DIR_RANK = { enriched: 0, depleted: 1, mixed: 2 };
conds.sort((a, b) => DIR_RANK[a.direction] - DIR_RANK[b.direction] || a.grade.localeCompare(b.grade) || b.score - a.score);
const nEnriched = conds.filter((c) => c.direction === "enriched").length;
const nDepleted = conds.filter((c) => c.direction === "depleted").length;
const nMixed = conds.filter((c) => c.direction === "mixed").length;
const allByPmid = new Map();
for (const o of obs) { const p = allByPmid.get(o.pmid); if (!p || o.w > p.w) allByPmid.set(o.pmid, o); }
const totalParticipants = [...allByPmid.values()].reduce((s, o) => s + ((+o.n0 || 0) + (+o.n1 || 0)), 0);
const upObs = obs.filter((o) => o.direction === "increased").length;
const downObs = obs.filter((o) => o.direction === "decreased").length;
const agreement = +(Math.max(upObs, downObs) / Math.max(1, upObs + downObs)).toFixed(2);
const tier = agreement >= 0.85 ? "High" : agreement >= 0.72 ? "Moderate" : "Low";
// direction descriptor tuned for a protective microbe (depletion-leaning)
const depletedLeaning = downObs > upObs;
const conditionsData = { taxon: TAXON.title, summary: { nConditions: conds.length, nStudies: allByPmid.size, participants: totalParticipants, tier, agreement, enriched: nEnriched, depleted: nDepleted, mixed: nMixed }, rows: conds };

let H = "";
H += `<h2 class="wp-block-heading" id="h-overview">Overview</h2>`;
H += P(`<em>Faecalibacterium prausnitzii</em> is one of the most abundant and important beneficial bacteria in the healthy human gut. A member of the phylum Firmicutes, it is a major producer of butyrate, the short-chain fatty acid that fuels colon cells and calms inflammation, and it is recognized as an anti-inflammatory commensal.${cite("sokol", "hiippala")} On this database it appears as a differentially abundant taxon across many human microbiome studies, and unlike a pathogen its story is usually one of loss: it is depleted in a wide range of diseases.`);
H += P(`What makes <em>F. prausnitzii</em> distinctive is that its decline is itself a signal of disease. A reduced abundance was one of the first reproducible microbiome findings in Crohn's disease, where lower <em>F. prausnitzii</em> predicted postoperative relapse, and both the bacterium and its secreted molecules dampen inflammation in cell and animal models.${cite("sokol")} This makes it less a target to attack than a keystone to protect, and the lever that supports it is what it eats: dietary fiber.${cite("hiippala")}`);

H += `<h3 class="wp-block-heading" id="h-morphology"><strong>Morphology</strong></h3>`;
H += P(`<em>F. prausnitzii</em> is a non-spore-forming, non-motile rod in the phylum Firmicutes (class Clostridia) and one of the most abundant bacteria in the healthy colon.${cite("hiippala")} It is an extremely oxygen-sensitive strict anaerobe, which makes it difficult to culture and vulnerable to conditions that raise oxygen at the gut wall, such as inflammation.${cite("sokol", "hiippala")}`);

H += `<h3 class="wp-block-heading" id="h-metabolism"><strong>Metabolism &amp; Butyrate</strong></h3>`;
H += P(`<em>F. prausnitzii</em> is a specialist fiber fermenter and one of the gut's main butyrate producers. Butyrate is the preferred energy source for colonocytes and reinforces the epithelial barrier, and its production is a central reason this organism is considered health-promoting.${cite("hiippala")} Because it depends on dietary fiber reaching the colon, its abundance tracks a fiber-rich diet.${cite("hiippala")}`);

H += `<h3 class="wp-block-heading" id="h-anti-inflammatory-role"><strong>Anti-inflammatory Role</strong></h3>`;
H += P(`<em>F. prausnitzii</em> is the archetypal anti-inflammatory commensal. Its abundance is reduced in Crohn's disease, and a lower proportion on resected ileal mucosa predicted endoscopic recurrence within six months.${cite("sokol")} Both live bacteria and their cell-free supernatant reduce inflammation: they block NF-kB activation and IL-8 production, lower IL-12 and interferon-gamma, raise anti-inflammatory IL-10, and reduce the severity of chemically induced colitis in mice.${cite("sokol")} These properties make it a leading candidate next-generation probiotic.${cite("sokol", "hiippala")}`);

H += `<h3 class="wp-block-heading" id="h-beneficial-factors"><strong>Beneficial Factors</strong></h3>`;
H += P(`Where a pathogen page lists virulence factors, <em>F. prausnitzii</em>'s notable molecules are the ones that help the host.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Beneficial factor</th><th>Description and role</th></tr></thead><tbody>`
  + `<tr><td>${mred("Butyrate")}</td><td>Its main short-chain fatty acid product fuels colonocytes, strengthens the gut barrier, and has anti-inflammatory effects.${cite("hiippala")}</td></tr>`
  + `<tr><td>${mred("Secreted anti-inflammatory metabolites")}</td><td>The cell-free supernatant alone blocks NF-kB activation and IL-8 production, indicating secreted molecules with anti-inflammatory activity independent of the live cell.${cite("sokol")}</td></tr>`
  + `<tr><td>${mred("Immune modulation toward IL-10")}</td><td>It shifts the cytokine balance toward anti-inflammatory IL-10 and away from IL-12 and interferon-gamma, and reduces experimental colitis.${cite("sokol")}</td></tr>`
  + `</tbody></table></figure>`;

H += `<h3 class="wp-block-heading" id="h-vulnerabilities"><strong>Vulnerabilities</strong></h3>`;
H += P(`For a protective microbe, the relevant "vulnerabilities" are what threaten it, because losing it is a step toward dysbiosis.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Threat</th><th>Why it matters</th></tr></thead><tbody>`
  + `<tr><td>${mred("Oxygen and inflammation")}</td><td>As a strict anaerobe, <em>F. prausnitzii</em> is harmed by the raised oxygen at an inflamed gut wall, so inflammation and its decline can reinforce each other in a vicious cycle.${cite("sokol", "hiippala")}</td></tr>`
  + `<tr><td>${mred("Low-fiber diet")}</td><td>Because it feeds on fiber-derived substrates, a fiber-poor Western diet starves it and lowers butyrate.${cite("hiippala")}</td></tr>`
  + `<tr><td>${mred("Antibiotics and dysbiosis")}</td><td>Broad disruption of the microbiota reduces <em>F. prausnitzii</em> along with other beneficial anaerobes, a hallmark of dysbiosis.${cite("hiippala")}</td></tr>`
  + `</tbody></table></figure>`;

H += `<h2 class="wp-block-heading" id="h-interventions">Interventions</h2>`;
H += P(`For a beneficial keystone, an intervention is anything that supports or restores it. Everything below is research-stage and is <strong>not</strong> medical advice; each is classified by ${dlink("/our-validation-method/", "our validation method")}. The through-line is simple: feed it fiber and protect it from inflammation.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Intervention</th><th>Class</th><th>Status</th></tr></thead><tbody>`
  + `<tr><td>Dietary fiber / prebiotics</td><td>Diet</td><td>Validation In Progress</td></tr>`
  + `<tr><td><em>F. prausnitzii</em> as a next-generation probiotic</td><td>Concept</td><td>Validation In Progress</td></tr>`
  + `<tr><td>Reduce gut inflammation and oxygen</td><td>Concept</td><td>Validation In Progress</td></tr>`
  + `</tbody></table></figure>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">How do these support F. prausnitzii?</span></summary><figure class="wp-block-table"><table class="has-fixed-layout"><tbody>`
  + `<tr><td><strong>Intervention</strong></td><td><strong>Mechanism</strong></td></tr>`
  + `<tr><td>Dietary fiber / prebiotics</td><td>Provides the fermentable substrate this specialist fiber-degrader needs, raising its abundance and butyrate output.${cite("hiippala")}</td></tr>`
  + `<tr><td><em>F. prausnitzii</em> or its supernatant</td><td>Live cells and secreted molecules both blunt inflammation and reduce colitis in models, the basis for its use as a next-generation probiotic.${cite("sokol")}</td></tr>`
  + `<tr><td>Reduce inflammation and oxygen</td><td>Lowering mucosal inflammation restores the anaerobic niche this oxygen-sensitive organism needs.${cite("sokol")}</td></tr>`
  + `</tbody></table></figure></details>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">What should be avoided (STOP)?</span></summary>`
  + P(`A chronically fiber-poor diet and unnecessary broad-spectrum antibiotics, both of which deplete <em>F. prausnitzii</em> and the butyrate it provides.${cite("hiippala")}`)
  + `</details>`;

H += `<h2 class="wp-block-heading" id="h-conditions">Conditions</h2>`;
H += P(`Where <em>F. prausnitzii</em> (NCBI:txid${TAXON.taxid}) appears as a differentially abundant taxon across the Microbiome Medicine corpus. Each row aggregates every experiment in which the organism moved in a given condition; <em>direction</em> is its change in the case/exposure group, and <em>grade</em> is the strongest single study's methodology weight (A·D·S·C·R), the same engine that grades every signature on this site.`);
H += P(`Across <strong>${conds.length}</strong> conditions and <strong>${allByPmid.size}</strong> studies, it is enriched in ${nEnriched}, depleted in ${nDepleted}, and direction-conflicting in ${nMixed}. Consistent with its role as a protective, anti-inflammatory commensal, the signal ${depletedLeaning ? "leans toward depletion: it is lost more often than it is gained across disease states" : "is mixed across disease states"}. Because loss of a beneficial microbe is itself a marker of dysbiosis rather than a specific disease mechanism, the aggregate evidence tier is <strong>${tier}</strong>.`);
H += `<div class="mbio-note"><p><span class="mbio-note__lead">How to read these.</span> <em>F. prausnitzii</em> is a genuine, abundant, health-associated resident, so a <em>depletion</em> here usually marks a less healthy or inflamed gut rather than a cause of the condition. As a strict anaerobe it can be under-detected in stool by some methods. Read a decline as a signal of dysbiosis and a candidate to restore, not a target to remove. This is why the aggregate tier stays ${tier}.</p></div>`;
H += `<!--CONDITIONS_TABLE-->`;

H += `<h2 class="wp-block-heading" id="h-faqs">FAQs</h2>`;
const FAQ = [
  ["Is Faecalibacterium prausnitzii good or bad?", `Good. <em>F. prausnitzii</em> is one of the most important beneficial bacteria in the gut: a major butyrate producer with anti-inflammatory effects.${cite("sokol", "hiippala")} It is usually depleted, not enriched, in disease, so a low level is a sign of an unhealthy gut.`],
  ["What does Faecalibacterium prausnitzii do?", `It ferments dietary fiber into butyrate, which feeds colon cells and strengthens the gut barrier, and it releases molecules that calm inflammation by blocking NF-kB and raising IL-10.${cite("hiippala", "sokol")}`],
  ["What causes low Faecalibacterium prausnitzii?", `A fiber-poor diet, gut inflammation (which raises oxygen this strict anaerobe cannot tolerate), and antibiotics all deplete it.${cite("hiippala", "sokol")} Reduced <em>F. prausnitzii</em> is a well-known feature of Crohn's disease.${cite("sokol")}`],
  ["How do you increase Faecalibacterium prausnitzii?", `Mainly by feeding it: a fiber-rich diet provides the fermentable substrate it needs to grow and make butyrate.${cite("hiippala")} It is also being developed as a next-generation probiotic. These are research-stage findings, not medical advice.`],
];
H += `<div class="rgbc-faq-block">`;
for (const [q, a] of FAQ) H += `<details class="rgbc-faq-item"><summary><span class="rgbc-faq-icon"></span><span class="rgbc-faq-q">${esc(q)}</span></summary><div class="rgbc-faq-a"><strong>Quick answer:</strong> ${a}</div></details>`;
H += `</div>`;

const SVG_PLUS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="12" height="12" style="margin:auto"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path></svg>`;
const SVG_MINUS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="12" height="12" style="margin:auto"><path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>`;
const SVG_DOC = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
const SVG_LINK = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
const SVG_MAIL = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
const firstSentence = (s) => { const t = (s || "").replace(/\s+/g, " ").trim(); const m = t.match(/^.*?[.!?](\s|$)/); return (m ? m[0] : t).trim().slice(0, 280); };
const rfSplit = (v) => (v || "").split(",").map((x) => x.trim()).filter(Boolean);
const rfUniq = (a) => [...new Set(a)];
const rfGraphs = (f) => { const fields = [["Location", f.location], ["Sample Site", f.sample_site], ["Species", f.species]]; const present = fields.filter(([, v]) => v && v.length); if (!present.length) return ""; return `<div class="research-feed__graphs">` + present.map(([t, items]) => `<div class="research-feed__graph"><div class="research-feed__graph-title">${t}</div><div class="research-feed__graph-items">` + items.map((i) => `<div class="research-feed__graph-item">${esc(i)}</div>`).join("") + `</div></div>`).join("") + `</div>`; };
const to4 = (html) => html.replace(/<h3\b[^>]*>/g, `<h4 class="wp-block-heading">`).replace(/<\/h3>/g, "</h4>");
const cardSummary = (pmid, abstract) => { if (AUTHORED[pmid]) return to4(sectionsToHtml(AUTHORED[pmid].sections)); const sec = abstractToSections(abstract); return sec ? to4(sectionsToHtml(sec)) : ""; };
const rfStudies = studies.filter((s) => (s["Title"] || "").trim() && taxonStudyIds.has((s["Study page name"] || "").trim())).sort((a, b) => (+b["Year"] || 0) - (+a["Year"] || 0));
H += `<h2 class="wp-block-heading" id="h-research-feed">Research Feed</h2>`;
H += P(`Internal summaries of the ${rfStudies.length} studies we reviewed in which <em>F. prausnitzii</em> was a differential taxon across this corpus.`);
H += `<div class="research-feed accordion" data-accordion-disable-auto-close="true">`;
for (const s of rfStudies) {
  const title = (s["Title"] || "").trim(); const year = (s["Year"] || "").trim();
  const paper = (s["URL"] || "").trim() || (s["DOI"] ? "https://doi.org/" + s["DOI"].trim() : "#");
  const pmid = (s["PMID"] || s["Study page name"] || "").trim();
  const url = `/research-feeds/${slugify(title)}`;
  const KEY = /\b(found|showed|reveal|demonstrat|associat|enriched|deplet|increas|decreas|higher|lower|identif|correlat)\b/i;
  const finding = (s["Abstract"] || "").replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).find((x) => KEY.test(x) && x.split(" ").length >= 6);
  const excerpt = AUTHORED[pmid]?.excerpt || (finding || firstSentence(s["Abstract"]) || title).slice(0, 300);
  const stExps = exps.filter((e) => (e["Study"] || "").trim() === (s["Study page name"] || "").trim());
  const feed = { location: rfUniq(stExps.flatMap((e) => rfSplit(e["Location of subjects"]))), sample_site: rfUniq(stExps.flatMap((e) => rfSplit(e["Body site"]))), species: rfUniq(stExps.flatMap((e) => rfSplit(e["Host species"]))) };
  const mailto = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(paper)}`;
  H += `<div class="research-feed__item accordion__item">`
    + `<div class="research-feed__header-wrap accordion__header"><div class="research-feed__toggle-icon-wrap"><span class="research-feed__toggle-icon research-feed__toggle-icon--plus">${SVG_PLUS}</span><span class="research-feed__toggle-icon research-feed__toggle-icon--minus">${SVG_MINUS}</span></div><div class="research-feed__title">${esc(title)}</div></div>`
    + `<div class="research-feed__sub-header"><div class="research-feed__sub-header-item research-feed__sub-header-item--date">${esc(year)}</div></div>`
    + `<div class="research-feed__excerpt">${esc(excerpt)}</div>`
    + `<div class="research-feed__content accordion__content">${rfGraphs(feed)}${cardSummary(pmid, s["Abstract"])}</div>`
    + `<div class="research-feed__footer"><div><a class="btn" href="${url}">${SVG_DOC}Open</a><a class="btn" href="${paper}" target="_blank" rel="noreferrer">${SVG_LINK}Link</a><a class="btn" href="${mailto}">${SVG_MAIL}Email</a></div></div>`
    + `</div>`;
}
H += `</div>`;

H += `<h2 class="wp-block-heading" id="h-update-history">Update History</h2>`;
H += `<div class="mbio-update-history"><div class="mbio-update-history__content"><article class="mbio-card"><div class="mbio-card__border"></div><p class="mbio-card__date">2026-07-04</p><span class="mbio-card__title">Faecalibacterium prausnitzii <span class="mbio-card__type btn btn--rounded">major</span></span><div class="mbio-card__content"><p class="wp-block-paragraph">Taxon page created: biology (morphology, butyrate metabolism, anti-inflammatory role), the beneficial factors and what threatens them, supportive interventions, the data-derived Conditions table across ${conds.length} conditions, and the full research feed.</p></div></article></div></div>`;

H += `<h2 class="wp-block-heading" id="h-references">References</h2><ol class="rgbc-references">`;
for (const k of order) { const r = R[k]; H += `<li class="rgbc-references__item" id="ref-${k}"><a class="rgbc-references__link" href="${r.url}" target="_blank">${esc(r.name)}</a> ${esc(r.authors)} <span>(${esc(r.date)})</span></li>`; }
H += `</ol>`;
for (const k of order) { const r = R[k]; H += `<div class="tooltip rgbc-reference-tooltip wiki-ref-${k}"><div class="tooltip__content rgbc-reference-tooltip__content"><p>${esc(r.authors)}</p><a href="${r.url}" target="_blank">${esc(r.name)}</a><p>${esc(r.date)}</p></div></div>`; }

const meta = {
  did_you_know: "Faecalibacterium prausnitzii is one of your gut's best friends: it makes butyrate that feeds your colon and calms inflammation. When it disappears, that is usually a sign of disease, not a cause you would want to remove.",
  authors: [{ name: "Karen Pendergrass", orcid: "https://orcid.org/0000-0002-2348-7259", avatar: "https://secure.gravatar.com/avatar/104bc2e8ba283fda6309c14b2eca02fe9612e8793ed62621c691e83230d4a963?s=96&d=mm&r=g" }],
  conditions: conditionsData,
};
const excerpt_html = "<p>Faecalibacterium prausnitzii is one of the most abundant beneficial bacteria in the healthy gut and a major butyrate producer. It is anti-inflammatory and depleted in conditions such as Crohn's disease, so on this database its signal is usually one of protective loss, and the lever to support it is dietary fiber.</p>";

console.log(`content_html: ${H.length} chars · refs: ${order.length} · conditions: ${conds.length} (↑${nEnriched} ↓${nDepleted} ↕${nMixed}) · agreement ${agreement} tier ${tier} · RF studies: ${rfStudies.length}`);

const jsonIdx = process.argv.indexOf("--json");
if (jsonIdx >= 0 && process.argv[jsonIdx + 1]) { writeFileSync(process.argv[jsonIdx + 1], JSON.stringify({ slug: TAXON.slug, title: TAXON.title, type: "microbe", excerpt_html, content_html: H, meta, modified_at: "2026-07-04T00:00:00.000Z" }, null, 2)); console.log("wrote JSON"); }

if (process.argv.includes("--publish")) {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const now = new Date().toISOString();
  const rfExisting = [];
  for (let from = 0; from < 20000; from += 1000) { const { data } = await db.from("content_items").select("id,slug,title").eq("type", "research-feed").eq("status", "publish").range(from, from + 999); if (!data || !data.length) break; rfExisting.push(...data); if (data.length < 1000) break; }
  const existingSlugs = new Set(rfExisting.map((r) => r.slug));
  const existingByTitle = new Map(rfExisting.map((r) => [String(r.title).trim(), r.slug]));
  const { rows: rfRows } = buildResearchFeeds({ studiesCsv: stuCsv, experimentsCsv: expCsv, conditionLabel: "", conditionSlug: "", author: meta.authors[0], existingSlugs, existingByTitle });
  const titleToPmid = new Map(studies.map((st) => [(st["Title"] || "").trim(), (st["PMID"] || st["Study page name"] || "").trim()]));
  for (const r of rfRows) { const p = titleToPmid.get(r.title); if (AUTHORED[p]) { r.content_html = sectionsToHtml(AUTHORED[p].sections); r.excerpt_html = AUTHORED[p].excerpt; } }
  if (rfRows.length) {
    const { data: maxRf } = await db.from("content_items").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
    let nid = Number(maxRf?.id) || 990800;
    for (const r of rfRows) { nid++; const { error } = await db.from("content_items").insert({ id: nid, type: "research-feed", slug: r.slug, title: r.title, content_html: r.content_html, excerpt_html: r.excerpt_html, meta: r.meta, status: "publish", published_at: r.published_at || now, modified_at: now }); if (error) console.log(`RF insert ERROR (${r.slug}): ${error.message}`); }
    console.log(`research-feed: created ${rfRows.length} new page(s), reused ${studies.length - rfRows.length}`);
  } else { console.log(`research-feed: all ${studies.length} studies already have pages (reused)`); }
  let rfUpdated = 0;
  for (const s of studies) { const title = (s["Title"] || "").trim(); if (!title) continue; const pmid = (s["PMID"] || s["Study page name"] || "").trim(); if (!AUTHORED[pmid]) continue; const { data: upd, error } = await db.from("content_items").update({ content_html: sectionsToHtml(AUTHORED[pmid].sections), excerpt_html: AUTHORED[pmid].excerpt, modified_at: now }).eq("type", "research-feed").eq("slug", slugify(title)).select("id"); if (error) console.log(`RF update ERROR: ${error.message}`); else if (upd?.length) rfUpdated += upd.length; }
  console.log(`research-feed: refreshed ${rfUpdated} page(s) with authored summaries`);
  const { data: existing } = await db.from("content_items").select("id").eq("type", "microbe").eq("slug", TAXON.slug).maybeSingle();
  if (existing) { const { error } = await db.from("content_items").update({ title: TAXON.title, content_html: H, excerpt_html, meta, modified_at: now }).eq("id", existing.id); console.log(error ? "update ERROR: " + error.message : `updated -> microbe#${existing.id} (${TAXON.slug})`); }
  else { const { data: maxRow } = await db.from("content_items").select("id").order("id", { ascending: false }).limit(1).maybeSingle(); const id = (Number(maxRow?.id) || 990800) + 1; const { error } = await db.from("content_items").insert({ id, type: "microbe", slug: TAXON.slug, title: TAXON.title, content_html: H, excerpt_html, meta, status: "publish", published_at: now, modified_at: now }); console.log(error ? "insert ERROR: " + error.message : `inserted -> microbe#${id} (${TAXON.slug})`); }
}
