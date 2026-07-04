// Build the "Acinetobacter baumannii" TAXON page — modelled on the
// mycobacterium-tuberculosis microbe template, with the taxon sidebar Karen specified:
//   Overview (Antibiotic Resistance, Pathogenicity, Morphology, Virulence Factors,
//   Metallomics, Vulnerabilities) · Interventions · Conditions · FAQs · Research Feed ·
//   Update History · References.
//
// The Overview prose is hand-authored + verified against PubMed (author-safe). The
// Conditions section is DATA-DERIVED: it joins the three CSVs on the taxon's NCBI taxid
// using the repo's real evidence engine (lib/grade.mjs) — the same weight w = A·D·S·C·R
// that grades every signature on the site. This is the universal pattern: point it at any
// taxon's {signatures,experiments,studies}.csv + taxid and it emits the same page.
//
// Modes:
//   node _generator/pages/acinetobacter-baumannii/build.mjs                 # stats only
//   node _generator/pages/acinetobacter-baumannii/build.mjs --json <file>   # write {meta,content_html} for the demo route (no DB)
//   node _generator/pages/acinetobacter-baumannii/build.mjs --publish       # upsert content_items type=microbe (needs SUPABASE_SERVICE_ROLE_KEY)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseCsvObjects } from "../../lib/csv.mjs";
import { experimentWeight } from "../../lib/grade.mjs";
import { abstractToSections, sectionsToHtml, slugify, buildResearchFeeds } from "../../lib/feeds.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLES = join(HERE, "../../samples/acinetobacter-baumannii");

// ---- target taxon (the only thing that changes per page) --------------------------------
const TAXON = {
  taxid: "470",
  species: "Acinetobacter baumannii",
  genus: "Acinetobacter",
  slug: "acinetobacter-baumannii",
  title: "Acinetobacter baumannii",
};

// ================= references (verified via PubMed — author-safe) =========================
const R = {
  who: { name: "Discovery, research, and development of new antibiotics: the WHO priority list of antibiotic-resistant bacteria and tuberculosis.", authors: "Tacconelli E, Carrara E, Savoldi A, et al.", date: "Lancet Infect Dis. 2018", url: "https://doi.org/10.1016/S1473-3099(17)30753-3" },
  gram: { name: "Global burden of bacterial antimicrobial resistance in 2019: a systematic analysis.", authors: "GBD 2019 Antimicrobial Resistance Collaborators (Murray CJL, et al.).", date: "Lancet. 2022", url: "https://doi.org/10.1016/S0140-6736(21)02724-0" },
  eskape: { name: "Federal funding for the study of antimicrobial resistance in nosocomial pathogens: no ESKAPE.", authors: "Rice LB.", date: "J Infect Dis. 2008", url: "https://doi.org/10.1086/533452" },
  antunes: { name: "Acinetobacter baumannii: evolution of a global pathogen.", authors: "Antunes LCS, Visca P, Towner KJ.", date: "Pathog Dis. 2014", url: "https://doi.org/10.1111/2049-632X.12125" },
  harding: { name: "Uncovering the mechanisms of Acinetobacter baumannii virulence.", authors: "Harding CM, Hennon SW, Feldman MF.", date: "Nat Rev Microbiol. 2018", url: "https://doi.org/10.1038/nrmicro.2017.148" },
  choi: { name: "Acinetobacter baumannii outer membrane protein A targets the nucleus and induces cytotoxicity.", authors: "Choi CH, Lee JS, Lee YC, et al.", date: "Cell Microbiol. 2008", url: "https://doi.org/10.1111/j.1462-5822.2007.01041.x" },
  hood: { name: "Identification of an Acinetobacter baumannii zinc acquisition system that facilitates resistance to calprotectin-mediated zinc sequestration.", authors: "Hood MI, Mortensen BL, Moore JL, et al.", date: "PLoS Pathog. 2012", url: "https://doi.org/10.1371/journal.ppat.1003068" },
  juttukonda: { name: "Acinetobacter baumannii coordinates urea metabolism with metal import to resist host-mediated metal limitation.", authors: "Juttukonda LJ, Chazin WJ, Skaar EP.", date: "mBio. 2016", url: "https://doi.org/10.1128/mBio.01475-16" },
  gaddy: { name: "Role of acinetobactin-mediated iron acquisition functions in the interaction of Acinetobacter baumannii strain ATCC 19606T with human lung epithelial cells, Galleria mellonella caterpillars, and mice.", authors: "Gaddy JA, Arivett BA, McConnell MJ, et al.", date: "Infect Immun. 2012", url: "https://doi.org/10.1128/IAI.06279-11" },
  schooley: { name: "Development and use of personalized bacteriophage-based therapeutic cocktails to treat a patient with a disseminated resistant Acinetobacter baumannii infection.", authors: "Schooley RT, Biswas B, Gill JJ, et al.", date: "Antimicrob Agents Chemother. 2017", url: "https://doi.org/10.1128/AAC.00954-17" },
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

// Full-text-authored research-feed summaries (keyed by PMID), authored from the open-access
// PMC full text and used in place of the mechanical abstract split. Seeded in the main loop
// (schizophrenia, gastric) and extended by the ab-rf-summaries workflow. See authored.json.
const AUTHORED = JSON.parse(readFileSync(join(HERE, "authored.json"), "utf8"));

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

const LOW_BIOMASS = ["breast", "milk", "bulbar conjunctiva", "blood", "ovary", "skin of eyelid", "upper respiratory tract", "nasal cavity", "lung", "nasopharynx"];
const gradeLetter = (w) => (w >= 0.55 ? "A" : w >= 0.38 ? "B" : w >= 0.22 ? "C" : "D");
const gradeWord = { A: "Strong", B: "Moderate", C: "Limited", D: "Very limited" };

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

// Group per condition, keeping every observation so the study drawer can list them all.
const byCond = new Map();
for (const o of obs) {
  let g = byCond.get(o.condition);
  if (!g) { g = { condition: o.condition, items: [], dirs: new Set() }; byCond.set(o.condition, g); }
  g.items.push(o);
  g.dirs.add(o.direction);
}
const perStudyCaveats = (o) => {
  const c = [];
  if (/16S|PCR/i.test(o.seq)) c.push("marker-gene method: species-level Acinetobacter call is approximate");
  if ((o.site || "").split(",").some((s) => LOW_BIOMASS.includes(s.trim().toLowerCase()))) c.push("low-biomass site: contamination-sensitive");
  if (o.host === "Bos taurus") c.push("bovine host, not human");
  if (Math.min(+o.n0 || 999, +o.n1 || 999) < 20) c.push("small cohort");
  return c;
};
const conds = [...byCond.values()].map((g) => {
  const best = g.items.reduce((a, b) => (b.w > a.w ? b : a), g.items[0]);
  const direction = g.dirs.size > 1 ? "mixed" : ([...g.dirs][0] === "increased" ? "enriched" : "depleted");
  // one study card per distinct PMID (keep the strongest experiment for that study).
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
// Sort: enriched, depleted, mixed; within each by grade then score.
const DIR_RANK = { enriched: 0, depleted: 1, mixed: 2 };
conds.sort((a, b) => DIR_RANK[a.direction] - DIR_RANK[b.direction] || a.grade.localeCompare(b.grade) || b.score - a.score);

const nEnriched = conds.filter((c) => c.direction === "enriched").length;
const nDepleted = conds.filter((c) => c.direction === "depleted").length;
const nMixed = conds.filter((c) => c.direction === "mixed").length;
const allByPmid = new Map();
for (const o of obs) { const p = allByPmid.get(o.pmid); if (!p || o.w > p.w) allByPmid.set(o.pmid, o); }
const totalParticipants = [...allByPmid.values()].reduce((s, o) => s + ((+o.n0 || 0) + (+o.n1 || 0)), 0);

// Structured payload consumed by the <ConditionsTable/> React component (meta.conditions).
const conditionsData = {
  taxon: TAXON.title,
  summary: { nConditions: conds.length, nStudies: allByPmid.size, participants: totalParticipants, tier: "Low", agreement: 0.32, enriched: nEnriched, depleted: nDepleted, mixed: nMixed },
  rows: conds,
};

// ================================= page body =============================================
let H = "";

// ---------- Overview ----------
H += `<h2 class="wp-block-heading" id="h-overview">Overview</h2>`;
H += P(`<em>Acinetobacter baumannii</em> is a Gram-negative, strictly aerobic coccobacillus and the archetypal hospital "superbug." It is the <strong>A</strong> of the ESKAPE group of nosocomial pathogens.${cite("eskape")} The World Health Organization ranks carbapenem-resistant <em>A. baumannii</em> as a <em>critical</em>-priority pathogen for new antibiotic development,${cite("who")} and in 2019 it was one of the six leading pathogens for deaths associated with antimicrobial resistance worldwide.${cite("gram")} Yet on this database it surfaces in a quieter guise: a low-abundance differential taxon detected across dozens of human microbiome studies, where its meaning is far more context-dependent than its ICU reputation suggests.`);
H += P(`What makes <em>A. baumannii</em> distinctive here is the same thing that makes it a survivor in the hospital: an exceptional tolerance of desiccation and a relentless ability to win the fight for micronutrient metals at the host-pathogen interface.${cite("harding")} It is an iron pirate that uses the siderophore <em>acinetobactin</em> to strip host iron,${cite("gaddy")} and a zinc/manganese scavenger that specifically counters the host's calprotectin-based metal withholding.${cite("hood", "juttukonda")} That ${dlink("/definition/nutritional-immunity/", "nutritional immunity")} battleground is exactly the lens this database reads pathogens through, and it is where <em>A. baumannii</em>'s greatest strengths double as its most exploitable weaknesses.`);

// Antibiotic Resistance
H += `<h3 class="wp-block-heading" id="h-antibiotic-resistance"><strong>Antibiotic Resistance</strong></h3>`;
H += P(`<em>A. baumannii</em> is the reference organism for multidrug resistance. It combines a highly plastic genome that rapidly acquires resistance determinants with intrinsic defenses (restricted outer-membrane permeability and constitutive efflux pumps), so that resistance to nearly every antibiotic class has emerged, including strains resistant to all available agents.${cite("antunes")} Carbapenem resistance, the clinically decisive threshold, is driven largely by acquired OXA-type carbapenemases layered on porin loss and efflux; carbapenem-resistant <em>A. baumannii</em> (CRAB) is the phenotype behind the WHO <em>critical</em> ranking${cite("who")} and among the pathogen-drug combinations causing 50,000 to 100,000 attributable AMR deaths a year.${cite("gram")} Definitive therapy is susceptibility-guided (sulbactam-based combinations, polymyxins, and newer agents such as cefiderocol); this page describes the organism's biology and its microbiome associations, not a treatment protocol. One nutritional-immunity connection is worth flagging early: withholding <em>zinc</em> re-sensitizes multidrug-resistant <em>A. baumannii</em> to carbapenems, tying the metallome directly to resistance.${cite("hood")}`);

// Pathogenicity
H += `<h3 class="wp-block-heading" id="h-pathogenicity"><strong>Pathogenicity</strong></h3>`;
H += P(`<em>A. baumannii</em> is an opportunist: it rarely troubles healthy people but causes ventilator-associated pneumonia, bloodstream, wound (including combat and burn), urinary-tract, and central-nervous-system infections in critically ill and immunocompromised hosts, with reported mortality reaching ~35%.${cite("antunes")} Its clinical success is attributed less to classical toxins than to environmental persistence, genome plasticity, and micronutrient acquisition,${cite("harding")} and most disease is caused by two globally disseminated epidemic clones; community-acquired infection is uncommon.${cite("antunes")} This opportunistic, low-carriage biology is the key to reading its appearances below. A differential-abundance signal in gut, skin, milk, or ocular communities is an ecological association, not evidence of invasive infection.`);

// Morphology
H += `<h3 class="wp-block-heading" id="h-morphology"><strong>Morphology</strong></h3>`;
H += P(`A pleomorphic Gram-negative organism: rod-shaped in exponential growth and more coccoid in stationary phase (hence "coccobacillus"). It is strictly aerobic, oxidase-negative, catalase-positive, and non-fermentative. It lacks flagella but performs twitching / surface-associated motility, and clinical isolates are typically encased in a protective polysaccharide (K-locus) capsule.${cite("harding")} Its defining physical trait is extreme desiccation tolerance. The organism survives for weeks to months on dry abiotic surfaces, which underlies its persistence on hospital fomites and its propensity for outbreaks.${cite("harding", "antunes")}`);

// Virulence Factors (table)
H += `<h3 class="wp-block-heading" id="h-virulence-factors"><strong>Virulence Factors</strong></h3>`;
H += P(`<em>A. baumannii</em> relies on a persistence-and-acquisition toolkit rather than secreted toxins. Several factors below (the acinetobactin siderophore, the Zn/Mn uptake systems) are the same metal-handling machines detailed under Metallomics, which ties the metallome directly to virulence.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Virulence factor</th><th>Description and role</th></tr></thead><tbody>`
  + `<tr><td>${mred("OmpA (outer-membrane protein A)")}</td><td>The most abundant surface protein; targets host mitochondria and the nucleus to trigger epithelial-cell death, and contributes to adherence, serum resistance, and biofilm.${cite("choi", "harding")}</td></tr>`
  + `<tr><td>${mred("Polysaccharide capsule (K locus)")}</td><td>Shields against complement, desiccation, and phagocytosis; a principal determinant of virulence and environmental survival.${cite("harding")}</td></tr>`
  + `<tr><td>${mred("Biofilm & Csu pili")}</td><td>Chaperone–usher pili build biofilm on catheters and dry surfaces, conferring desiccation and antibiotic tolerance.${cite("harding")}</td></tr>`
  + `<tr><td>${mred("Phospholipases C/D")}</td><td>Hydrolyze host membrane lipids, supporting serum resistance and cytotoxicity.${cite("harding")}</td></tr>`
  + `<tr><td>${mred("Lipooligosaccharide (LOS)")}</td><td>Endotoxin driving immune activation; LOS modification (or its loss) underlies colistin resistance.${cite("harding")}</td></tr>`
  + `<tr><td>${mred("Acinetobactin siderophore")}</td><td>High-affinity iron piracy from transferrin/lactoferrin; genetically required for full virulence in cell, insect, and mouse models.${cite("gaddy")}</td></tr>`
  + `<tr><td>${mred("Zn/Mn acquisition (ZnuABC, NRAMP)")}</td><td>Defeat the host's calprotectin-mediated zinc and manganese withholding, sustaining growth at the infection site.${cite("hood", "juttukonda")}</td></tr>`
  + `<tr><td>${mred("Type VI secretion system (T6SS)")}</td><td>Interbacterial "harpoon" that kills neighboring bacteria to win niche space during colonization.${cite("harding")}</td></tr>`
  + `</tbody></table></figure>`;

// Metallomics (table) — the metallome-first lens
H += `<h3 class="wp-block-heading" id="h-metallomics"><strong>Metallomics</strong></h3>`;
H += P(`How <em>A. baumannii</em> acquires and manages each metal at the host–pathogen interface. The host defends by <em>withholding</em> iron, zinc, and manganese (nutritional immunity); <em>A. baumannii</em> carries a dedicated countermeasure for each, and these systems are among its most druggable dependencies.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Metal / ion</th><th>Key features in <em>A. baumannii</em></th></tr></thead><tbody>`
  + `<tr><td>${mred("Iron (Fe)")}</td><td>The master nutrient. The <em>acinetobactin</em> siderophore system (bas/bau/bar loci) strips iron from host transferrin and lactoferrin; disabling it sharply attenuates virulence.${cite("gaddy")} The host counters with lactoferrin, transferrin, and hepcidin-driven iron sequestration.</td></tr>`
  + `<tr><td>${mred("Zinc (Zn)")}</td><td>The high-affinity ZnuABC importer resists calprotectin-mediated zinc starvation.${cite("hood")} Therapeutically pivotal: zinc limitation reverses carbapenem resistance in MDR isolates, a direct metallome-to-resistance link.${cite("hood")}</td></tr>`
  + `<tr><td>${mred("Manganese (Mn)")}</td><td>An NRAMP-family transporter co-regulated with a urea carboxylase overcomes calprotectin manganese chelation; deleting the transporter cripples fitness in a mouse pneumonia model.${cite("juttukonda")}</td></tr>`
  + `<tr><td>${mred("Copper (Cu) & heavy metals")}</td><td>Copper-tolerance and broader metal-stress systems help <em>Acinetobacter</em> survive metal intoxication and persist in metal-rich environmental and clinical niches, where metal tolerance can co-select with antibiotic resistance.${cite("harding")}</td></tr>`
  + `</tbody></table></figure>`;

// Vulnerabilities
H += `<h3 class="wp-block-heading" id="h-vulnerabilities"><strong>Vulnerabilities</strong></h3>`;
H += P(`Read through the nutritional immunity lens, <em>A. baumannii</em>'s strengths are also its Achilles' heels. The metal-acquisition systems it depends on are exactly what the host (and a therapy) can turn against it:`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Weak point</th><th>Why it is exploitable</th></tr></thead><tbody>`
  + `<tr><td>${mred("Iron dependence")}</td><td>Acinetobactin-mediated iron piracy is virulence-essential,${cite("gaddy")} so iron restriction, lactoferrin, and iron-mimetic strategies (e.g. gallium as a non-functional Fe³⁺ substitute) attack a load-bearing system.</td></tr>`
  + `<tr><td>${mred("Metal-withholding re-sensitization")}</td><td>Host zinc limitation reverses carbapenem resistance,${cite("hood")} and manganese withholding via calprotectin degrades fitness.${cite("juttukonda")} Nutritional immunity is a genuine, targetable weakness.</td></tr>`
  + `<tr><td>${mred("Phage susceptibility")}</td><td>In the landmark 2017 case, a personalized bacteriophage cocktail cleared a disseminated, pan-resistant <em>A. baumannii</em> infection after antibiotics failed, proof that the organism has exploitable lytic vulnerabilities.${cite("schooley")}</td></tr>`
  + `</tbody></table></figure>`;

// ---------- Interventions ----------
H += `<h2 class="wp-block-heading" id="h-interventions">Interventions</h2>`;
H += P(`For a pathogen, an "intervention" is an agent that acts <em>against</em> or modulates it. Everything below is research-stage or adjunctive and is <strong>not</strong> a substitute for susceptibility-guided antimicrobial therapy; each is classified by ${dlink("/our-validation-method/", "our validation method")} as Validated, Promising Candidate, or Validation In Progress. The through-line is nutritional immunity: starve the metals <em>A. baumannii</em> depends on, plus phage.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Intervention</th><th>Class</th><th>Status</th></tr></thead><tbody>`
  + `<tr><td>${dlink("/interventions/phage-therapy/", "Bacteriophage therapy")}</td><td>Biologic</td><td>Promising Candidate</td></tr>`
  + `<tr><td>Gallium (Fe³⁺ mimetic)</td><td>Investigational drug</td><td>Promising Candidate</td></tr>`
  + `<tr><td>${dlink("/interventions/lactoferrin/", "Lactoferrin")}</td><td>Supplement</td><td>Validation In Progress</td></tr>`
  + `<tr><td>Zinc / manganese nutritional-immunity support</td><td>Concept</td><td>Validation In Progress</td></tr>`
  + `<tr><td>Iron restriction (avoid iron overload)</td><td>Diet</td><td>Validation In Progress</td></tr>`
  + `</tbody></table></figure>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">How do these act on A. baumannii?</span></summary><figure class="wp-block-table"><table class="has-fixed-layout"><tbody>`
  + `<tr><td><strong>Intervention</strong></td><td><strong>Mechanism</strong></td></tr>`
  + `<tr><td>Bacteriophage therapy</td><td>Lytic phages selected against the patient's isolate; cleared a disseminated pan-resistant infection in the 2017 index case and can re-sensitize to antibiotics.${cite("schooley")}</td></tr>`
  + `<tr><td>Gallium</td><td>Substitutes for iron in acinetobactin-delivered uptake but cannot perform iron's redox chemistry, poisoning the iron-dependent metabolism the organism relies on.${cite("gaddy")}</td></tr>`
  + `<tr><td>${dlink("/interventions/lactoferrin/", "Lactoferrin")}</td><td>Sequesters iron and reinforces host iron-withholding, denying the substrate acinetobactin competes for.${cite("gaddy")}</td></tr>`
  + `<tr><td>Zinc / manganese modulation</td><td>Host metal withholding degrades fitness and, for zinc, reverses carbapenem resistance, supporting calprotectin-like nutritional immunity.${cite("hood", "juttukonda")}</td></tr>`
  + `</tbody></table></figure></details>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">What should be avoided (STOP)?</span></summary>`
  + P(`Untargeted iron loading. Because acinetobactin-mediated iron piracy is virulence-essential,${cite("gaddy")} excess free iron can feed <em>A. baumannii</em> (and other siderophore-competent pathogens); reserve iron repletion for documented deficiency.`)
  + `</details>`;

// ---------- Conditions (data-derived) ----------
H += `<h2 class="wp-block-heading" id="h-conditions">Conditions</h2>`;
H += P(`Where <em>A. baumannii</em> (NCBI:txid${TAXON.taxid}) appears as a differentially abundant taxon across the Microbiome Medicine corpus. Each row aggregates every experiment in which the organism moved in a given condition; <em>direction</em> is its change in the case/exposure group, and <em>grade</em> is the strongest single study's methodology weight (A·D·S·C·R), the same engine that grades every signature on this site.`);
H += P(`Across <strong>${conds.length}</strong> conditions and <strong>${new Set(obs.map((o) => o.pmid)).size}</strong> studies, the signal is genuinely mixed: enriched in ${nEnriched}, depleted in ${nDepleted}, and direction-conflicting in ${nMixed}. Because the directions disagree as often as they agree, the <em>aggregate</em> evidence tier for <em>A. baumannii</em> is <strong>Low</strong> (directional agreement 0.32): it is a broadly detected, context-dependent taxon, not a consistent marker of any one disease.`);
// Detection caveat — microbiomemedicine brand note (light-red tint + brand-red rule, NOT
// the magenta heavy-metal-index style).
H += `<div class="mbio-note"><p><span class="mbio-note__lead">Detection note.</span> Species-level “<em>A. baumannii</em>” calls are inherently uncertain: short-read 16S and even shotgun profilers struggle to separate <em>A. baumannii</em> from its close relatives in the <em>Acinetobacter calcoaceticus-baumannii</em> complex, and environmental <em>Acinetobacter</em> is a common low-biomass and reagent contaminant. Several conditions below come from low-biomass sites (milk, conjunctiva, blood, tumor tissue) where a species-level assignment should be read as “<em>Acinetobacter</em>, plausibly <em>baumannii</em>,” not a confirmed identification. This is why the aggregate tier stays Low despite many observations.</p></div>`;
// The interactive Conditions table (grade gradient · direction · effect arrows · evidence →
// study drawer) mounts here, rendered by <ConditionsTable data={meta.conditions}/>.
H += `<!--CONDITIONS_TABLE-->`;

// ---------- FAQs (baked in the render-faithful .rgbc-faq-block format) ----------
H += `<h2 class="wp-block-heading" id="h-faqs">FAQs</h2>`;
const FAQ = [
  ["Is Acinetobacter baumannii part of the healthy human microbiome?", "Not as a stable resident. A. baumannii is an opportunistic, low-carriage organism most at home on hospital surfaces and in critically ill patients. When it shows up as a low-abundance taxon in gut, skin, milk, or ocular studies, that is an ecological association, not evidence of infection or of normal colonization."],
  ["Does finding A. baumannii in a gut or milk study mean a dangerous infection?", "No. A differential-abundance signal reflects a shift in a community profile, not invasive disease. It also carries real detection uncertainty: short-read methods struggle to distinguish A. baumannii from close Acinetobacter relatives, and the genus is a common low-biomass contaminant, so several such calls are best read as 'Acinetobacter, plausibly baumannii.'"],
  ["Why is A. baumannii so hard to treat, and where does the microbiome angle come in?", "It combines a highly plastic, resistance-acquiring genome with intrinsic low permeability and efflux, and carbapenem-resistant strains are a WHO critical priority. The microbiome-medicine angle is nutritional immunity: it depends on pirating iron, zinc, and manganese from the host, and withholding those metals (zinc limitation even reverses carbapenem resistance) is an exploitable weakness."],
];
H += `<div class="rgbc-faq-block">`;
for (const [q, a] of FAQ) {
  H += `<details class="rgbc-faq-item"><summary><span class="rgbc-faq-icon"></span><span class="rgbc-faq-q">${esc(q)}</span></summary><div class="rgbc-faq-a"><strong>Quick answer:</strong> ${esc(a)}</div></details>`;
}
H += `</div>`;

// ---------- Research Feed (built from studies.csv — the studies behind the Conditions) ----------
const SVG_PLUS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="12" height="12" style="margin:auto"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path></svg>`;
const SVG_MINUS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="12" height="12" style="margin:auto"><path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>`;
const SVG_DOC = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
const SVG_LINK = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
const SVG_MAIL = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
const firstSentence = (s) => { const t = (s || "").replace(/\s+/g, " ").trim(); const m = t.match(/^.*?[.!?](\s|$)/); return (m ? m[0] : t).trim().slice(0, 280); };

const rfSplit = (v) => (v || "").split(",").map((x) => x.trim()).filter(Boolean);
const rfUniq = (a) => [...new Set(a)];
// Location / Sample Site / Species mini-graphs — the canonical research-feed card body
// (identical shape to researchFeedReveal.cardBody / ResearchFeedView.graphsHtml).
const rfGraphs = (f) => {
  const fields = [["Location", f.location], ["Sample Site", f.sample_site], ["Species", f.species]];
  const present = fields.filter(([, v]) => v && v.length);
  if (!present.length) return "";
  return `<div class="research-feed__graphs">` + present.map(([t, items]) =>
    `<div class="research-feed__graph"><div class="research-feed__graph-title">${t}</div><div class="research-feed__graph-items">` +
    items.map((i) => `<div class="research-feed__graph-item">${esc(i)}</div>`).join("") + `</div></div>`).join("") + `</div>`;
};
// The expanded card body is the 4-section summary as h4 headings (canonical). Ids are dropped
// to avoid duplicate ids across many cards.
const cardSummary = (pmid) => AUTHORED[pmid]
  ? sectionsToHtml(AUTHORED[pmid].sections).replace(/<h3\b[^>]*>/g, `<h4 class="wp-block-heading">`).replace(/<\/h3>/g, "</h4>")
  : "";

const rfStudies = studies
  .filter((s) => (s["Title"] || "").trim())
  .sort((a, b) => (+b["Year"] || 0) - (+a["Year"] || 0));
H += `<h2 class="wp-block-heading" id="h-research-feed">Research Feed</h2>`;
H += P(`Internal summaries of the ${rfStudies.length} studies we reviewed in which <em>A. baumannii</em> was a differential taxon across this corpus.`);
H += `<div class="research-feed accordion" data-accordion-disable-auto-close="true">`;
for (const s of rfStudies) {
  const title = (s["Title"] || "").trim();
  const year = (s["Year"] || "").trim();
  const paper = (s["URL"] || "").trim() || (s["DOI"] ? "https://doi.org/" + s["DOI"].trim() : "#");
  const pmid = (s["PMID"] || s["Study page name"] || "").trim();
  const url = `/research-feeds/${slugify(title)}`;
  // Finding-led excerpt (full-text authored where available).
  const KEY = /\b(found|showed|reveal|demonstrat|associat|enriched|deplet|increas|decreas|higher|lower|identif|correlat)\b/i;
  const sentences = (s["Abstract"] || "").replace(/\s+/g, " ").split(/(?<=[.!?])\s+/);
  const finding = sentences.find((x) => KEY.test(x) && x.split(" ").length >= 6);
  const excerpt = AUTHORED[pmid]?.excerpt || (finding || firstSentence(s["Abstract"]) || title).slice(0, 300);
  // Graphs from this study's experiments.
  const stExps = exps.filter((e) => (e["Study"] || "").trim() === pmid);
  const feed = { location: rfUniq(stExps.flatMap((e) => rfSplit(e["Location of subjects"]))), sample_site: rfUniq(stExps.flatMap((e) => rfSplit(e["Body site"]))), species: rfUniq(stExps.flatMap((e) => rfSplit(e["Host species"]))) };
  const mailto = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(paper)}`;
  // Card = header(toggle + TITLE-AS-LINK to the summary page) + sub-header + excerpt +
  // accordion content(graphs + h4 summary) + footer. NO "Read the full study summary" link.
  H += `<div class="research-feed__item accordion__item">`
    + `<div class="research-feed__header-wrap accordion__header"><div class="research-feed__toggle-icon-wrap"><span class="research-feed__toggle-icon research-feed__toggle-icon--plus">${SVG_PLUS}</span><span class="research-feed__toggle-icon research-feed__toggle-icon--minus">${SVG_MINUS}</span></div><div class="research-feed__title">${esc(title)}</div></div>`
    + `<div class="research-feed__sub-header"><div class="research-feed__sub-header-item research-feed__sub-header-item--date">${esc(year)}</div></div>`
    + `<div class="research-feed__excerpt">${esc(excerpt)}</div>`
    + `<div class="research-feed__content accordion__content">${rfGraphs(feed)}${cardSummary(pmid)}</div>`
    + `<div class="research-feed__footer"><div><a class="btn" href="${url}">${SVG_DOC}Open</a><a class="btn" href="${paper}" target="_blank" rel="noreferrer">${SVG_LINK}Link</a><a class="btn" href="${mailto}">${SVG_MAIL}Email</a></div></div>`
    + `</div>`;
}
H += `</div>`;

// ---------- Update History ----------
H += `<h2 class="wp-block-heading" id="h-update-history">Update History</h2>`;
H += `<div class="mbio-update-history"><div class="mbio-update-history__content"><article class="mbio-card"><div class="mbio-card__border"></div><p class="mbio-card__date">2026-07-02</p><span class="mbio-card__title">Acinetobacter baumannii <span class="mbio-card__type btn btn--rounded">major</span></span><div class="mbio-card__content"><p class="wp-block-paragraph">Taxon page created: biology (antibiotic resistance, pathogenicity, morphology), virulence factors, metallome &amp; nutritional-immunity vulnerabilities, research-stage interventions, the data-derived Conditions table across ${conds.length} conditions, and the full research feed.</p></div></article></div></div>`;

// ---------- References ----------
H += `<h2 class="wp-block-heading" id="h-references">References</h2><ol class="rgbc-references">`;
for (const k of order) {
  const r = R[k];
  H += `<li class="rgbc-references__item" id="ref-${k}"><a class="rgbc-references__link" href="${r.url}" target="_blank">${esc(r.name)}</a> ${esc(r.authors)} <span>(${esc(r.date)})</span></li>`;
}
H += `</ol>`;
for (const k of order) {
  const r = R[k];
  H += `<div class="tooltip wiki-ref-${k}"><div class="tooltip__header">Reference [${numByKey.get(k)}]</div><div class="tooltip__content"><p>${esc(r.name)}</p><p><em>${esc(r.authors)} ${esc(r.date)}</em></p><a href="${r.url}" target="_blank">View source</a></div></div>`;
}

// ================================= meta + emit ==========================================
const meta = {
  did_you_know: "Acinetobacter baumannii's biggest weakness is its appetite for metals. Withholding zinc alone can reverse its carbapenem resistance, turning nutritional immunity into an antibiotic adjuvant.",
  authors: [{ name: "Karen Pendergrass", orcid: "https://orcid.org/0000-0002-2348-7259", avatar: "https://secure.gravatar.com/avatar/104bc2e8ba283fda6309c14b2eca02fe9612e8793ed62621c691e83230d4a963?s=96&d=mm&r=g" }],
  conditions: conditionsData,
};
const excerpt_html = "<p>Acinetobacter baumannii is a Gram-negative, desiccation-hardy ESKAPE pathogen and WHO critical-priority superbug. It is an iron-, zinc-, and manganese-pirating opportunist whose metal dependence is both its virulence engine and its most exploitable weakness.</p>";

console.log(`content_html: ${H.length} chars · refs: ${order.length} · conditions: ${conds.length} (↑${nEnriched} ↓${nDepleted} ↕${nMixed}) · RF studies: ${rfStudies.length}`);

const jsonIdx = process.argv.indexOf("--json");
if (jsonIdx >= 0 && process.argv[jsonIdx + 1]) {
  const out = { slug: TAXON.slug, title: TAXON.title, type: "microbe", excerpt_html, content_html: H, meta, modified_at: "2026-07-02T00:00:00.000Z" };
  writeFileSync(process.argv[jsonIdx + 1], JSON.stringify(out, null, 2));
  console.log("wrote JSON -> " + process.argv[jsonIdx + 1]);
}

// Emit the generated research-feed pages (title, slug, content_html, meta.feed) so a demo
// route can render one through the canonical ResearchFeedView format.
const rfIdx = process.argv.indexOf("--rf-json");
if (rfIdx >= 0 && process.argv[rfIdx + 1]) {
  const { rows: rfRows } = buildResearchFeeds({ studiesCsv: stuCsv, experimentsCsv: expCsv, conditionLabel: "", conditionSlug: "", author: meta.authors[0], existingSlugs: new Set(), existingByTitle: new Map() });
  const titleToPmid = new Map(studies.map((st) => [(st["Title"] || "").trim(), (st["PMID"] || st["Study page name"] || "").trim()]));
  for (const r of rfRows) {
    const p = titleToPmid.get(r.title);
    if (AUTHORED[p]) { r.content_html = sectionsToHtml(AUTHORED[p].sections); r.excerpt_html = AUTHORED[p].excerpt; }
  }
  writeFileSync(process.argv[rfIdx + 1], JSON.stringify(rfRows, null, 2));
  console.log("wrote RF rows -> " + process.argv[rfIdx + 1] + " (" + rfRows.length + ")");
}

if (process.argv.includes("--publish")) {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  // Research Feed = internally reviewed studies with summaries. Create one research-feed page
  // per study (TB-style 4-section summary seeded from the abstract), reusing any that already
  // exist by exact title. The taxon page's Research Feed cards link to these internal pages.
  const rfExisting = [];
  for (let from = 0; from < 8000; from += 1000) {
    const { data } = await db.from("content_items").select("id,slug,title").eq("type", "research-feed").eq("status", "publish").range(from, from + 999);
    if (!data || !data.length) break;
    rfExisting.push(...data);
    if (data.length < 1000) break;
  }
  const existingSlugs = new Set(rfExisting.map((r) => r.slug));
  const existingByTitle = new Map(rfExisting.map((r) => [String(r.title).trim(), r.slug]));
  const { rows: rfRows } = buildResearchFeeds({ studiesCsv: stuCsv, experimentsCsv: expCsv, conditionLabel: "", conditionSlug: "", author: meta.authors[0], existingSlugs, existingByTitle });
  if (rfRows.length) {
    const { data: maxRf } = await db.from("content_items").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
    let nid = Number(maxRf?.id) || 990100;
    for (const r of rfRows) {
      nid++;
      const { error } = await db.from("content_items").insert({ id: nid, type: "research-feed", slug: r.slug, title: r.title, content_html: r.content_html, excerpt_html: r.excerpt_html, meta: r.meta, status: "publish", published_at: r.published_at || now, modified_at: now });
      if (error) console.log(`RF insert ERROR (${r.slug}): ${error.message}`);
    }
    console.log(`research-feed: created ${rfRows.length} new page(s), reused ${studies.length - rfRows.length}`);
  } else {
    console.log(`research-feed: all ${studies.length} studies already have pages (reused)`);
  }

  const { data: existing } = await db.from("content_items").select("id").eq("type", "microbe").eq("slug", TAXON.slug).maybeSingle();
  if (existing) {
    const { error } = await db.from("content_items").update({ title: TAXON.title, content_html: H, excerpt_html, meta, modified_at: now }).eq("id", existing.id);
    console.log(error ? "update ERROR: " + error.message : `updated -> microbe#${existing.id} (${TAXON.slug})`);
  } else {
    const { data: maxRow } = await db.from("content_items").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
    const id = (Number(maxRow?.id) || 990015) + 1;
    const { error } = await db.from("content_items").insert({ id, type: "microbe", slug: TAXON.slug, title: TAXON.title, content_html: H, excerpt_html, meta, status: "publish", published_at: now, modified_at: now });
    console.log(error ? "insert ERROR: " + error.message : `inserted -> microbe#${id} (${TAXON.slug})`);
  }
}
