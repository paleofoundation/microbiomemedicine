// Build the "Desulfovibrio" TAXON page (GENUS level, NCBI taxid 872) — same universal
// pattern: hand-authored, PubMed-verified Overview + a DATA-DERIVED Conditions section that
// joins the three CSVs on the taxid using lib/grade.mjs (w = A·D·S·C·R). Desulfovibrio are the
// classic sulfate-reducing gut bacteria (dissimilatory sulfate -> hydrogen sulfide), which is
// the contrast with Bilophila (a sulfite reducer).
//
// Sidebar: Overview (Morphology, Metabolism & the H2S engine, Pathogenicity, Virulence
// Factors, Vulnerabilities) · Interventions · Conditions · FAQs · Research Feed ·
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
const SAMPLES = join(HERE, "../../samples/desulfovibrio");

const TAXON = {
  taxid: "872",
  species: "Desulfovibrio",
  genus: "Desulfovibrio",
  slug: "desulfovibrio",
  title: "Desulfovibrio",
};

// ================= references (verified via PubMed — author-safe) =========================
const R = {
  singh: { name: "Hydrogen sulfide in physiology and diseases of the digestive tract.", authors: "Singh SB, Lin HC.", date: "Microorganisms. 2015", url: "https://doi.org/10.3390/microorganisms3040866" },
  kushkevych: { name: "Recent advances in metabolic pathways of sulfate reduction in intestinal bacteria.", authors: "Kushkevych I, Cejnar J, Treml J, Dordevic D, Kollar P, Vitezova M.", date: "Cells. 2020", url: "https://doi.org/10.3390/cells9030698" },
  pimenta: { name: "Role of sulfidogenic members of the gut microbiota in human disease.", authors: "Pimenta AI, Bernardino RM, Pereira IAC.", date: "Adv Microb Physiol. 2024", url: "https://doi.org/10.1016/bs.ampbs.2024.04.003" },
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
// Genus-level taxon: match the taxid OR a g__Desulfovibrio MetaPhlAn clade.
const hasTaxon = (row) => {
  const ids = (row["NCBI Taxonomy IDs"] || "").split(";").some((lin) => lin.split("|").map((x) => x.trim()).includes(TAXON.taxid));
  const nm = (row["MetaPhlAn taxon names"] || "").includes("g__" + TAXON.genus);
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
  if (/16S|PCR/i.test(o.seq)) c.push("genus-level 16S call groups several Desulfovibrio species");
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
H += P(`<em>Desulfovibrio</em> is a genus of Gram-negative, strictly anaerobic, sulfate-reducing bacteria and a normal, low-abundance member of the human gut microbiota.${cite("singh")} Its defining activity is turning sulfate into hydrogen sulfide, and it is one of the main sulfidogenic residents of the colon.${cite("pimenta", "singh")} On this database it appears as a differentially abundant taxon across many human microbiome studies, where its meaning is tied to the gut's sulfur economy.`);
H += P(`What makes <em>Desulfovibrio</em> distinctive is dissimilatory sulfate reduction: it respires sulfate and related sulfur compounds, using hydrogen or organic acids as electron donors, and releases hydrogen sulfide as the end product.${cite("kushkevych", "singh")} At the concentrations reached in the colon that sulfide is a double-edged molecule, a signaling gas at low levels but genotoxic to the gut lining at high levels, which is why <em>Desulfovibrio</em> blooms are linked to inflammatory bowel disease and colorectal cancer.${cite("attene", "pimenta")} A Western, high-animal-protein diet that raises colonic sulfate favors these sulfidogenic bacteria.${cite("pimenta")}`);

H += `<h3 class="wp-block-heading" id="h-morphology"><strong>Morphology</strong></h3>`;
H += P(`Members of <em>Desulfovibrio</em> are Gram-negative, strictly anaerobic bacteria, typically curved or vibrioid motile rods, in the class Deltaproteobacteria.${cite("singh")} They are chemoorganotrophic sulfate reducers: they use sulfate as a terminal electron acceptor rather than fermenting sugars, and are among the dominant sulfate-reducing bacteria of the human colon.${cite("singh", "kushkevych")}`);

H += `<h3 class="wp-block-heading" id="h-metabolism"><strong>Metabolism &amp; the H₂S engine</strong></h3>`;
H += P(`<em>Desulfovibrio</em>'s core chemistry is dissimilatory sulfate reduction. Sulfate is activated and stepwise reduced through sulfite to hydrogen sulfide, with hydrogen or short-chain organic acids such as lactate as electron donors.${cite("kushkevych")} Unlike the assimilatory pathway that builds sulfur into amino acids, this dissimilatory route releases free hydrogen sulfide as a waste product.${cite("kushkevych")} Because colonic sulfate and organic sulfur rise with diet, the size of the <em>Desulfovibrio</em> population and its sulfide output track what the host eats.${cite("pimenta", "singh")}`);

H += `<h3 class="wp-block-heading" id="h-pathogenicity"><strong>Pathogenicity</strong></h3>`;
H += P(`<em>Desulfovibrio</em> behaves as a pathobiont rather than a classic invader: harmless at low levels, but harmful when it blooms and floods the colon with hydrogen sulfide.${cite("pimenta")} Elevated sulfidogenic bacteria and sulfide are associated with ulcerative colitis, Crohn's disease, and irritable bowel syndrome, and sulfide is implicated in colorectal cancer.${cite("singh", "pimenta")} As with any differential-abundance signal, an appearance in a gut study is an ecological association shaped by diet and community context, not evidence of infection.`);

H += `<h3 class="wp-block-heading" id="h-virulence-factors"><strong>Virulence Factors</strong></h3>`;
H += P(`<em>Desulfovibrio</em>'s harms come from its metabolic output rather than classical toxins. The through-line is hydrogen sulfide, the same molecule produced by the sulfate-reduction pathway detailed under Metabolism.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Virulence factor</th><th>Description and role</th></tr></thead><tbody>`
  + `<tr><td>${mred("Hydrogen sulfide (H₂S)")}</td><td>The organism's respiratory end product. At colonic concentrations H₂S is genotoxic to epithelial cells and erodes the protective mucus barrier, linking it to ulcerative colitis and colorectal cancer.${cite("attene", "singh")}</td></tr>`
  + `<tr><td>${mred("Dissimilatory sulfate reduction")}</td><td>The sulfate-to-sulfide respiratory pathway is the metabolic engine behind the sulfide load and its inflammatory effects.${cite("kushkevych")}</td></tr>`
  + `<tr><td>${mred("Lipopolysaccharide (LPS)")}</td><td>As Gram-negative bacteria, <em>Desulfovibrio</em> contributes endotoxin that can promote inflammation when the population expands and the gut barrier weakens.${cite("pimenta")}</td></tr>`
  + `</tbody></table></figure>`;

H += `<h3 class="wp-block-heading" id="h-vulnerabilities"><strong>Vulnerabilities</strong></h3>`;
H += P(`Read through the diet-and-sulfur lens, <em>Desulfovibrio</em>'s dependence on host-supplied sulfate is also its weakness: cut the substrate and the sulfide output falls.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Weak point</th><th>Why it is exploitable</th></tr></thead><tbody>`
  + `<tr><td>${mred("Dietary sulfate and sulfur amino acids")}</td><td>The bloom is fed by dietary sulfate and sulfur amino acids, which rise on Western, high-animal-protein diets; lowering that load reduces the substrate for sulfide production.${cite("pimenta")}</td></tr>`
  + `<tr><td>${mred("Hydrogen sulfide as the target")}</td><td>Because the harm is mediated by hydrogen sulfide, limiting its production or buffering it protects the colonic epithelium.${cite("attene", "singh")}</td></tr>`
  + `<tr><td>${mred("Loss of a fiber-fermenting community")}</td><td>A balanced, fiber-fermenting microbiota that favors butyrate over sulfidogenesis keeps sulfate reducers in check, a microbiome-level lever.${cite("singh")}</td></tr>`
  + `</tbody></table></figure>`;

// ---------- Interventions ----------
H += `<h2 class="wp-block-heading" id="h-interventions">Interventions</h2>`;
H += P(`For a pathobiont, an intervention is anything that constrains its bloom or blunts its sulfide output. Everything below is research-stage or dietary and is <strong>not</strong> medical advice; each is classified by ${dlink("/our-validation-method/", "our validation method")}. The through-line is the sulfur supply line: starve <em>Desulfovibrio</em> of the sulfate it respires.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Intervention</th><th>Class</th><th>Status</th></tr></thead><tbody>`
  + `<tr><td>Lower dietary sulfate and animal protein</td><td>Diet</td><td>Validation In Progress</td></tr>`
  + `<tr><td>Fiber / butyrogenic dietary shift</td><td>Diet</td><td>Validation In Progress</td></tr>`
  + `<tr><td>Hydrogen-sulfide buffering</td><td>Concept</td><td>Validation In Progress</td></tr>`
  + `</tbody></table></figure>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">How do these act on Desulfovibrio?</span></summary><figure class="wp-block-table"><table class="has-fixed-layout"><tbody>`
  + `<tr><td><strong>Intervention</strong></td><td><strong>Mechanism</strong></td></tr>`
  + `<tr><td>Lower dietary sulfate and animal protein</td><td>Reduces the colonic sulfate and sulfur amino acids that <em>Desulfovibrio</em> respires, cutting hydrogen-sulfide output.${cite("pimenta")}</td></tr>`
  + `<tr><td>Fiber / butyrogenic shift</td><td>Favors fiber-fermenting, butyrate-producing bacteria that compete with and constrain sulfate reducers.${cite("singh")}</td></tr>`
  + `<tr><td>Hydrogen-sulfide buffering</td><td>Limiting or detoxifying colonic H₂S protects the epithelium from its genotoxic effects.${cite("attene")}</td></tr>`
  + `</tbody></table></figure></details>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">What should be avoided (STOP)?</span></summary>`
  + P(`Chronically high intake of dietary sulfate and sulfur-rich animal protein, the exposures most consistently linked to the overgrowth of sulfidogenic bacteria and higher colonic sulfide.${cite("pimenta")} The direct causal evidence is largely associative, so this is a mechanism to weigh, not a clinical prescription.`)
  + `</details>`;

// ---------- Conditions (data-derived) ----------
H += `<h2 class="wp-block-heading" id="h-conditions">Conditions</h2>`;
H += P(`Where <em>Desulfovibrio</em> (NCBI:txid${TAXON.taxid}) appears as a differentially abundant taxon across the Microbiome Medicine corpus. Each row aggregates every experiment in which the organism moved in a given condition; <em>direction</em> is its change in the case/exposure group, and <em>grade</em> is the strongest single study's methodology weight (A·D·S·C·R), the same engine that grades every signature on this site.`);
H += P(`Across <strong>${conds.length}</strong> conditions and <strong>${allByPmid.size}</strong> studies, the signal is ${mixDesc}: enriched in ${nEnriched}, depleted in ${nDepleted}, and direction-conflicting in ${nMixed} (directional agreement ${agreement}). Because <em>Desulfovibrio</em> is a diet-responsive pathobiont, its direction in any one condition often reflects the cohort's dietary sulfur environment as much as the disease itself, so the aggregate evidence tier is <strong>${tier}</strong>.`);
H += `<div class="mbio-note"><p><span class="mbio-note__lead">How to read these.</span> <em>Desulfovibrio</em> is a genuine, if low-abundance, member of the gut microbiota, so these signals are ecologically real rather than contamination artifacts. The caveat is interpretive: it is a diet-responsive pathobiont whose abundance and sulfide output track dietary sulfate and animal protein, so an enrichment in a given condition may reflect the cohort's diet as much as the disease. Genus-level 16S assignment also groups several <em>Desulfovibrio</em> species together. This is why the direction can conflict between cohorts and the aggregate tier stays ${tier}.</p></div>`;
H += `<!--CONDITIONS_TABLE-->`;

// ---------- FAQs ----------
H += `<h2 class="wp-block-heading" id="h-faqs">FAQs</h2>`;
const FAQ = [
  ["Is Desulfovibrio good or bad?", `Neither on its own. <em>Desulfovibrio</em> is a normal low-abundance gut resident that behaves as a pathobiont: harmless at baseline, but able to harm the colon when it blooms and floods it with hydrogen sulfide.${cite("pimenta", "attene")} Its effect depends on how much of it is present and how much sulfate is feeding it.`],
  ["What causes high Desulfovibrio?", `A diet rich in sulfate and sulfur-containing animal protein. These raise the colonic sulfate that <em>Desulfovibrio</em> respires, favoring its overgrowth on Western-style diets.${cite("pimenta")} Its numbers track the gut's sulfur supply more than any single disease.`],
  ["How do you reduce Desulfovibrio?", `By cutting its substrate. Lowering dietary sulfate and animal protein reduces the sulfur it breathes,${cite("pimenta")} and a fiber-rich, butyrate-promoting diet favors bacteria that compete with sulfate reducers.${cite("singh")} These are research-stage findings, not medical advice.`],
  ["What is Desulfovibrio associated with?", `Elevated <em>Desulfovibrio</em> and colonic hydrogen sulfide are linked to ulcerative colitis, Crohn's disease, and irritable bowel syndrome, and sulfide is implicated in colorectal cancer.${cite("singh", "pimenta")} Across human studies its direction is mixed and diet-dependent, so an association is not proof that it causes a given condition.`],
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
H += P(`Internal summaries of the ${rfStudies.length} studies we reviewed in which <em>Desulfovibrio</em> was a differential taxon across this corpus.`);
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
H += `<div class="mbio-update-history"><div class="mbio-update-history__content"><article class="mbio-card"><div class="mbio-card__border"></div><p class="mbio-card__date">2026-07-04</p><span class="mbio-card__title">Desulfovibrio <span class="mbio-card__type btn btn--rounded">major</span></span><div class="mbio-card__content"><p class="wp-block-paragraph">Taxon page created: biology (morphology, dissimilatory sulfate reduction, pathogenicity), virulence factors, diet-and-sulfur vulnerabilities, research-stage interventions, the data-derived Conditions table across ${conds.length} conditions, and the full research feed.</p></div></article></div></div>`;

// ---------- References ----------
H += `<h2 class="wp-block-heading" id="h-references">References</h2><ol class="rgbc-references">`;
for (const k of order) { const r = R[k]; H += `<li class="rgbc-references__item" id="ref-${k}"><a class="rgbc-references__link" href="${r.url}" target="_blank">${esc(r.name)}</a> ${esc(r.authors)} <span>(${esc(r.date)})</span></li>`; }
H += `</ol>`;
for (const k of order) { const r = R[k]; H += `<div class="tooltip rgbc-reference-tooltip wiki-ref-${k}"><div class="tooltip__content rgbc-reference-tooltip__content"><p>${esc(r.authors)}</p><a href="${r.url}" target="_blank">${esc(r.name)}</a><p>${esc(r.date)}</p></div></div>`; }

// ================================= meta + emit ==========================================
const meta = {
  did_you_know: "Desulfovibrio breathes sulfate the way we breathe oxygen, and its exhaust is hydrogen sulfide: the rotten-egg gas that at high gut levels can damage the colon lining.",
  authors: [{ name: "Karen Pendergrass", orcid: "https://orcid.org/0000-0002-2348-7259", avatar: "https://secure.gravatar.com/avatar/104bc2e8ba283fda6309c14b2eca02fe9612e8793ed62621c691e83230d4a963?s=96&d=mm&r=g" }],
  conditions: conditionsData,
};
const excerpt_html = "<p>Desulfovibrio is a genus of sulfate-reducing gut bacteria that turn dietary sulfate into hydrogen sulfide. Normal at low levels, a bloom (favored by high-animal-protein Western diets) floods the colon with genotoxic sulfide, linking it to inflammatory bowel disease and colorectal cancer.</p>";

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
    let nid = Number(maxRf?.id) || 990400;
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
    const id = (Number(maxRow?.id) || 990400) + 1;
    const { error } = await db.from("content_items").insert({ id, type: "microbe", slug: TAXON.slug, title: TAXON.title, content_html: H, excerpt_html, meta, status: "publish", published_at: now, modified_at: now });
    console.log(error ? "insert ERROR: " + error.message : `inserted -> microbe#${id} (${TAXON.slug})`);
  }
}
