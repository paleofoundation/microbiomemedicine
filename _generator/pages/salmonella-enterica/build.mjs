// Build the "Salmonella" TAXON page (GENUS, NCBI taxid 590). Foodborne Gram-negative pathogen
// genus; most human disease is Salmonella enterica. Pathogen template with a strong
// nutritional-immunity (zinc / calprotectin) angle. Research feed is filtered to the studies
// where THIS taxon (genus 590) was differential, since the CSV set is shared with the species page.
//
// Sidebar: Overview (Morphology, Pathogenicity, Virulence Factors, Antibiotic Resistance,
// Metallomics, Vulnerabilities) · Interventions · Conditions · FAQs · Research Feed ·
// Update History · References.  Modes: (stats) | --json <file> | --publish
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseCsvObjects } from "../../lib/csv.mjs";
import { experimentWeight } from "../../lib/grade.mjs";
import { abstractToSections, sectionsToHtml, slugify, buildResearchFeeds } from "../../lib/feeds.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLES = join(HERE, "../../samples/salmonella");

const TAXON = { taxid: "28901", species: "Salmonella enterica", genus: "Salmonella", slug: "salmonella-enterica", title: "Salmonella enterica", clade: "s__Salmonella enterica" };

const R = {
  johnson: { name: "Typhoidal Salmonella: distinctive virulence factors and pathogenesis.", authors: "Johnson R, Mylona E, Frankel G.", date: "Cell Microbiol. 2018", url: "https://doi.org/10.1111/cmi.12939" },
  gbd: { name: "The global burden of non-typhoidal salmonella invasive disease: a systematic analysis for the Global Burden of Disease Study 2017.", authors: "GBD 2017 Non-Typhoidal Salmonella Invasive Disease Collaborators.", date: "Lancet Infect Dis. 2019", url: "https://doi.org/10.1016/S1473-3099(19)30418-9" },
  liu: { name: "Zinc sequestration by the neutrophil protein calprotectin enhances Salmonella growth in the inflamed gut.", authors: "Liu JZ, Jellbauer S, Poe AJ, et al. (Raffatellu M).", date: "Cell Host Microbe. 2012", url: "https://doi.org/10.1016/j.chom.2012.01.017" },
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
for (const e of exps) {
  const st = (e["Study"] || "").trim();
  expByComposite.set(st + "||" + (e["Experiment page name"] || "").trim(), e);
  if (!expByStudy.has(st)) expByStudy.set(st, e);
}
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
  obs.push({
    condition: (e["Condition"] || "Unspecified").trim(), direction: dir, w: experimentWeight(e, study).w, pmid: st,
    site: (e["Body site"] || "").trim(), host: (e["Host species"] || "").trim(), seq: (e["Sequencing type"] || "").trim(), region: (e["16S variable region"] || "").trim(),
    design: (study["Study design"] || "").trim(), n0: e["Group 0 sample size"], n1: e["Group 1 sample size"],
    title: (study["Title"] || "").trim(), journal: (study["Journal"] || "").trim(), year: (study["Year"] || "").trim(),
    paper: (study["URL"] || "").trim() || (study["DOI"] ? "https://doi.org/" + study["DOI"].trim() : ""),
  });
}
const taxonStudyIds = new Set(obs.map((o) => o.pmid));

const byCond = new Map();
for (const o of obs) { let g = byCond.get(o.condition); if (!g) { g = { condition: o.condition, items: [], dirs: new Set() }; byCond.set(o.condition, g); } g.items.push(o); g.dirs.add(o.direction); }
const perStudyCaveats = (o) => {
  const c = [];
  if (/16S|PCR/i.test(o.seq)) c.push("marker-gene method: species-level Salmonella enterica call, not resolved to a serovar");
  if (o.host && o.host !== "Homo sapiens") c.push(`non-human host (${o.host})`);
  if (Math.min(+o.n0 || 999, +o.n1 || 999) < 20) c.push("small cohort");
  return c;
};
const conds = [...byCond.values()].map((g) => {
  const best = g.items.reduce((a, b) => (b.w > a.w ? b : a), g.items[0]);
  const direction = g.dirs.size > 1 ? "mixed" : ([...g.dirs][0] === "increased" ? "enriched" : "depleted");
  const byPmid = new Map();
  for (const o of g.items) { const p = byPmid.get(o.pmid); if (!p || o.w > p.w) byPmid.set(o.pmid, o); }
  const studies = [...byPmid.values()].sort((a, b) => b.w - a.w).map((o) => ({
    title: o.title, journal: o.journal, year: o.year, design: o.design, participants: (+o.n0 || 0) + (+o.n1 || 0),
    site: o.site, method: o.seq + (o.region ? " V" + o.region : ""), direction: o.direction === "increased" ? "enriched" : "depleted",
    grade: gradeLetter(o.w), paper: o.paper, url: "/research-feeds/" + slugify(o.title), caveats: perStudyCaveats(o),
  }));
  const nStudies = studies.length;
  const signal = best.w * 0.6 + Math.min(nStudies, 3) / 3 * 0.4;
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
const mixDesc = tier === "Low" ? "genuinely mixed" : tier === "Moderate" ? "leaning one direction but not uniform" : "fairly consistent";
const conditionsData = { taxon: TAXON.title, summary: { nConditions: conds.length, nStudies: allByPmid.size, participants: totalParticipants, tier, agreement, enriched: nEnriched, depleted: nDepleted, mixed: nMixed }, rows: conds };

let H = "";
H += `<h2 class="wp-block-heading" id="h-overview">Overview</h2>`;
H += P(`<em>Salmonella enterica</em> is the species responsible for essentially all human <em>Salmonella</em> disease. It is a Gram-negative, facultatively anaerobic, flagellated rod in the Enterobacteriaceae, and it is divided into more than 2,000 serovars: the typhoidal serovars (Typhi, Paratyphi) cause typhoid fever, while the many non-typhoidal serovars cause gastroenteritis and invasive disease.${cite("johnson")} Invasive non-typhoidal <em>Salmonella</em> alone caused an estimated 535,000 cases and 77,500 deaths in 2017, hitting young children, elderly people, and people with HIV hardest.${cite("gbd")} On this database it appears as a differentially abundant taxon across human microbiome studies, usually a low-abundance signal rather than active infection.`);
H += P(`What makes <em>Salmonella</em> distinctive is how it turns host defenses to its own advantage. It invades and survives inside host cells using two type III secretion systems, and it actually thrives in the inflamed gut, exploiting inflammation and outcompeting the resident microbiota.${cite("johnson", "liu")} Part of that edge is a metal-acquisition system that defeats the host's ${dlink("/definition/nutritional-immunity/", "nutritional immunity")}, which is exactly the lens this database reads pathogens through.${cite("liu")}`);

H += `<h3 class="wp-block-heading" id="h-morphology"><strong>Morphology</strong></h3>`;
H += P(`<em>Salmonella</em> are Gram-negative, facultatively anaerobic, non-spore-forming rods, typically motile by peritrichous flagella, in the family Enterobacteriaceae.${cite("johnson")} They tolerate bile and acid well enough to survive stomach passage and colonize the intestine, and are readily transmitted through contaminated food and water.${cite("gbd")}`);

H += `<h3 class="wp-block-heading" id="h-pathogenicity"><strong>Pathogenicity</strong></h3>`;
H += P(`<em>Salmonella</em> is a true pathogen rather than a commensal. Non-typhoidal serovars cause self-limiting gastroenteritis in healthy people but invasive, often bloodstream, disease with high mortality in vulnerable hosts (all-age case fatality around 14.5 percent),${cite("gbd")} while typhoidal serovars cause systemic typhoid fever.${cite("johnson")} A low-abundance differential signal in a microbiome study reflects an ecological shift or carriage, not necessarily active infection.`);

H += `<h3 class="wp-block-heading" id="h-virulence-factors"><strong>Virulence Factors</strong></h3>`;
H += P(`<em>Salmonella</em>'s toolkit is built around invading and surviving inside host cells and winning the fight for nutrients in the inflamed gut.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Virulence factor</th><th>Description and role</th></tr></thead><tbody>`
  + `<tr><td>${mred("SPI-1 type III secretion system")}</td><td>Injects effectors that force host cells to engulf the bacterium, driving invasion of the intestinal epithelium.${cite("johnson")}</td></tr>`
  + `<tr><td>${mred("SPI-2 type III secretion system")}</td><td>Delivers a second set of effectors that let <em>Salmonella</em> survive and replicate inside a membrane-bound vacuole within host cells.${cite("johnson")}</td></tr>`
  + `<tr><td>${mred("Flagella and fimbrial adhesins")}</td><td>Peritrichous flagella and fimbriae mediate motility and attachment to the gut epithelium.${cite("johnson")}</td></tr>`
  + `<tr><td>${mred("Typhoid toxin and Vi antigen")}</td><td>Typhoidal serovars carry the typhoid toxin, which contributes to symptoms, and the Vi capsular antigen, which aids immune evasion.${cite("johnson")}</td></tr>`
  + `<tr><td>${mred("High-affinity zinc uptake (ZnuABC)")}</td><td>Lets <em>Salmonella</em> overcome host metal withholding and outgrow competing commensals in the inflamed gut.${cite("liu")}</td></tr>`
  + `</tbody></table></figure>`;

H += `<h3 class="wp-block-heading" id="h-antibiotic-resistance"><strong>Antibiotic Resistance</strong></h3>`;
H += P(`Multidrug-resistant <em>Salmonella</em>, in both typhoidal and non-typhoidal serovars, is a growing problem that complicates treatment of typhoid fever and invasive disease.${cite("johnson", "gbd")} Definitive treatment is susceptibility-guided; this page describes the organism's biology and its microbiome associations, not a treatment protocol.`);

H += `<h3 class="wp-block-heading" id="h-metallomics"><strong>Metallomics</strong></h3>`;
H += P(`<em>Salmonella</em> is a textbook case of a pathogen defeating nutritional immunity, and it does so by turning inflammation into an advantage.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Metal / ion</th><th>Key features in <em>Salmonella</em></th></tr></thead><tbody>`
  + `<tr><td>${mred("Zinc (Zn)")}</td><td>The host neutrophil protein calprotectin sequesters zinc to starve microbes, but <em>Salmonella</em>'s high-affinity ZnuABC importer overcomes this. As a result it thrives in the inflamed gut and outcompetes commensals; a ZnuABC mutant is rescued only when calprotectin is absent.${cite("liu")}</td></tr>`
  + `<tr><td>${mred("Inflammation as opportunity")}</td><td>Rather than being suppressed by gut inflammation, <em>Salmonella</em> exploits it: inflammation shifts the metal and nutrient economy in ways the pathogen is equipped to win.${cite("liu")}</td></tr>`
  + `</tbody></table></figure>`;

H += `<h3 class="wp-block-heading" id="h-vulnerabilities"><strong>Vulnerabilities</strong></h3>`;
H += P(`Read through the nutritional-immunity lens, the systems that give <em>Salmonella</em> its edge in the inflamed gut are also its openings.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Weak point</th><th>Why it is exploitable</th></tr></thead><tbody>`
  + `<tr><td>${mred("ZnuABC dependence")}</td><td>Because <em>Salmonella</em> relies on ZnuABC to beat calprotectin's zinc sequestration, reinforcing metal withholding or blocking that transporter attacks a system it needs to thrive.${cite("liu")}</td></tr>`
  + `<tr><td>${mred("Colonization resistance")}</td><td>A healthy, intact microbiota resists <em>Salmonella</em>; the pathogen exploits inflammation to break that resistance, so protecting the barrier and community limits it.${cite("liu")}</td></tr>`
  + `<tr><td>${mred("Susceptibility-guided therapy")}</td><td>Definitive treatment is antibiotics chosen by susceptibility, though rising resistance makes this harder.${cite("gbd")}</td></tr>`
  + `</tbody></table></figure>`;

H += `<h2 class="wp-block-heading" id="h-interventions">Interventions</h2>`;
H += P(`For a pathogen, an intervention is anything that clears it or blunts its advantage. Clinical treatment is antibiotics managed by clinicians; the entries below are classified by ${dlink("/our-validation-method/", "our validation method")}, and this is <strong>not</strong> medical advice. The microbiome through-lines are colonization resistance and nutritional immunity.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Intervention</th><th>Class</th><th>Status</th></tr></thead><tbody>`
  + `<tr><td>Susceptibility-guided antibiotics</td><td>Drug</td><td>Validated</td></tr>`
  + `<tr><td>Colonization resistance (healthy microbiota)</td><td>Concept</td><td>Validation In Progress</td></tr>`
  + `<tr><td>Metal-withholding (zinc) support</td><td>Concept</td><td>Validation In Progress</td></tr>`
  + `</tbody></table></figure>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">How do these act on Salmonella?</span></summary><figure class="wp-block-table"><table class="has-fixed-layout"><tbody>`
  + `<tr><td><strong>Intervention</strong></td><td><strong>Mechanism</strong></td></tr>`
  + `<tr><td>Susceptibility-guided antibiotics</td><td>Standard of care for invasive disease and typhoid, chosen by susceptibility as resistance rises.${cite("gbd")}</td></tr>`
  + `<tr><td>Colonization resistance</td><td>An intact microbiota competes with <em>Salmonella</em> and resists its colonization; the pathogen must break this to establish.${cite("liu")}</td></tr>`
  + `<tr><td>Metal-withholding support</td><td>Reinforcing host zinc sequestration targets the ZnuABC system <em>Salmonella</em> uses to thrive in the inflamed gut.${cite("liu")}</td></tr>`
  + `</tbody></table></figure></details>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">What should be avoided (STOP)?</span></summary>`
  + P(`Unnecessary disruption of the resident microbiota (for example needless broad-spectrum antibiotics), which weakens the colonization resistance that normally keeps <em>Salmonella</em> out.${cite("liu")}`)
  + `</details>`;

H += `<h2 class="wp-block-heading" id="h-conditions">Conditions</h2>`;
H += P(`Where <em>Salmonella</em> (NCBI:txid${TAXON.taxid}) appears as a differentially abundant taxon across the Microbiome Medicine corpus. Each row aggregates every experiment in which the organism moved in a given condition; <em>direction</em> is its change in the case/exposure group, and <em>grade</em> is the strongest single study's methodology weight (A·D·S·C·R), the same engine that grades every signature on this site.`);
H += P(`Across <strong>${conds.length}</strong> conditions and <strong>${allByPmid.size}</strong> studies, the signal is ${mixDesc}: enriched in ${nEnriched}, depleted in ${nDepleted}, and direction-conflicting in ${nMixed} (directional agreement ${agreement}). Because <em>S. enterica</em> is a low-carriage pathogen rather than a stable resident, its appearances here are best read as ecological signals or carriage, not infection, so the aggregate evidence tier is <strong>${tier}</strong>.`);
H += `<div class="mbio-note"><p><span class="mbio-note__lead">How to read these.</span> <em>Salmonella</em> is not a normal stable resident of the gut, so a low-abundance differential signal usually reflects transient carriage, exposure, or an ecological shift rather than active infection. Detection resolves <em>S. enterica</em> as a species but not its serovar, which matters because typhoidal and non-typhoidal serovars differ greatly in behaviour and risk. This is why direction can conflict between cohorts and the aggregate tier stays ${tier}.</p></div>`;
H += `<!--CONDITIONS_TABLE-->`;

H += `<h2 class="wp-block-heading" id="h-faqs">FAQs</h2>`;
const FAQ = [
  ["Is Salmonella part of the normal gut microbiome?", `No. <em>Salmonella</em> is a pathogen, not a stable commensal. When it appears as a low-abundance taxon in a gut study, that reflects transient carriage or an ecological shift, not normal colonization.${cite("gbd")}`],
  ["How dangerous is Salmonella?", `It ranges from self-limiting gastroenteritis in healthy people to invasive, often fatal, bloodstream disease in vulnerable hosts; invasive non-typhoidal <em>Salmonella</em> caused an estimated 535,000 cases and 77,500 deaths in 2017.${cite("gbd")} Typhoidal serovars cause typhoid fever.${cite("johnson")}`],
  ["How does Salmonella cause infection?", `It uses two type III secretion systems to invade gut cells and survive inside them,${cite("johnson")} and it thrives in the inflamed gut by using a zinc transporter to outcompete your good bacteria for metals.${cite("liu")}`],
  ["How is Salmonella treated?", `Invasive disease and typhoid are treated by clinicians with antibiotics chosen by susceptibility, which is complicated by rising drug resistance.${cite("gbd", "johnson")} This page covers the organism's biology and microbiome associations, not a treatment protocol.`],
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
const rfGraphs = (f) => {
  const fields = [["Location", f.location], ["Sample Site", f.sample_site], ["Species", f.species]];
  const present = fields.filter(([, v]) => v && v.length);
  if (!present.length) return "";
  return `<div class="research-feed__graphs">` + present.map(([t, items]) => `<div class="research-feed__graph"><div class="research-feed__graph-title">${t}</div><div class="research-feed__graph-items">` + items.map((i) => `<div class="research-feed__graph-item">${esc(i)}</div>`).join("") + `</div></div>`).join("") + `</div>`;
};
const to4 = (html) => html.replace(/<h3\b[^>]*>/g, `<h4 class="wp-block-heading">`).replace(/<\/h3>/g, "</h4>");
const cardSummary = (pmid, abstract) => { if (AUTHORED[pmid]) return to4(sectionsToHtml(AUTHORED[pmid].sections)); const sec = abstractToSections(abstract); return sec ? to4(sectionsToHtml(sec)) : ""; };

// Research feed = only the studies in which THIS taxon (S. enterica, 28901) was differential.
const rfStudies = studies.filter((s) => (s["Title"] || "").trim() && taxonStudyIds.has((s["Study page name"] || "").trim())).sort((a, b) => (+b["Year"] || 0) - (+a["Year"] || 0));
H += `<h2 class="wp-block-heading" id="h-research-feed">Research Feed</h2>`;
H += P(`Internal summaries of the ${rfStudies.length} studies we reviewed in which <em>Salmonella</em> was a differential taxon across this corpus.`);
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
H += `<div class="mbio-update-history"><div class="mbio-update-history__content"><article class="mbio-card"><div class="mbio-card__border"></div><p class="mbio-card__date">2026-07-04</p><span class="mbio-card__title">Salmonella enterica <span class="mbio-card__type btn btn--rounded">major</span></span><div class="mbio-card__content"><p class="wp-block-paragraph">Taxon page created: biology (morphology, pathogenicity, type III secretion virulence, antibiotic resistance), the zinc / nutritional-immunity metallome and vulnerabilities, interventions, the data-derived Conditions table across ${conds.length} conditions, and the full research feed.</p></div></article></div></div>`;

H += `<h2 class="wp-block-heading" id="h-references">References</h2><ol class="rgbc-references">`;
for (const k of order) { const r = R[k]; H += `<li class="rgbc-references__item" id="ref-${k}"><a class="rgbc-references__link" href="${r.url}" target="_blank">${esc(r.name)}</a> ${esc(r.authors)} <span>(${esc(r.date)})</span></li>`; }
H += `</ol>`;
for (const k of order) { const r = R[k]; H += `<div class="tooltip rgbc-reference-tooltip wiki-ref-${k}"><div class="tooltip__content rgbc-reference-tooltip__content"><p>${esc(r.authors)}</p><a href="${r.url}" target="_blank">${esc(r.name)}</a><p>${esc(r.date)}</p></div></div>`; }

const meta = {
  did_you_know: "Salmonella does not just tolerate your gut's inflammation, it exploits it: it out-competes your good bacteria for zinc using a special uptake pump that defeats the immune system's metal-starvation defense.",
  authors: [{ name: "Karen Pendergrass", orcid: "https://orcid.org/0000-0002-2348-7259", avatar: "https://secure.gravatar.com/avatar/104bc2e8ba283fda6309c14b2eca02fe9612e8793ed62621c691e83230d4a963?s=96&d=mm&r=g" }],
  conditions: conditionsData,
};
const excerpt_html = "<p>Salmonella enterica is the species behind essentially all human Salmonella disease, spanning typhoid fever and non-typhoidal gastroenteritis. It invades host cells with type III secretion systems and thrives in the inflamed gut by defeating the host's metal-withholding defenses, a nutritional-immunity battle that is also its weak point.</p>";

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
    let nid = Number(maxRf?.id) || 990700;
    for (const r of rfRows) { nid++; const { error } = await db.from("content_items").insert({ id: nid, type: "research-feed", slug: r.slug, title: r.title, content_html: r.content_html, excerpt_html: r.excerpt_html, meta: r.meta, status: "publish", published_at: r.published_at || now, modified_at: now }); if (error) console.log(`RF insert ERROR (${r.slug}): ${error.message}`); }
    console.log(`research-feed: created ${rfRows.length} new page(s), reused ${studies.length - rfRows.length}`);
  } else { console.log(`research-feed: all ${studies.length} studies already have pages (reused)`); }
  let rfUpdated = 0;
  for (const s of studies) { const title = (s["Title"] || "").trim(); if (!title) continue; const pmid = (s["PMID"] || s["Study page name"] || "").trim(); if (!AUTHORED[pmid]) continue; const { data: upd, error } = await db.from("content_items").update({ content_html: sectionsToHtml(AUTHORED[pmid].sections), excerpt_html: AUTHORED[pmid].excerpt, modified_at: now }).eq("type", "research-feed").eq("slug", slugify(title)).select("id"); if (error) console.log(`RF update ERROR: ${error.message}`); else if (upd?.length) rfUpdated += upd.length; }
  console.log(`research-feed: refreshed ${rfUpdated} page(s) with authored summaries`);
  const { data: existing } = await db.from("content_items").select("id").eq("type", "microbe").eq("slug", TAXON.slug).maybeSingle();
  if (existing) { const { error } = await db.from("content_items").update({ title: TAXON.title, content_html: H, excerpt_html, meta, modified_at: now }).eq("id", existing.id); console.log(error ? "update ERROR: " + error.message : `updated -> microbe#${existing.id} (${TAXON.slug})`); }
  else { const { data: maxRow } = await db.from("content_items").select("id").order("id", { ascending: false }).limit(1).maybeSingle(); const id = (Number(maxRow?.id) || 990700) + 1; const { error } = await db.from("content_items").insert({ id, type: "microbe", slug: TAXON.slug, title: TAXON.title, content_html: H, excerpt_html, meta, status: "publish", published_at: now, modified_at: now }); console.log(error ? "insert ERROR: " + error.message : `inserted -> microbe#${id} (${TAXON.slug})`); }
}
