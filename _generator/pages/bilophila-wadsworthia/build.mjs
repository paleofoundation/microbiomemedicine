// Build the "Bilophila wadsworthia" TAXON page — same universal pattern as
// acinetobacter-baumannii: hand-authored, PubMed-verified Overview + a DATA-DERIVED
// Conditions section that joins the three CSVs on the taxon's NCBI taxid (35833) using the
// repo's evidence engine (lib/grade.mjs), w = A·D·S·C·R.
//
// Sidebar: Overview (Morphology, Metabolism & the H2S engine, Pathogenicity, Virulence
// Factors, Vulnerabilities) · Interventions · Conditions · FAQs · Research Feed ·
// Update History · References.
//
// Research-feed cards use the canonical endometriosis format: title is a NON-LINK <div>,
// the header toggles the accordion, footer "Open" is the only link out. Card summaries fall
// back to the mechanical abstract split when no full-text summary has been authored.
//
// Modes:
//   node _generator/pages/bilophila-wadsworthia/build.mjs                 # stats only
//   node _generator/pages/bilophila-wadsworthia/build.mjs --json <file>   # write {meta,content_html}
//   node _generator/pages/bilophila-wadsworthia/build.mjs --publish       # upsert content_items type=microbe (+ research-feed pages)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseCsvObjects } from "../../lib/csv.mjs";
import { experimentWeight } from "../../lib/grade.mjs";
import { abstractToSections, sectionsToHtml, slugify, buildResearchFeeds } from "../../lib/feeds.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLES = join(HERE, "../../samples/bilophila-wadsworthia");

// ---- target taxon (the only thing that changes per page) --------------------------------
const TAXON = {
  taxid: "35833",
  species: "Bilophila wadsworthia",
  genus: "Bilophila",
  slug: "bilophila-wadsworthia",
  title: "Bilophila wadsworthia",
};

// ================= references (verified via PubMed — author-safe) =========================
const R = {
  baron: { name: "Bilophila wadsworthia, gen. nov. and sp. nov., a unique gram-negative anaerobic rod recovered from appendicitis specimens and human faeces.", authors: "Baron EJ, Summanen P, Downes J, Roberts MC, Wexler H, Finegold SM.", date: "J Gen Microbiol. 1989", url: "https://doi.org/10.1099/00221287-135-12-3405" },
  devkota: { name: "Dietary-fat-induced taurocholic acid promotes pathobiont expansion and colitis in Il10-/- mice.", authors: "Devkota S, Wang Y, Musch MW, Leone V, Fehlner-Peach H, Nadimpalli A, Antonopoulos DA, Jabri B, Chang EB.", date: "Nature. 2012", url: "https://doi.org/10.1038/nature11225" },
  devkotarev: { name: "Interactions between diet, bile acid metabolism, gut microbiota, and inflammatory bowel diseases.", authors: "Devkota S, Chang EB.", date: "Dig Dis. 2015", url: "https://doi.org/10.1159/000371687" },
  peck: { name: "A glycyl radical enzyme enables hydrogen sulfide production by the human intestinal bacterium Bilophila wadsworthia.", authors: "Peck SC, Denger K, Burrichter A, Irwin SM, Balskus EP, Schleheck D.", date: "Proc Natl Acad Sci U S A. 2019", url: "https://doi.org/10.1073/pnas.1815661116" },
  laue: { name: "Taurine reduction in anaerobic respiration of Bilophila wadsworthia RZATAU.", authors: "Laue H, Denger K, Cook AM.", date: "Appl Environ Microbiol. 1997", url: "https://doi.org/10.1128/aem.63.5.2016-2021.1997" },
  natividad: { name: "Bilophila wadsworthia aggravates high fat diet induced metabolic dysfunctions in mice.", authors: "Natividad JM, Lamas B, Pham HP, et al.", date: "Nat Commun. 2018", url: "https://doi.org/10.1038/s41467-018-05249-7" },
  attene: { name: "DNA damage and toxicogenomic analyses of hydrogen sulfide in human intestinal epithelial FHs 74 Int cells.", authors: "Attene-Ramos MS, Nava GM, Muellner MG, Wagner ED, Plewa MJ, Gaskins HR.", date: "Environ Mol Mutagen. 2010", url: "https://doi.org/10.1002/em.20546" },
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

// Full-text-authored research-feed summaries (keyed by PMID); optional. When absent, cards
// fall back to the mechanical abstract split so every card still shows a 4-section summary.
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

// One observation per matching signature row.
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
    condition: (e["Condition"] || "—").trim(),
    direction: dir,
    w,
    pmid: st,
    site: (e["Body site"] || "").trim(),
    host: (e["Host species"] || "").trim(),
    seq: (e["Sequencing type"] || "").trim(),
    region: (e["16S variable region"] || "").trim(),
    design: (study["Study design"] || "").trim(),
    n0: e["Group 0 sample size"], n1: e["Group 1 sample size"],
    title: (study["Title"] || "").trim(),
    journal: (study["Journal"] || "").trim(),
    year: (study["Year"] || "").trim(),
    paper: (study["URL"] || "").trim() || (study["DOI"] ? "https://doi.org/" + study["DOI"].trim() : ""),
  });
}

// Group per condition, keeping every observation for the study drawer.
const byCond = new Map();
for (const o of obs) {
  let g = byCond.get(o.condition);
  if (!g) { g = { condition: o.condition, items: [], dirs: new Set() }; byCond.set(o.condition, g); }
  g.items.push(o);
  g.dirs.add(o.direction);
}
// Interpretive caveats per study — Bilophila is a real gut resident, so these are about
// method/abundance/host, not contamination.
const perStudyCaveats = (o) => {
  const c = [];
  if (/16S|PCR/i.test(o.seq)) c.push("marker-gene method: species-level Bilophila call is approximate");
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
  const signal = best.w * 0.6 + Math.min(nStudies, 3) / 3 * 0.4; // evidence strength, not a measured effect size
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

// Honest, data-derived directional agreement + tier (no hardcoding).
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

// ---------- Overview ----------
H += `<h2 class="wp-block-heading" id="h-overview">Overview</h2>`;
H += P(`<em>Bilophila wadsworthia</em> is a Gram-negative, strictly anaerobic rod and a bile-loving member of the human gut microbiota. Its name means “bile-loving,” and it was first recovered from gangrenous and perforated appendicitis specimens, and from normal stool, at the Wadsworth anaerobe laboratory.${cite("baron")} It is a low-abundance but widespread gut resident in the family Desulfovibrionaceae (Deltaproteobacteria). On this database it surfaces as a differentially abundant taxon across dozens of human microbiome studies, where its meaning is tied closely to one thing: the host's supply of organic sulfur.`);
H += P(`What makes <em>B. wadsworthia</em> distinctive is how it earns its living. Rather than fermenting sugars, it respires the sulfonate group of taurine-conjugated bile acids, reducing it to hydrogen sulfide.${cite("laue", "peck")} A diet high in saturated (milk-derived) animal fat shifts the liver toward taurine-conjugated bile acids, delivering that organic sulfur to the distal gut and letting <em>B. wadsworthia</em> bloom, a shift linked to inflammation and colitis in susceptible hosts.${cite("devkota")} That diet → bile-acid → sulfur → sulfide axis is exactly the ${dlink("/definition/nutritional-immunity/", "nutritional immunity")} lens this database reads it through: <em>B. wadsworthia</em> is less a fixed marker of any one disease than a readout of the gut's fat-and-bile environment.`);

// Morphology
H += `<h3 class="wp-block-heading" id="h-morphology"><strong>Morphology</strong></h3>`;
H += P(`A Gram-negative, strictly anaerobic, non-fermentative (asaccharolytic) rod that grows slowly on blood-based anaerobic media and is stimulated by bile, the trait behind its name.${cite("baron")} It is strongly catalase-positive and urease-positive, reduces nitrate, and has a DNA G+C content of about 39 to 40 mol%.${cite("baron")} It belongs to the Desulfovibrionaceae, the family of intestinal sulfur-respiring bacteria, but unlike classic sulfate reducers it does not reduce sulfate; its electron sinks are sulfite, thiosulfate, and the organic sulfonates of bile.${cite("baron", "laue")}`);

// Metabolism & the H2S engine
H += `<h3 class="wp-block-heading" id="h-metabolism"><strong>Metabolism &amp; the H₂S engine</strong></h3>`;
H += P(`<em>B. wadsworthia</em>'s defining feature is anaerobic respiration of organic sulfur. It takes up taurine (2-aminoethanesulfonate) and related sulfonates, deaminates taurine to sulfoacetaldehyde, reduces that to isethionate, then cleaves isethionate with a glycyl-radical enzyme (isethionate sulfite-lyase) to release sulfite; a dissimilatory sulfite reductase then reduces the sulfite to hydrogen sulfide.${cite("peck", "laue")} The pathway runs on an iron-dependent respiratory chain (menaquinone and cytochrome c), so the organism's core chemistry is a metalloenzyme cascade that turns dietary and bile-derived sulfur into H₂S.${cite("laue")} Because taurine-conjugated bile acids are the richest gut source of that organic sulfur, the size of the <em>B. wadsworthia</em> population tracks the host's bile-acid conjugation state.${cite("devkota")}`);

// Pathogenicity
H += `<h3 class="wp-block-heading" id="h-pathogenicity"><strong>Pathogenicity</strong></h3>`;
H += P(`<em>B. wadsworthia</em> is a pathobiont: a normal low-abundance resident that becomes harmful when it blooms. It was first isolated as a major anaerobe of perforated and gangrenous appendicitis,${cite("baron")} and it can cause abscesses and bacteremia. Its microbiome-medicine relevance, though, is the bloom. In genetically susceptible (Il10-deficient) mice, a saturated-fat diet expanded <em>B. wadsworthia</em> and triggered a T helper type 1 inflammatory response and colitis, an effect reproduced simply by feeding taurocholic acid.${cite("devkota")} A bloom also aggravates high-fat-diet metabolic dysfunction, worsening inflammation, gut-barrier integrity, glucose control, and hepatic steatosis.${cite("natividad")} As with any differential-abundance signal, an appearance in a gut study is an ecological association shaped by diet, not evidence of infection.`);

// Virulence Factors (table)
H += `<h3 class="wp-block-heading" id="h-virulence-factors"><strong>Virulence Factors</strong></h3>`;
H += P(`<em>B. wadsworthia</em>'s harms come less from classical toxins than from its metabolic output and its tolerance of the bile-rich distal gut. Several factors below (taurine respiration, the sulfite-to-sulfide step) are the same sulfur machinery detailed under Metabolism, which ties its chemistry directly to its pathology.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Virulence factor</th><th>Description and role</th></tr></thead><tbody>`
  + `<tr><td>${mred("Hydrogen sulfide (H₂S)")}</td><td>The organism's main respiratory product. At the concentrations found in the large intestine, H₂S is genotoxic to colonic epithelial cells and erodes the protective mucus barrier, and it is implicated in ulcerative colitis and colorectal cancer.${cite("peck", "attene")}</td></tr>`
  + `<tr><td>${mred("Bile tolerance")}</td><td>Grows in concentrations of bile that inhibit most anaerobes, letting it colonize the bile-rich distal small bowel and colon and exploit taurine-conjugated bile acids as a nutrient.${cite("baron", "devkota")}</td></tr>`
  + `<tr><td>${mred("Taurine / sulfonate respiration")}</td><td>The isethionate sulfite-lyase (glycyl-radical enzyme) pathway converts bile-derived taurine into sulfite and then H₂S, the metabolic engine behind its inflammatory effects.${cite("peck")}</td></tr>`
  + `<tr><td>${mred("Lipopolysaccharide / Th1 activation")}</td><td>As a Gram-negative pathobiont, a bloom drives a pro-inflammatory T helper type 1 immune response, the proximal cause of diet-induced colitis in susceptible hosts.${cite("devkota")}</td></tr>`
  + `</tbody></table></figure>`;

// Vulnerabilities (table)
H += `<h3 class="wp-block-heading" id="h-vulnerabilities"><strong>Vulnerabilities</strong></h3>`;
H += P(`Read through the nutritional-immunity lens, <em>B. wadsworthia</em>'s dependence on host-supplied organic sulfur is also its weakness. Where a metal-scavenging pathogen is starved by withholding metals, this organism is <em>fed</em> by the diet; cut the supply line and the bloom collapses.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Weak point</th><th>Why it is exploitable</th></tr></thead><tbody>`
  + `<tr><td>${mred("Saturated-fat dependence")}</td><td>The bloom is driven by milk-derived saturated fat acting through taurine-conjugated bile acids; lowering that fat load reduces the taurocholate that feeds it.${cite("devkota")}</td></tr>`
  + `<tr><td>${mred("Bile-acid conjugation")}</td><td>Taurine (not glycine) conjugation supplies the organic sulfur, so shifting hepatic conjugation away from taurocholate starves the H₂S pathway. This is the mechanistic lever behind the diet effect.${cite("devkota", "devkotarev")}</td></tr>`
  + `<tr><td>${mred("Competitive suppression")}</td><td>In high-fat-fed mice, the probiotic <em>Lactobacillus rhamnosus</em> CNCM I-3690 limited <em>B. wadsworthia</em> expansion and reduced the associated inflammation and barrier dysfunction, a proof of concept for crowding it out.${cite("natividad")}</td></tr>`
  + `</tbody></table></figure>`;

// ---------- Interventions ----------
H += `<h2 class="wp-block-heading" id="h-interventions">Interventions</h2>`;
H += P(`For a pathobiont, an “intervention” is anything that constrains its bloom or blunts its harm. Everything below is research-stage or dietary and is <strong>not</strong> medical advice; each is classified by ${dlink("/our-validation-method/", "our validation method")} as Validated, Promising Candidate, or Validation In Progress. The through-line is the sulfur supply line: starve <em>B. wadsworthia</em> of the taurine-conjugated bile acids it feeds on.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Intervention</th><th>Class</th><th>Status</th></tr></thead><tbody>`
  + `<tr><td>Saturated / animal-fat restriction</td><td>Diet</td><td>Validation In Progress</td></tr>`
  + `<tr><td>Bile-acid conjugation modulation</td><td>Concept</td><td>Validation In Progress</td></tr>`
  + `<tr><td><em>Lactobacillus rhamnosus</em> CNCM I-3690</td><td>Probiotic</td><td>Validation In Progress</td></tr>`
  + `</tbody></table></figure>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">How do these act on B. wadsworthia?</span></summary><figure class="wp-block-table"><table class="has-fixed-layout"><tbody>`
  + `<tr><td><strong>Intervention</strong></td><td><strong>Mechanism</strong></td></tr>`
  + `<tr><td>Saturated / animal-fat restriction</td><td>Fewer taurine-conjugated bile acids reach the distal gut, cutting the organic sulfur <em>B. wadsworthia</em> respires and the H₂S it makes.${cite("devkota")}</td></tr>`
  + `<tr><td>Bile-acid conjugation modulation</td><td>Shifting hepatic conjugation away from taurocholate removes the taurine-derived sulfur that fuels the pathway.${cite("devkota")}</td></tr>`
  + `<tr><td><em>Lactobacillus rhamnosus</em> CNCM I-3690</td><td>Limits <em>B. wadsworthia</em> expansion and reduces inflammation and gut-barrier dysfunction in high-fat-fed mice.${cite("natividad")}</td></tr>`
  + `</tbody></table></figure></details>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">What should be avoided (STOP)?</span></summary>`
  + P(`In susceptible hosts, chronic high intake of saturated (milk-derived) animal fat is the exposure most consistently linked to a <em>B. wadsworthia</em> bloom, because it drives the taurocholic acid that feeds it.${cite("devkota")} The direct causal evidence is from mouse models, so this is a mechanism to weigh, not a clinical prescription.`)
  + `</details>`;

// ---------- Conditions (data-derived) ----------
H += `<h2 class="wp-block-heading" id="h-conditions">Conditions</h2>`;
H += P(`Where <em>B. wadsworthia</em> (NCBI:txid${TAXON.taxid}) appears as a differentially abundant taxon across the Microbiome Medicine corpus. Each row aggregates every experiment in which the organism moved in a given condition; <em>direction</em> is its change in the case/exposure group, and <em>grade</em> is the strongest single study's methodology weight (A·D·S·C·R), the same engine that grades every signature on this site.`);
H += P(`Across <strong>${conds.length}</strong> conditions and <strong>${allByPmid.size}</strong> studies, the signal is ${mixDesc}: enriched in ${nEnriched}, depleted in ${nDepleted}, and direction-conflicting in ${nMixed} (directional agreement ${agreement}). Because <em>B. wadsworthia</em> is a diet-responsive pathobiont, its direction in any one condition often reflects the cohort's saturated-fat and bile-acid environment as much as the disease itself, so the aggregate evidence tier is <strong>${tier}</strong>.`);
H += `<div class="mbio-note"><p><span class="mbio-note__lead">How to read these.</span> <em>B. wadsworthia</em> is a genuine, if low-abundance, member of the gut microbiota, so these signals are ecologically real rather than contamination artifacts. The caveat is interpretive: it is a diet-responsive pathobiont whose abundance tracks saturated-fat intake and taurine-conjugated bile acids, so an enrichment in a given condition may reflect the cohort's diet as much as the disease. Species-level 16S assignments and very low abundances still warrant caution. This is why the direction can conflict between cohorts and the aggregate tier stays ${tier}.</p></div>`;
H += `<!--CONDITIONS_TABLE-->`;

// ---------- FAQs ----------
H += `<h2 class="wp-block-heading" id="h-faqs">FAQs</h2>`;
// Taxon-specific FAQs written around what people actually search for this organism (good or
// bad, what raises it, how to lower it, what it is linked to). Answers are HTML and carry
// proper inline citations via cite() (superscript reference links), so they are NOT esc()'d.
const FAQ = [
  ["Is Bilophila wadsworthia good or bad?", `Neither on its own. <em>B. wadsworthia</em> is a normal low-abundance gut resident that behaves as a pathobiont: mostly harmless at baseline, but able to drive inflammation when a high-fat diet lets it bloom and produce hydrogen sulfide.${cite("devkota", "peck")} Its effect depends on how much of it is present and what is feeding it.`],
  ["What causes high Bilophila wadsworthia?", `A diet high in saturated, milk-derived animal fat. That fat shifts the liver toward taurine-conjugated bile acids, which deliver the organic sulfur <em>B. wadsworthia</em> respires, letting it expand.${cite("devkota")} Its numbers track the host's fat-and-bile-acid environment more than any single disease.`],
  ["How do you lower Bilophila wadsworthia?", `By cutting its food supply. Lowering saturated animal-fat intake reduces the taurine-conjugated bile acids it feeds on,${cite("devkota")} and in mice the probiotic <em>Lactobacillus rhamnosus</em> CNCM I-3690 limited its expansion and the inflammation that came with it.${cite("natividad")} These are research-stage findings, not medical advice.`],
  ["What is Bilophila wadsworthia associated with?", `It was first isolated from appendicitis,${cite("baron")} and in models a bloom is linked to colitis and to high-fat-diet metabolic problems such as worse glucose control and fatty liver.${cite("devkota", "natividad")} Across human studies its direction is mixed and diet-dependent, so an association is not proof that it causes a given condition.`],
];
H += `<div class="rgbc-faq-block">`;
for (const [q, a] of FAQ) {
  H += `<details class="rgbc-faq-item"><summary><span class="rgbc-faq-icon"></span><span class="rgbc-faq-q">${esc(q)}</span></summary><div class="rgbc-faq-a"><strong>Quick answer:</strong> ${a}</div></details>`;
}
H += `</div>`;

// ---------- Research Feed (built from studies.csv) ----------
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
// The expanded card body = the 4-section summary as h4. Prefer a full-text-authored summary;
// otherwise fall back to the mechanical abstract split so every card still has a summary.
const to4 = (html) => html.replace(/<h3\b[^>]*>/g, `<h4 class="wp-block-heading">`).replace(/<\/h3>/g, "</h4>");
const cardSummary = (pmid, abstract) => {
  if (AUTHORED[pmid]) return to4(sectionsToHtml(AUTHORED[pmid].sections));
  const sec = abstractToSections(abstract);
  return sec ? to4(sectionsToHtml(sec)) : "";
};

const rfStudies = studies
  .filter((s) => (s["Title"] || "").trim())
  .sort((a, b) => (+b["Year"] || 0) - (+a["Year"] || 0));
H += `<h2 class="wp-block-heading" id="h-research-feed">Research Feed</h2>`;
H += P(`Internal summaries of the ${rfStudies.length} studies we reviewed in which <em>B. wadsworthia</em> was a differential taxon across this corpus.`);
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
  // Canonical endo card: title is a NON-LINK <div>; header toggles the accordion; footer
  // "Open" is the only link to the summary page.
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
H += `<div class="mbio-update-history"><div class="mbio-update-history__content"><article class="mbio-card"><div class="mbio-card__border"></div><p class="mbio-card__date">2026-07-04</p><span class="mbio-card__title">Bilophila wadsworthia <span class="mbio-card__type btn btn--rounded">major</span></span><div class="mbio-card__content"><p class="wp-block-paragraph">Taxon page created: biology (morphology, sulfur metabolism, pathogenicity), virulence factors, diet and bile-acid vulnerabilities, research-stage interventions, the data-derived Conditions table across ${conds.length} conditions, and the full research feed.</p></div></article></div></div>`;

// ---------- References ----------
H += `<h2 class="wp-block-heading" id="h-references">References</h2><ol class="rgbc-references">`;
for (const k of order) {
  const r = R[k];
  H += `<li class="rgbc-references__item" id="ref-${k}"><a class="rgbc-references__link" href="${r.url}" target="_blank">${esc(r.name)}</a> ${esc(r.authors)} <span>(${esc(r.date)})</span></li>`;
}
H += `</ol>`;
for (const k of order) {
  const r = R[k];
  H += `<div class="tooltip rgbc-reference-tooltip wiki-ref-${k}"><div class="tooltip__content rgbc-reference-tooltip__content"><p>${esc(r.authors)}</p><a href="${r.url}" target="_blank">${esc(r.name)}</a><p>${esc(r.date)}</p></div></div>`;
}

// ================================= meta + emit ==========================================
const meta = {
  did_you_know: "Bilophila wadsworthia is a 'bile-loving' gut microbe that eats the sulfur in taurine-conjugated bile acids. A diet high in saturated animal fat can make it bloom and produce hydrogen sulfide, a gas that is genotoxic to the colon lining.",
  authors: [{ name: "Karen Pendergrass", orcid: "https://orcid.org/0000-0002-2348-7259", avatar: "https://secure.gravatar.com/avatar/104bc2e8ba283fda6309c14b2eca02fe9612e8793ed62621c691e83230d4a963?s=96&d=mm&r=g" }],
  conditions: conditionsData,
};
const excerpt_html = "<p>Bilophila wadsworthia is a bile-loving, sulfite-reducing gut pathobiont. It turns the organic sulfur in taurine-conjugated bile acids into hydrogen sulfide, and a diet high in saturated animal fat can make it bloom, linking it to inflammation, colitis, and metabolic dysfunction.</p>";

console.log(`content_html: ${H.length} chars · refs: ${order.length} · conditions: ${conds.length} (↑${nEnriched} ↓${nDepleted} ↕${nMixed}) · agreement ${agreement} tier ${tier} · RF studies: ${rfStudies.length}`);

const jsonIdx = process.argv.indexOf("--json");
if (jsonIdx >= 0 && process.argv[jsonIdx + 1]) {
  const out = { slug: TAXON.slug, title: TAXON.title, type: "microbe", excerpt_html, content_html: H, meta, modified_at: "2026-07-04T00:00:00.000Z" };
  writeFileSync(process.argv[jsonIdx + 1], JSON.stringify(out, null, 2));
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
  // Use the authored, full-question summaries (authored.json) for the standalone research-feed
  // pages, not just the taxon-page cards. Applies to newly created rows here; already-existing
  // pages are refreshed in the loop after.
  const titleToPmid = new Map(studies.map((st) => [(st["Title"] || "").trim(), (st["PMID"] || st["Study page name"] || "").trim()]));
  for (const r of rfRows) {
    const p = titleToPmid.get(r.title);
    if (AUTHORED[p]) { r.content_html = sectionsToHtml(AUTHORED[p].sections); r.excerpt_html = AUTHORED[p].excerpt; }
  }
  if (rfRows.length) {
    const { data: maxRf } = await db.from("content_items").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
    let nid = Number(maxRf?.id) || 990200;
    for (const r of rfRows) {
      nid++;
      const { error } = await db.from("content_items").insert({ id: nid, type: "research-feed", slug: r.slug, title: r.title, content_html: r.content_html, excerpt_html: r.excerpt_html, meta: r.meta, status: "publish", published_at: r.published_at || now, modified_at: now });
      if (error) console.log(`RF insert ERROR (${r.slug}): ${error.message}`);
    }
    console.log(`research-feed: created ${rfRows.length} new page(s), reused ${studies.length - rfRows.length}`);
  } else {
    console.log(`research-feed: all ${studies.length} studies already have pages (reused)`);
  }
  // Refresh already-existing research-feed pages we own (slug = slugify(title)) to the authored summary.
  let rfUpdated = 0;
  for (const s of studies) {
    const title = (s["Title"] || "").trim(); if (!title) continue;
    const pmid = (s["PMID"] || s["Study page name"] || "").trim();
    if (!AUTHORED[pmid]) continue;
    const { data: upd, error } = await db.from("content_items")
      .update({ content_html: sectionsToHtml(AUTHORED[pmid].sections), excerpt_html: AUTHORED[pmid].excerpt, modified_at: now })
      .eq("type", "research-feed").eq("slug", slugify(title)).select("id");
    if (error) console.log(`RF update ERROR (${slugify(title)}): ${error.message}`);
    else if (upd?.length) rfUpdated += upd.length;
  }
  console.log(`research-feed: refreshed ${rfUpdated} page(s) with authored summaries`);

  const { data: existing } = await db.from("content_items").select("id").eq("type", "microbe").eq("slug", TAXON.slug).maybeSingle();
  if (existing) {
    const { error } = await db.from("content_items").update({ title: TAXON.title, content_html: H, excerpt_html, meta, modified_at: now }).eq("id", existing.id);
    console.log(error ? "update ERROR: " + error.message : `updated -> microbe#${existing.id} (${TAXON.slug})`);
  } else {
    const { data: maxRow } = await db.from("content_items").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
    const id = (Number(maxRow?.id) || 990100) + 1;
    const { error } = await db.from("content_items").insert({ id, type: "microbe", slug: TAXON.slug, title: TAXON.title, content_html: H, excerpt_html, meta, status: "publish", published_at: now, modified_at: now });
    console.log(error ? "insert ERROR: " + error.message : `inserted -> microbe#${id} (${TAXON.slug})`);
  }
}
