// Build the "Bacteroides fragilis" TAXON page (NCBI taxid 817) — same universal pattern.
// B. fragilis is the "good, bad, and nitty-gritty" taxon: a beneficial keystone commensal
// (polysaccharide A immunomodulation) AND the most common anaerobic pathogen, with
// enterotoxigenic (ETBF) strains linked to colorectal cancer. The Overview reflects that duality.
//
// Sidebar: Overview (Morphology, Immunomodulation, Pathogenicity, Antibiotic Resistance,
// Virulence Factors, Vulnerabilities) · Interventions · Conditions · FAQs · Research Feed ·
// Update History · References.
//
// Modes: (stats) | --json <file> | --publish
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseCsvObjects } from "../../lib/csv.mjs";
import { experimentWeight } from "../../lib/grade.mjs";
import { abstractToSections, sectionsToHtml, slugify, buildResearchFeeds } from "../../lib/feeds.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLES = join(HERE, "../../samples/bacteroides-fragilis");

const TAXON = {
  taxid: "817",
  species: "Bacteroides fragilis",
  genus: "Bacteroides",
  slug: "bacteroides-fragilis",
  title: "Bacteroides fragilis",
};

// ================= references (verified via PubMed — author-safe) =========================
const R = {
  mazmanian: { name: "An immunomodulatory molecule of symbiotic bacteria directs maturation of the host immune system.", authors: "Mazmanian SK, Liu CH, Tzianabos AO, Kasper DL.", date: "Cell. 2005", url: "https://doi.org/10.1016/j.cell.2005.05.007" },
  mazmanian2008: { name: "A microbial symbiosis factor prevents intestinal inflammatory disease.", authors: "Mazmanian SK, Round JL, Kasper DL.", date: "Nature. 2008", url: "https://doi.org/10.1038/nature07008" },
  wexler: { name: "Bacteroides: the good, the bad, and the nitty-gritty.", authors: "Wexler HM.", date: "Clin Microbiol Rev. 2007", url: "https://doi.org/10.1128/CMR.00008-07" },
  dejea: { name: "Patients with familial adenomatous polyposis harbor colonic biofilms containing tumorigenic bacteria.", authors: "Dejea CM, Fathi P, Craig JM, et al. (Sears CL).", date: "Science. 2018", url: "https://doi.org/10.1126/science.aah3648" },
};

// ---- citation engine (endo-faithful; first-appearance numbering, dedup) -----------------
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

// ================= Conditions: derive from the CSVs on this taxon's taxid =================
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
  const nm = (row["MetaPhlAn taxon names"] || "").includes("s__" + TAXON.species);
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
  const w = experimentWeight(e, study).w;
  obs.push({
    condition: (e["Condition"] || "Unspecified").trim(),
    direction: dir, w, pmid: st,
    site: (e["Body site"] || "").trim(), host: (e["Host species"] || "").trim(),
    seq: (e["Sequencing type"] || "").trim(), region: (e["16S variable region"] || "").trim(),
    design: (study["Study design"] || "").trim(),
    n0: e["Group 0 sample size"], n1: e["Group 1 sample size"],
    title: (study["Title"] || "").trim(), journal: (study["Journal"] || "").trim(), year: (study["Year"] || "").trim(),
    paper: (study["URL"] || "").trim() || (study["DOI"] ? "https://doi.org/" + study["DOI"].trim() : ""),
  });
}

const byCond = new Map();
for (const o of obs) {
  let g = byCond.get(o.condition);
  if (!g) { g = { condition: o.condition, items: [], dirs: new Set() }; byCond.set(o.condition, g); }
  g.items.push(o); g.dirs.add(o.direction);
}
const perStudyCaveats = (o) => {
  const c = [];
  if (/16S|PCR/i.test(o.seq)) c.push("16S may group B. fragilis with close relatives and cannot separate toxigenic (ETBF) from non-toxigenic strains");
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
    title: o.title, journal: o.journal, year: o.year, design: o.design,
    participants: (+o.n0 || 0) + (+o.n1 || 0),
    site: o.site, method: o.seq + (o.region ? " V" + o.region : ""),
    direction: o.direction === "increased" ? "enriched" : "depleted",
    grade: gradeLetter(o.w), paper: o.paper, url: "/research-feeds/" + slugify(o.title), caveats: perStudyCaveats(o),
  }));
  const nStudies = studies.length;
  const participants = studies.reduce((s, x) => s + x.participants, 0);
  const signal = best.w * 0.6 + Math.min(nStudies, 3) / 3 * 0.4;
  const magnitude = signal >= 0.62 ? 3 : signal >= 0.45 ? 2 : 1;
  return { condition: g.condition, direction, grade: gradeLetter(best.w), score: +best.w.toFixed(3), magnitude, nStudies, participants, studies };
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

const conditionsData = {
  taxon: TAXON.title,
  summary: { nConditions: conds.length, nStudies: allByPmid.size, participants: totalParticipants, tier, agreement, enriched: nEnriched, depleted: nDepleted, mixed: nMixed },
  rows: conds,
};

// ================================= page body =============================================
let H = "";

H += `<h2 class="wp-block-heading" id="h-overview">Overview</h2>`;
H += P(`<em>Bacteroides fragilis</em> is a Gram-negative, obligately anaerobic, bile-resistant rod and a keystone member of the human gut microbiota. Although it makes up only about 0.5 percent of the colonic flora, it is one of the most influential and best-studied gut symbionts, and also the anaerobe most often isolated from human infections.${cite("wexler")} On this database it appears as a differentially abundant taxon across many human microbiome studies, where its meaning depends on which side of its dual nature is in play.`);
H += P(`What makes <em>B. fragilis</em> distinctive is that it is both a beneficial partner and a potential pathogen. As a commensal it educates the immune system through a single molecule, polysaccharide A, that induces regulatory T cells and protects against colitis.${cite("mazmanian", "mazmanian2008")} But when it escapes the gut it causes abscesses and bloodstream infections,${cite("wexler")} and enterotoxigenic strains that secrete the <em>B. fragilis</em> toxin are linked to inflammation and colorectal cancer.${cite("dejea")} Reading its signal here means keeping that good-and-bad duality in mind.`);

H += `<h3 class="wp-block-heading" id="h-morphology"><strong>Morphology</strong></h3>`;
H += P(`<em>B. fragilis</em> is a Gram-negative, obligately anaerobic, non-spore-forming rod with a polysaccharide capsule and notable tolerance of bile, which helps it thrive in the gut.${cite("wexler")} It is saccharolytic, fermenting a wide range of sugars, and carries complex systems to sense and adapt to nutrient availability. Despite making up only about 0.5 percent of the colonic microbiota, its influence on host physiology is outsized.${cite("wexler")}`);

H += `<h3 class="wp-block-heading" id="h-immunomodulation"><strong>Immunomodulation</strong></h3>`;
H += P(`<em>B. fragilis</em> is the archetype of beneficial host-microbe symbiosis. A single capsular molecule, polysaccharide A (PSA), directs maturation of the host immune system: during colonization it corrects systemic T-cell deficiencies and T helper 1 / T helper 2 imbalances and guides lymphoid development.${cite("mazmanian")} PSA also protects against experimental colitis by inducing interleukin-10-producing regulatory T cells and suppressing pro-inflammatory interleukin-17, which is why PSA is studied as a candidate therapeutic for inflammatory bowel disease.${cite("mazmanian2008")}`);

H += `<h3 class="wp-block-heading" id="h-pathogenicity"><strong>Pathogenicity</strong></h3>`;
H += P(`<em>B. fragilis</em> has a Jekyll-and-Hyde relationship with the host. In the gut it is a beneficial commensal, but when it breaches the intestinal barrier it becomes the most common anaerobic pathogen, causing abscesses and bacteremia with significant mortality.${cite("wexler")} A distinct subset, enterotoxigenic <em>B. fragilis</em> (ETBF), secretes the <em>B. fragilis</em> toxin (BFT, a zinc metalloprotease also called fragilysin); ETBF drives interleukin-17 inflammation, DNA damage, and tumor formation, and is enriched in the colonic biofilms of colorectal cancer and familial adenomatous polyposis patients.${cite("dejea")} Non-toxigenic strains lack this toxin, and a differential-abundance signal cannot tell the two apart.`);

H += `<h3 class="wp-block-heading" id="h-antibiotic-resistance"><strong>Antibiotic Resistance</strong></h3>`;
H += P(`Among anaerobes, <em>B. fragilis</em> carries the most antibiotic-resistance mechanisms and the highest resistance rates, with rising resistance to agents including cefoxitin, clindamycin, carbapenems, and fluoroquinolones, plus multiple efflux systems that expel toxic compounds.${cite("wexler")} This makes anaerobic infections involving <em>B. fragilis</em> clinically challenging and susceptibility-guided; this page describes its biology and microbiome associations, not a treatment protocol.`);

H += `<h3 class="wp-block-heading" id="h-virulence-factors"><strong>Virulence Factors</strong></h3>`;
H += P(`<em>B. fragilis</em>'s factors are notably context-dependent: the same capsule that drives abscesses carries the immunomodulatory molecule behind its benefits, and the toxin that defines the harmful ETBF strains is absent from the beneficial ones.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Virulence factor</th><th>Description and role</th></tr></thead><tbody>`
  + `<tr><td>${mred("Polysaccharide capsule / PSA")}</td><td>The capsule shields against complement and phagocytosis and is central to abscess formation; yet the same polysaccharide A is the immunomodulatory molecule behind the organism's beneficial effects, a striking case of context-dependent biology.${cite("wexler", "mazmanian")}</td></tr>`
  + `<tr><td>${mred("B. fragilis toxin (BFT / fragilysin)")}</td><td>A secreted zinc metalloprotease made only by enterotoxigenic strains; it cleaves E-cadherin, triggers interleukin-17 inflammation and DNA damage, and promotes colorectal tumorigenesis.${cite("dejea")}</td></tr>`
  + `<tr><td>${mred("Efflux and resistance systems")}</td><td>Multiple drug-efflux pumps and a large repertoire of resistance genes make <em>B. fragilis</em> the most resistant anaerobic pathogen.${cite("wexler")}</td></tr>`
  + `<tr><td>${mred("Bile tolerance and nutrient sensing")}</td><td>Bile resistance and flexible nutrient sensing let it colonize the gut and, when displaced, survive at other body sites.${cite("wexler")}</td></tr>`
  + `</tbody></table></figure>`;

H += `<h3 class="wp-block-heading" id="h-vulnerabilities"><strong>Vulnerabilities</strong></h3>`;
H += P(`Because <em>B. fragilis</em> is mostly beneficial, the goal is less to attack it than to keep it on its good side. The levers act on its dual nature.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Lever</th><th>Why it matters</th></tr></thead><tbody>`
  + `<tr><td>${mred("Toxigenic vs non-toxigenic strain")}</td><td>The decisive distinction is strain-level: non-toxigenic <em>B. fragilis</em> is a beneficial commensal, while ETBF carrying the toxin gene drives inflammation and cancer. The real target is the toxin, not the species.${cite("dejea")}</td></tr>`
  + `<tr><td>${mred("Barrier integrity")}</td><td><em>B. fragilis</em> turns harmful mainly when it escapes the gut (abscess, bacteremia) or when a leaky, biofilm-laden mucosa lets ETBF act, so supporting barrier integrity keeps it beneficial.${cite("wexler", "dejea")}</td></tr>`
  + `<tr><td>${mred("PSA as a therapeutic")}</td><td>Its beneficial molecule, polysaccharide A, is itself a candidate immunotherapy for inflammatory bowel disease, so <em>B. fragilis</em> is as much a source of interventions as a target.${cite("mazmanian2008")}</td></tr>`
  + `</tbody></table></figure>`;

// ---------- Interventions ----------
H += `<h2 class="wp-block-heading" id="h-interventions">Interventions</h2>`;
H += P(`For a mostly beneficial commensal, an intervention is anything that keeps <em>B. fragilis</em> on its helpful side or blunts the harm of its enterotoxigenic strains. Everything below is research-stage and is <strong>not</strong> medical advice; each is classified by ${dlink("/our-validation-method/", "our validation method")}. The through-line is the good-and-bad duality: nurture the commensal, contain the toxin.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Intervention</th><th>Class</th><th>Status</th></tr></thead><tbody>`
  + `<tr><td>Polysaccharide A (PSA) immunotherapy</td><td>Concept</td><td>Validation In Progress</td></tr>`
  + `<tr><td>Support the non-toxigenic commensal</td><td>Concept</td><td>Validation In Progress</td></tr>`
  + `<tr><td>Contain enterotoxigenic ETBF / BFT</td><td>Concept</td><td>Validation In Progress</td></tr>`
  + `</tbody></table></figure>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">How do these relate to B. fragilis?</span></summary><figure class="wp-block-table"><table class="has-fixed-layout"><tbody>`
  + `<tr><td><strong>Intervention</strong></td><td><strong>Mechanism</strong></td></tr>`
  + `<tr><td>Polysaccharide A immunotherapy</td><td>Purified PSA induces interleukin-10 regulatory T cells and suppresses interleukin-17, protecting against colitis in models, a candidate approach for inflammatory bowel disease.${cite("mazmanian2008")}</td></tr>`
  + `<tr><td>Support the non-toxigenic commensal</td><td>A stable non-toxigenic <em>B. fragilis</em> provides the immune education attributed to PSA and competes with harmful strains.${cite("mazmanian")}</td></tr>`
  + `<tr><td>Contain enterotoxigenic ETBF / BFT</td><td>The colorectal-cancer risk is tied specifically to the toxin-producing strains and their biofilms, so the target is BFT and mucosal biofilm, not the species overall.${cite("dejea")}</td></tr>`
  + `</tbody></table></figure></details>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">What should be avoided (STOP)?</span></summary>`
  + P(`Treating <em>B. fragilis</em> as uniformly good or uniformly bad. The species includes both a beneficial, immune-educating commensal and enterotoxigenic strains linked to colorectal cancer, and standard abundance measures do not separate them.${cite("dejea")}`)
  + `</details>`;

// ---------- Conditions (data-derived) ----------
H += `<h2 class="wp-block-heading" id="h-conditions">Conditions</h2>`;
H += P(`Where <em>B. fragilis</em> (NCBI:txid${TAXON.taxid}) appears as a differentially abundant taxon across the Microbiome Medicine corpus. Each row aggregates every experiment in which the organism moved in a given condition; <em>direction</em> is its change in the case/exposure group, and <em>grade</em> is the strongest single study's methodology weight (A·D·S·C·R), the same engine that grades every signature on this site.`);
H += P(`Across <strong>${conds.length}</strong> conditions and <strong>${allByPmid.size}</strong> studies, the signal is ${mixDesc}: enriched in ${nEnriched}, depleted in ${nDepleted}, and direction-conflicting in ${nMixed} (directional agreement ${agreement}). Because <em>B. fragilis</em> has a dual beneficial-and-harmful nature and standard profiling cannot separate its strains, its direction in any one condition is hard to interpret in isolation, so the aggregate evidence tier is <strong>${tier}</strong>.`);
H += `<div class="mbio-note"><p><span class="mbio-note__lead">How to read these.</span> <em>B. fragilis</em> is a genuine, influential gut resident, so these signals are ecologically real. Two caveats apply. 16S profiling often cannot separate <em>B. fragilis</em> from close relatives in the <em>Bacteroides fragilis</em> group, and it cannot distinguish the beneficial non-toxigenic strains from the enterotoxigenic ETBF strains that carry the toxin. So an enrichment says little on its own about whether the beneficial or the harmful side is at play. This is why direction can conflict between cohorts and the aggregate tier stays ${tier}.</p></div>`;
H += `<!--CONDITIONS_TABLE-->`;

// ---------- FAQs ----------
H += `<h2 class="wp-block-heading" id="h-faqs">FAQs</h2>`;
const FAQ = [
  ["Is Bacteroides fragilis good or bad?", `Both, depending on the strain and where it is. In the gut, non-toxigenic <em>B. fragilis</em> is a beneficial commensal that helps train the immune system.${cite("mazmanian")} But it is also the most common anaerobic pathogen when it escapes the gut, and enterotoxigenic strains are linked to colorectal cancer.${cite("wexler", "dejea")}`],
  ["What does Bacteroides fragilis do in the gut?", `It helps educate the immune system. Its polysaccharide A directs immune maturation and induces interleukin-10 regulatory T cells that calm inflammation, which is why it protects against colitis in animal models.${cite("mazmanian", "mazmanian2008")}`],
  ["What is enterotoxigenic Bacteroides fragilis (ETBF)?", `A subset of strains that secrete the <em>B. fragilis</em> toxin (BFT, a metalloprotease). ETBF drives interleukin-17 inflammation and DNA damage and is enriched in the colonic biofilms of colorectal cancer patients, unlike the harmless non-toxigenic strains.${cite("dejea")}`],
  ["Can Bacteroides fragilis cause infection?", `Yes, when it leaves the gut. It is the anaerobe most often isolated from human infections, causing abscesses and bloodstream infections, and it is the most antibiotic-resistant anaerobic pathogen, so such infections are clinically challenging.${cite("wexler")}`],
];
H += `<div class="rgbc-faq-block">`;
for (const [q, a] of FAQ) {
  H += `<details class="rgbc-faq-item"><summary><span class="rgbc-faq-icon"></span><span class="rgbc-faq-q">${esc(q)}</span></summary><div class="rgbc-faq-a"><strong>Quick answer:</strong> ${a}</div></details>`;
}
H += `</div>`;

// ---------- Research Feed ----------
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
  return `<div class="research-feed__graphs">` + present.map(([t, items]) =>
    `<div class="research-feed__graph"><div class="research-feed__graph-title">${t}</div><div class="research-feed__graph-items">` +
    items.map((i) => `<div class="research-feed__graph-item">${esc(i)}</div>`).join("") + `</div></div>`).join("") + `</div>`;
};
const to4 = (html) => html.replace(/<h3\b[^>]*>/g, `<h4 class="wp-block-heading">`).replace(/<\/h3>/g, "</h4>");
const cardSummary = (pmid, abstract) => {
  if (AUTHORED[pmid]) return to4(sectionsToHtml(AUTHORED[pmid].sections));
  const sec = abstractToSections(abstract);
  return sec ? to4(sectionsToHtml(sec)) : "";
};

const rfStudies = studies.filter((s) => (s["Title"] || "").trim()).sort((a, b) => (+b["Year"] || 0) - (+a["Year"] || 0));
H += `<h2 class="wp-block-heading" id="h-research-feed">Research Feed</h2>`;
H += P(`Internal summaries of the ${rfStudies.length} studies we reviewed in which <em>B. fragilis</em> was a differential taxon across this corpus.`);
H += `<div class="research-feed accordion" data-accordion-disable-auto-close="true">`;
for (const s of rfStudies) {
  const title = (s["Title"] || "").trim();
  const year = (s["Year"] || "").trim();
  const paper = (s["URL"] || "").trim() || (s["DOI"] ? "https://doi.org/" + s["DOI"].trim() : "#");
  const pmid = (s["PMID"] || s["Study page name"] || "").trim();
  const url = `/research-feeds/${slugify(title)}`;
  const KEY = /\b(found|showed|reveal|demonstrat|associat|enriched|deplet|increas|decreas|higher|lower|identif|correlat)\b/i;
  const sentences = (s["Abstract"] || "").replace(/\s+/g, " ").split(/(?<=[.!?])\s+/);
  const finding = sentences.find((x) => KEY.test(x) && x.split(" ").length >= 6);
  const excerpt = AUTHORED[pmid]?.excerpt || (finding || firstSentence(s["Abstract"]) || title).slice(0, 300);
  const stExps = exps.filter((e) => (e["Study"] || "").trim() === pmid);
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

// ---------- Update History ----------
H += `<h2 class="wp-block-heading" id="h-update-history">Update History</h2>`;
H += `<div class="mbio-update-history"><div class="mbio-update-history__content"><article class="mbio-card"><div class="mbio-card__border"></div><p class="mbio-card__date">2026-07-04</p><span class="mbio-card__title">Bacteroides fragilis <span class="mbio-card__type btn btn--rounded">major</span></span><div class="mbio-card__content"><p class="wp-block-paragraph">Taxon page created: biology (morphology, polysaccharide-A immunomodulation, pathogenicity, antibiotic resistance), virulence factors including the enterotoxigenic BFT toxin, the good-and-bad vulnerabilities, interventions, the data-derived Conditions table across ${conds.length} conditions, and the full research feed.</p></div></article></div></div>`;

// ---------- References ----------
H += `<h2 class="wp-block-heading" id="h-references">References</h2><ol class="rgbc-references">`;
for (const k of order) { const r = R[k]; H += `<li class="rgbc-references__item" id="ref-${k}"><a class="rgbc-references__link" href="${r.url}" target="_blank">${esc(r.name)}</a> ${esc(r.authors)} <span>(${esc(r.date)})</span></li>`; }
H += `</ol>`;
for (const k of order) { const r = R[k]; H += `<div class="tooltip rgbc-reference-tooltip wiki-ref-${k}"><div class="tooltip__content rgbc-reference-tooltip__content"><p>${esc(r.authors)}</p><a href="${r.url}" target="_blank">${esc(r.name)}</a><p>${esc(r.date)}</p></div></div>`; }

// ================================= meta + emit ==========================================
const meta = {
  did_you_know: "Bacteroides fragilis is a Jekyll-and-Hyde microbe: one of its molecules, polysaccharide A, trains your immune system and calms inflammation, yet toxin-producing strains of the same species are linked to colon cancer.",
  authors: [{ name: "Karen Pendergrass", orcid: "https://orcid.org/0000-0002-2348-7259", avatar: "https://secure.gravatar.com/avatar/104bc2e8ba283fda6309c14b2eca02fe9612e8793ed62621c691e83230d4a963?s=96&d=mm&r=g" }],
  conditions: conditionsData,
};
const excerpt_html = "<p>Bacteroides fragilis is a keystone gut commensal with a dual nature. Its polysaccharide A trains the immune system and protects against colitis, but it is also the most common anaerobic pathogen, and enterotoxigenic strains that make the B. fragilis toxin are linked to colorectal cancer.</p>";

console.log(`content_html: ${H.length} chars · refs: ${order.length} · conditions: ${conds.length} (↑${nEnriched} ↓${nDepleted} ↕${nMixed}) · agreement ${agreement} tier ${tier} · RF studies: ${rfStudies.length}`);

const jsonIdx = process.argv.indexOf("--json");
if (jsonIdx >= 0 && process.argv[jsonIdx + 1]) {
  writeFileSync(process.argv[jsonIdx + 1], JSON.stringify({ slug: TAXON.slug, title: TAXON.title, type: "microbe", excerpt_html, content_html: H, meta, modified_at: "2026-07-04T00:00:00.000Z" }, null, 2));
  console.log("wrote JSON -> " + process.argv[jsonIdx + 1]);
}

if (process.argv.includes("--publish")) {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  const rfExisting = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await db.from("content_items").select("id,slug,title").eq("type", "research-feed").eq("status", "publish").range(from, from + 999);
    if (!data || !data.length) break;
    rfExisting.push(...data);
    if (data.length < 1000) break;
  }
  const existingSlugs = new Set(rfExisting.map((r) => r.slug));
  const existingByTitle = new Map(rfExisting.map((r) => [String(r.title).trim(), r.slug]));
  const { rows: rfRows } = buildResearchFeeds({ studiesCsv: stuCsv, experimentsCsv: expCsv, conditionLabel: "", conditionSlug: "", author: meta.authors[0], existingSlugs, existingByTitle });
  const titleToPmid = new Map(studies.map((st) => [(st["Title"] || "").trim(), (st["PMID"] || st["Study page name"] || "").trim()]));
  for (const r of rfRows) { const p = titleToPmid.get(r.title); if (AUTHORED[p]) { r.content_html = sectionsToHtml(AUTHORED[p].sections); r.excerpt_html = AUTHORED[p].excerpt; } }
  if (rfRows.length) {
    const { data: maxRf } = await db.from("content_items").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
    let nid = Number(maxRf?.id) || 990500;
    for (const r of rfRows) {
      nid++;
      const { error } = await db.from("content_items").insert({ id: nid, type: "research-feed", slug: r.slug, title: r.title, content_html: r.content_html, excerpt_html: r.excerpt_html, meta: r.meta, status: "publish", published_at: r.published_at || now, modified_at: now });
      if (error) console.log(`RF insert ERROR (${r.slug}): ${error.message}`);
    }
    console.log(`research-feed: created ${rfRows.length} new page(s), reused ${studies.length - rfRows.length}`);
  } else { console.log(`research-feed: all ${studies.length} studies already have pages (reused)`); }
  let rfUpdated = 0;
  for (const s of studies) {
    const title = (s["Title"] || "").trim(); if (!title) continue;
    const pmid = (s["PMID"] || s["Study page name"] || "").trim();
    if (!AUTHORED[pmid]) continue;
    const { data: upd, error } = await db.from("content_items").update({ content_html: sectionsToHtml(AUTHORED[pmid].sections), excerpt_html: AUTHORED[pmid].excerpt, modified_at: now }).eq("type", "research-feed").eq("slug", slugify(title)).select("id");
    if (error) console.log(`RF update ERROR (${slugify(title)}): ${error.message}`); else if (upd?.length) rfUpdated += upd.length;
  }
  console.log(`research-feed: refreshed ${rfUpdated} page(s) with authored summaries`);

  const { data: existing } = await db.from("content_items").select("id").eq("type", "microbe").eq("slug", TAXON.slug).maybeSingle();
  if (existing) {
    const { error } = await db.from("content_items").update({ title: TAXON.title, content_html: H, excerpt_html, meta, modified_at: now }).eq("id", existing.id);
    console.log(error ? "update ERROR: " + error.message : `updated -> microbe#${existing.id} (${TAXON.slug})`);
  } else {
    const { data: maxRow } = await db.from("content_items").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
    const id = (Number(maxRow?.id) || 990500) + 1;
    const { error } = await db.from("content_items").insert({ id, type: "microbe", slug: TAXON.slug, title: TAXON.title, content_html: H, excerpt_html, meta, status: "publish", published_at: now, modified_at: now });
    console.log(error ? "insert ERROR: " + error.message : `inserted -> microbe#${id} (${TAXON.slug})`);
  }
}
