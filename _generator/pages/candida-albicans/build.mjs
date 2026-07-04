// Build the "Candida albicans" TAXON page — same universal pattern as the other taxa:
// hand-authored, PubMed-verified Overview + a DATA-DERIVED Conditions section that joins the
// three CSVs on the taxon's NCBI taxid (5476) using lib/grade.mjs (w = A·D·S·C·R).
// Candida is a fungus, so the Overview is fungus-appropriate (dimorphism, antifungal
// resistance, candidalysin, metal scavenging).
//
// Sidebar: Overview (Morphology, Antifungal Resistance, Pathogenicity, Virulence Factors,
// Metallomics, Vulnerabilities) · Interventions · Conditions · FAQs · Research Feed ·
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
const SAMPLES = join(HERE, "../../samples/candida-albicans");

const TAXON = {
  taxid: "5476",
  species: "Candida albicans",
  genus: "Candida",
  slug: "candida-albicans",
  title: "Candida albicans",
};

// ================= references (verified via PubMed — author-safe) =========================
const R = {
  mayer: { name: "Candida albicans pathogenicity mechanisms.", authors: "Mayer FL, Wilson D, Hube B.", date: "Virulence. 2013", url: "https://doi.org/10.4161/viru.22913" },
  moyes: { name: "Candidalysin is a fungal peptide toxin critical for mucosal infection.", authors: "Moyes DL, Wilson D, Richardson JP, et al.", date: "Nature. 2016", url: "https://doi.org/10.1038/nature17625" },
  citiulo: { name: "Candida albicans scavenges host zinc via Pra1 during endothelial invasion.", authors: "Citiulo F, Jacobsen ID, Miramon P, et al.", date: "PLoS Pathog. 2012", url: "https://doi.org/10.1371/journal.ppat.1002777" },
  pristov: { name: "Resistance of Candida to azoles and echinocandins worldwide.", authors: "Pristov KE, Ghannoum MA.", date: "Clin Microbiol Infect. 2019", url: "https://doi.org/10.1016/j.cmi.2019.03.028" },
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
// C. albicans is a real mycobiome member; caveats are about method/abundance/host.
const perStudyCaveats = (o) => {
  const c = [];
  if (/16S/i.test(o.seq)) c.push("16S targets bacteria; fungal abundance is under-sampled and method-dependent");
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
H += P(`<em>Candida albicans</em> is a dimorphic fungus and one of the most common members of the human mycobiome, a normal commensal of the mouth, gut, and vagina in most healthy people.${cite("mayer")} It is also the leading cause of human fungal disease, from superficial thrush to life-threatening invasive candidiasis in immunocompromised hosts.${cite("mayer")} On this database it appears as a differentially abundant taxon across many human microbiome studies, where its meaning turns on the balance between harmless colonization and opportunistic overgrowth.`);
H += P(`What makes <em>C. albicans</em> distinctive is its shape-shifting. It switches reversibly between a rounded yeast form and invasive filamentous hyphae, and that yeast-to-hypha transition is the master switch of its virulence: hyphae invade tissue, resist immune cells, and secrete the peptide toxin candidalysin.${cite("moyes", "mayer")} Like bacterial pathogens, it must also win the fight for host metals, so the ${dlink("/definition/nutritional-immunity/", "nutritional immunity")} lens this database reads pathogens through applies to the fungus too, and it is where some of its most exploitable dependencies lie.${cite("citiulo")}`);

H += `<h3 class="wp-block-heading" id="h-morphology"><strong>Morphology</strong></h3>`;
H += P(`<em>C. albicans</em> is a polymorphic fungus that grows as budding yeast (oval blastospores), pseudohyphae, and true hyphae, switching between these forms in response to temperature, pH, serum, and nutrient cues.${cite("mayer")} The reversible yeast-to-hypha transition is central to both commensalism and disease: the yeast form favors colonization and spread, while hyphae drive tissue invasion and damage.${cite("mayer")} It also undergoes phenotypic (white-opaque) switching and builds structured biofilms on mucosa and medical devices.${cite("mayer")}`);

H += `<h3 class="wp-block-heading" id="h-antifungal-resistance"><strong>Antifungal Resistance</strong></h3>`;
H += P(`The clinical antifungal classes for <em>C. albicans</em> are the azoles, which block ergosterol synthesis, and the echinocandins, which block cell-wall glucan synthesis.${cite("pristov")} Resistance is rising worldwide: azole resistance arises through <em>ERG11</em> target changes and up-regulated efflux pumps, and echinocandin resistance through <em>FKS</em> mutations, narrowing options and complicating hospital care.${cite("pristov")} As with antibacterial resistance, this is the clinically decisive dimension; this page describes the organism's biology and its microbiome associations, not a treatment protocol.`);

H += `<h3 class="wp-block-heading" id="h-pathogenicity"><strong>Pathogenicity</strong></h3>`;
H += P(`<em>C. albicans</em> is the archetypal opportunist: a harmless commensal in most people that turns pathogenic when host defenses or the competing microbiota are disturbed.${cite("mayer")} It causes superficial mucosal disease (oral and vaginal thrush) when the local balance shifts, and invasive, often bloodstream, candidiasis with high mortality in immunocompromised, intensive-care, and catheterized patients.${cite("mayer")} A differential-abundance signal in a gut or mucosal study reflects a shift in colonization, not necessarily infection.`);

H += `<h3 class="wp-block-heading" id="h-virulence-factors"><strong>Virulence Factors</strong></h3>`;
H += P(`<em>C. albicans</em> pairs its morphological switch with a toolkit of adhesion, invasion, and damage factors. The most striking is candidalysin, the first true peptide toxin identified in a human fungal pathogen.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Virulence factor</th><th>Description and role</th></tr></thead><tbody>`
  + `<tr><td>${mred("Candidalysin")}</td><td>A cytolytic peptide toxin secreted by hyphae (from the <em>ECE1</em> gene) that directly damages epithelial membranes and triggers host danger signaling; strains lacking it are avirulent in mucosal-infection models.${cite("moyes")}</td></tr>`
  + `<tr><td>${mred("Yeast-to-hypha transition")}</td><td>The reversible morphological switch is the master virulence program: hyphae invade epithelium, resist phagocytes, and deliver candidalysin.${cite("moyes", "mayer")}</td></tr>`
  + `<tr><td>${mred("Adhesins and invasins (Als family, Hwp1)")}</td><td>Cell-surface proteins mediate adhesion to host cells and induced endocytosis, the first steps of tissue invasion.${cite("mayer")}</td></tr>`
  + `<tr><td>${mred("Secreted aspartyl proteases (Saps)")}</td><td>A family of secreted hydrolases that degrade host proteins, supporting invasion, nutrient acquisition, and immune evasion.${cite("mayer")}</td></tr>`
  + `<tr><td>${mred("Biofilm formation")}</td><td>Structured biofilms on mucosa and catheters resist antifungals and immune clearance, a major driver of device-associated candidiasis.${cite("mayer")}</td></tr>`
  + `</tbody></table></figure>`;

H += `<h3 class="wp-block-heading" id="h-metallomics"><strong>Metallomics</strong></h3>`;
H += P(`The host defends by withholding metals (nutritional immunity); <em>C. albicans</em> carries scavenging systems for each, and these dependencies are among its more druggable weak points.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Metal / ion</th><th>Key features in <em>C. albicans</em></th></tr></thead><tbody>`
  + `<tr><td>${mred("Zinc (Zn)")}</td><td>The fungus secretes the zincophore <em>Pra1</em>, which scavenges host zinc and returns it to the surface transporter Zrt1; deleting Pra1 blocks zinc capture and host-cell damage when zinc is scarce, a fungal counterpart to bacterial metal piracy.${cite("citiulo")}</td></tr>`
  + `<tr><td>${mred("Iron (Fe)")}</td><td>Reductive, siderophore-uptake, and heme-uptake systems extract iron from a host that actively withholds it via transferrin and lactoferrin; iron acquisition is required for full virulence.${cite("mayer")}</td></tr>`
  + `<tr><td>${mred("Copper and manganese")}</td><td>Copper and manganese homeostasis supports the superoxide-dismutase defenses that let the fungus survive the phagocyte oxidative burst, part of withstanding host metal restriction.${cite("mayer")}</td></tr>`
  + `</tbody></table></figure>`;

H += `<h3 class="wp-block-heading" id="h-vulnerabilities"><strong>Vulnerabilities</strong></h3>`;
H += P(`Read through the nutritional-immunity and ecology lenses, <em>C. albicans</em>'s dependencies are also its openings.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Weak point</th><th>Why it is exploitable</th></tr></thead><tbody>`
  + `<tr><td>${mred("Antifungal drug targets")}</td><td>Ergosterol synthesis (azoles) and cell-wall glucan synthesis (echinocandins) are validated, if resistance-pressured, drug targets.${cite("pristov")}</td></tr>`
  + `<tr><td>${mred("Metal scavenging")}</td><td>Because the fungus must scavenge host zinc and iron, reinforcing metal withholding (calprotectin, lactoferrin) attacks a load-bearing system, for example by blocking Pra1-mediated zinc capture.${cite("citiulo")}</td></tr>`
  + `<tr><td>${mred("Loss of colonization resistance")}</td><td>A healthy bacterial microbiota keeps <em>C. albicans</em> in check; losing that competition, classically after broad-spectrum antibiotics, is a common trigger for overgrowth, so restoring competition is a microbiome-level lever.${cite("mayer")}</td></tr>`
  + `</tbody></table></figure>`;

// ---------- Interventions ----------
H += `<h2 class="wp-block-heading" id="h-interventions">Interventions</h2>`;
H += P(`For an opportunistic fungus, an intervention is anything that keeps it in its commensal lane or clears overgrowth. Clinical antifungals are managed by clinicians; each entry below is classified by ${dlink("/our-validation-method/", "our validation method")}, and this is <strong>not</strong> medical advice. The microbiome through-lines are colonization resistance and nutritional immunity.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Intervention</th><th>Class</th><th>Status</th></tr></thead><tbody>`
  + `<tr><td>Azole / echinocandin antifungals</td><td>Drug</td><td>Validated</td></tr>`
  + `<tr><td>Colonization resistance (healthy microbiota)</td><td>Concept</td><td>Validation In Progress</td></tr>`
  + `<tr><td>Metal (zinc / iron) withholding support</td><td>Concept</td><td>Validation In Progress</td></tr>`
  + `</tbody></table></figure>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">How do these act on C. albicans?</span></summary><figure class="wp-block-table"><table class="has-fixed-layout"><tbody>`
  + `<tr><td><strong>Intervention</strong></td><td><strong>Mechanism</strong></td></tr>`
  + `<tr><td>Azole / echinocandin antifungals</td><td>Azoles block ergosterol synthesis; echinocandins block cell-wall glucan synthesis. Rising resistance makes susceptibility testing important.${cite("pristov")}</td></tr>`
  + `<tr><td>Colonization resistance</td><td>A healthy bacterial community competes with <em>C. albicans</em> and limits overgrowth; antibiotic disruption is a classic trigger.${cite("mayer")}</td></tr>`
  + `<tr><td>Metal withholding support</td><td>Reinforcing host zinc and iron sequestration denies the fungus metals it must scavenge, for example via Pra1.${cite("citiulo")}</td></tr>`
  + `</tbody></table></figure></details>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">What should be avoided (STOP)?</span></summary>`
  + P(`Unnecessary broad-spectrum antibiotics, which strip the competing bacteria that hold <em>C. albicans</em> in check and are a well-recognized precipitant of overgrowth.${cite("mayer")}`)
  + `</details>`;

// ---------- Conditions (data-derived) ----------
H += `<h2 class="wp-block-heading" id="h-conditions">Conditions</h2>`;
H += P(`Where <em>C. albicans</em> (NCBI:txid${TAXON.taxid}) appears as a differentially abundant taxon across the Microbiome Medicine corpus. Each row aggregates every experiment in which the organism moved in a given condition; <em>direction</em> is its change in the case/exposure group, and <em>grade</em> is the strongest single study's methodology weight (A·D·S·C·R), the same engine that grades every signature on this site.`);
H += P(`Across <strong>${conds.length}</strong> conditions and <strong>${allByPmid.size}</strong> studies, the signal is ${mixDesc}: enriched in ${nEnriched}, depleted in ${nDepleted}, and direction-conflicting in ${nMixed} (directional agreement ${agreement}). Because <em>C. albicans</em> is an opportunist whose abundance tracks disturbances to the competing microbiota, its direction in any one condition often reflects the state of that community as much as the disease itself, so the aggregate evidence tier is <strong>${tier}</strong>.`);
H += `<div class="mbio-note"><p><span class="mbio-note__lead">How to read these.</span> <em>C. albicans</em> is a genuine member of the human mycobiome, so these signals are ecologically real. Two interpretive caveats apply. Most microbiome studies target bacteria (16S) and detect fungi only incidentally, so fungal abundance is often under-sampled and method-dependent. And because <em>C. albicans</em> is an opportunist, an enrichment may reflect a disturbed community, for example after antibiotics, rather than the disease itself. This is why direction can conflict between cohorts and the aggregate tier stays ${tier}.</p></div>`;
H += `<!--CONDITIONS_TABLE-->`;

// ---------- FAQs ----------
H += `<h2 class="wp-block-heading" id="h-faqs">FAQs</h2>`;
const FAQ = [
  ["Is Candida albicans an infection or normal?", `Usually normal. <em>C. albicans</em> is a common commensal of the mouth, gut, and vagina in healthy people, and it only becomes an infection when it overgrows or invades, typically when immunity or the competing microbiota is disturbed.${cite("mayer")}`],
  ["What causes Candida albicans overgrowth?", `A disturbed balance. Broad-spectrum antibiotics that strip competing bacteria, immune suppression, and other disruptions let the fungus expand from harmless yeast into invasive hyphae.${cite("mayer", "moyes")} An enrichment signal in a study often reflects that disturbed community as much as any single disease.`],
  ["Is Candida albicans in the gut dangerous?", `Not on its own. Gut <em>C. albicans</em> is a normal low-level resident; it becomes a concern mainly when overgrowth or a breached barrier lets it disseminate in vulnerable patients.${cite("mayer")} A differential-abundance signal is an ecological shift, not a diagnosis of infection.`],
  ["How is Candida albicans treated?", `Clinical candidiasis is treated by clinicians with antifungals, mainly azoles and echinocandins, guided by susceptibility because resistance is rising.${cite("pristov")} This page covers the organism's biology and its microbiome associations, not a treatment protocol.`],
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
H += P(`Internal summaries of the ${rfStudies.length} studies we reviewed in which <em>C. albicans</em> was a differential taxon across this corpus.`);
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
H += `<div class="mbio-update-history"><div class="mbio-update-history__content"><article class="mbio-card"><div class="mbio-card__border"></div><p class="mbio-card__date">2026-07-04</p><span class="mbio-card__title">Candida albicans <span class="mbio-card__type btn btn--rounded">major</span></span><div class="mbio-card__content"><p class="wp-block-paragraph">Taxon page created: biology (morphology and dimorphism, antifungal resistance, pathogenicity), virulence factors including candidalysin, metal-scavenging and nutritional-immunity vulnerabilities, interventions, the data-derived Conditions table across ${conds.length} conditions, and the full research feed.</p></div></article></div></div>`;

// ---------- References ----------
H += `<h2 class="wp-block-heading" id="h-references">References</h2><ol class="rgbc-references">`;
for (const k of order) { const r = R[k]; H += `<li class="rgbc-references__item" id="ref-${k}"><a class="rgbc-references__link" href="${r.url}" target="_blank">${esc(r.name)}</a> ${esc(r.authors)} <span>(${esc(r.date)})</span></li>`; }
H += `</ol>`;
for (const k of order) { const r = R[k]; H += `<div class="tooltip rgbc-reference-tooltip wiki-ref-${k}"><div class="tooltip__content rgbc-reference-tooltip__content"><p>${esc(r.authors)}</p><a href="${r.url}" target="_blank">${esc(r.name)}</a><p>${esc(r.date)}</p></div></div>`; }

// ================================= meta + emit ==========================================
const meta = {
  did_you_know: "Candida albicans is a shape-shifter: it lives peacefully as a round yeast, but can switch into invasive threads (hyphae) that stab into tissue and release a toxin called candidalysin.",
  authors: [{ name: "Karen Pendergrass", orcid: "https://orcid.org/0000-0002-2348-7259", avatar: "https://secure.gravatar.com/avatar/104bc2e8ba283fda6309c14b2eca02fe9612e8793ed62621c691e83230d4a963?s=96&d=mm&r=g" }],
  conditions: conditionsData,
};
const excerpt_html = "<p>Candida albicans is a dimorphic fungus and common human commensal that turns opportunistic pathogen when it overgrows. Its yeast-to-hypha switch, the toxin candidalysin, and its scavenging of host zinc and iron drive disease, and each is a potential weak point.</p>";

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
    let nid = Number(maxRf?.id) || 990300;
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
    const id = (Number(maxRow?.id) || 990300) + 1;
    const { error } = await db.from("content_items").insert({ id, type: "microbe", slug: TAXON.slug, title: TAXON.title, content_html: H, excerpt_html, meta, status: "publish", published_at: now, modified_at: now });
    console.log(error ? "insert ERROR: " + error.message : `inserted -> microbe#${id} (${TAXON.slug})`);
  }
}
