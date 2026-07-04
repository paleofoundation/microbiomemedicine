// Build the "Christensenellaceae" TAXON page (FAMILY, NCBI taxid 990719). Beneficial, highly
// heritable, leanness/health-associated family. Reframed template (Health Associations instead
// of Pathogenicity, Beneficial Role instead of Virulence Factors, supportive interventions).
// Uses real Unicode chars (no HTML entities).
//
// Sidebar: Overview (Morphology, Metabolism, Health Associations, Beneficial Role,
// Vulnerabilities) · Interventions · Conditions · FAQs · Research Feed · Update History ·
// References.  Modes: (stats) | --json <file> | --publish
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseCsvObjects } from "../../lib/csv.mjs";
import { experimentWeight } from "../../lib/grade.mjs";
import { abstractToSections, sectionsToHtml, slugify, buildResearchFeeds } from "../../lib/feeds.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLES = join(HERE, "../../samples/christensenellaceae");
const TAXON = { taxid: "990719", species: "Christensenellaceae", genus: "Christensenellaceae", slug: "christensenellaceae", title: "Christensenellaceae", clade: "f__Christensenellaceae" };

const R = {
  waters: { name: "The human gut bacteria Christensenellaceae are widespread, heritable, and associated with health.", authors: "Waters JL, Ley RE.", date: "BMC Biol. 2019", url: "https://doi.org/10.1186/s12915-019-0699-4" },
  goodrich: { name: "Human genetics shape the gut microbiome.", authors: "Goodrich JK, Waters JL, Poole AC, et al. (Ley RE).", date: "Cell. 2014", url: "https://doi.org/10.1016/j.cell.2014.09.053" },
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
const perStudyCaveats = (o) => { const c = []; if (/16S|PCR/i.test(o.seq)) c.push("family-level marker-gene call; low-abundance fastidious anaerobes"); if (o.host && o.host !== "Homo sapiens") c.push(`non-human host (${o.host})`); if (Math.min(+o.n0 || 999, +o.n1 || 999) < 20) c.push("small cohort"); return c; };
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
const depletedLeaning = downObs > upObs;
const conditionsData = { taxon: TAXON.title, summary: { nConditions: conds.length, nStudies: allByPmid.size, participants: totalParticipants, tier, agreement, enriched: nEnriched, depleted: nDepleted, mixed: nMixed }, rows: conds };

let H = "";
H += `<h2 class="wp-block-heading" id="h-overview">Overview</h2>`;
H += P(`<em>Christensenellaceae</em> is a family of strictly anaerobic bacteria in the phylum Firmicutes and one of the most intriguing health-associated groups in the human gut. Its relative abundance is inversely related to body mass index across many populations and studies, making its link to leanness the most robust and reproducible connection between the gut microbiome and metabolic health reported to date.${cite("waters")} On this database it appears as a differentially abundant taxon across many human microbiome studies, usually as a marker of a healthier, leaner state.`);
H += P(`What makes <em>Christensenellaceae</em> distinctive is that it is the most heritable taxon in the human gut. In large twin studies its abundance is strongly shaped by host genetics, and it sits at the center of a co-occurrence network with other heritable bacteria and methane-producing archaea.${cite("goodrich")} It is enriched in lean individuals, and transplanting a cultured member (<em>Christensenella minuta</em>) into mice reduced weight gain, hinting at a causal role.${cite("goodrich")}`);

H += `<h3 class="wp-block-heading" id="h-morphology"><strong>Morphology</strong></h3>`;
H += P(`The <em>Christensenellaceae</em> are strictly anaerobic bacteria in the phylum Firmicutes; the type genus <em>Christensenella</em> comprises non-motile, non-spore-forming rods.${cite("waters")} The family is widespread across human populations and, though usually present at low abundance, is a consistent member of the healthy gut community.${cite("waters")}`);

H += `<h3 class="wp-block-heading" id="h-metabolism"><strong>Metabolism</strong></h3>`;
H += P(`Members of <em>Christensenellaceae</em> are fermentative anaerobes that produce short-chain fatty acids and hydrogen. Their hydrogen output supports a syntrophic partnership with hydrogen-consuming methanogenic archaea, and this metabolic network is part of why they co-occur with methanogens and with a lean metabolic profile.${cite("goodrich", "waters")}`);

H += `<h3 class="wp-block-heading" id="h-health-associations"><strong>Health Associations</strong></h3>`;
H += P(`<em>Christensenellaceae</em> is one of the clearest examples of a health-associated gut microbe. Its abundance is inversely correlated with BMI across independent cohorts, the most reproducible microbiome-to-metabolic-disease link described so far, and it is associated with a healthy status in other contexts including inflammatory bowel disease.${cite("waters")} Because it is highly heritable, part of its association with health reflects host genetics as well as environment.${cite("goodrich")}`);

H += `<h3 class="wp-block-heading" id="h-beneficial-role"><strong>Beneficial Role</strong></h3>`;
H += P(`Where a pathogen page lists virulence factors, <em>Christensenellaceae</em>'s notable features are the ones tied to host health.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Feature</th><th>Description and role</th></tr></thead><tbody>`
  + `<tr><td>${mred("Association with leanness")}</td><td>Higher <em>Christensenellaceae</em> tracks lower BMI across populations; amending an obese-associated microbiome with <em>Christensenella minuta</em> reduced weight gain in mice.${cite("goodrich")}</td></tr>`
  + `<tr><td>${mred("Short-chain fatty acids and hydrogen")}</td><td>Fermentation products and hydrogen feed a syntrophic network with methanogens, contributing to a metabolically favorable community.${cite("goodrich", "waters")}</td></tr>`
  + `<tr><td>${mred("Heritability and keystone position")}</td><td>As the most heritable gut taxon and the hub of a co-occurrence network, it marks a stable, health-associated community structure.${cite("goodrich")}</td></tr>`
  + `</tbody></table></figure>`;

H += `<h3 class="wp-block-heading" id="h-vulnerabilities"><strong>Vulnerabilities</strong></h3>`;
H += P(`For a health-associated family, the honest "vulnerabilities" are the limits on our ability to study and modulate it.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Consideration</th><th>Why it matters</th></tr></thead><tbody>`
  + `<tr><td>${mred("Strong host-genetic control")}</td><td>Because its abundance is heavily influenced by host genetics, <em>Christensenellaceae</em> may respond less to diet or supplements than other taxa, which complicates efforts to raise it.${cite("goodrich", "waters")}</td></tr>`
  + `<tr><td>${mred("Low abundance, hard to culture")}</td><td>It is usually present at low levels and its members are fastidious anaerobes, so detecting and cultivating it is challenging.${cite("waters")}</td></tr>`
  + `<tr><td>${mred("Mechanisms still emerging")}</td><td>The pathways linking <em>Christensenellaceae</em> to health are still being worked out, so any intervention remains exploratory.${cite("waters")}</td></tr>`
  + `</tbody></table></figure>`;

H += `<h2 class="wp-block-heading" id="h-interventions">Interventions</h2>`;
H += P(`For a health-associated family, an intervention is anything that supports it or the community it anchors. Everything below is exploratory and is <strong>not</strong> medical advice; each is classified by ${dlink("/our-validation-method/", "our validation method")}. An important caveat is that <em>Christensenellaceae</em> is strongly heritable, so it may be less modifiable than other microbes.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Intervention</th><th>Class</th><th>Status</th></tr></thead><tbody>`
  + `<tr><td>Support a diverse, fiber-fed anaerobic community</td><td>Diet</td><td>Validation In Progress</td></tr>`
  + `<tr><td><em>Christensenella minuta</em> as a candidate probiotic</td><td>Concept</td><td>Validation In Progress</td></tr>`
  + `</tbody></table></figure>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">How do these relate to Christensenellaceae?</span></summary><figure class="wp-block-table"><table class="has-fixed-layout"><tbody>`
  + `<tr><td><strong>Intervention</strong></td><td><strong>Mechanism</strong></td></tr>`
  + `<tr><td>Support a diverse anaerobic community</td><td><em>Christensenellaceae</em> anchors a co-occurrence network of heritable bacteria and methanogens, so supporting that community may help sustain it, though host genetics set much of its level.${cite("goodrich", "waters")}</td></tr>`
  + `<tr><td><em>Christensenella minuta</em> probiotic</td><td>In mice, adding <em>C. minuta</em> to an obese-associated microbiome reduced weight gain, the basis for interest in it as a probiotic.${cite("goodrich")}</td></tr>`
  + `</tbody></table></figure></details>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">What should be avoided (STOP)?</span></summary>`
  + P(`Over-interpreting a single abundance value. Because <em>Christensenellaceae</em> is strongly heritable and usually low-abundance, its level reflects host genetics and detection sensitivity as much as anything modifiable.${cite("goodrich", "waters")}`)
  + `</details>`;

H += `<h2 class="wp-block-heading" id="h-conditions">Conditions</h2>`;
H += P(`Where <em>Christensenellaceae</em> (NCBI:txid${TAXON.taxid}) appears as a differentially abundant taxon across the Microbiome Medicine corpus. Each row aggregates every experiment in which the family moved in a given condition; <em>direction</em> is its change in the case/exposure group, and <em>grade</em> is the strongest single study's methodology weight (A·D·S·C·R), the same engine that grades every signature on this site.`);
H += P(`Across <strong>${conds.length}</strong> conditions and <strong>${allByPmid.size}</strong> studies, it is enriched in ${nEnriched}, depleted in ${nDepleted}, and direction-conflicting in ${nMixed}. Consistent with its role as a health- and leanness-associated family, the signal ${depletedLeaning ? "leans toward depletion: it is lost more often than gained across disease states" : "is mixed across disease states"}. Because it is strongly heritable and its loss marks a less healthy community rather than a specific disease mechanism, the aggregate evidence tier is <strong>${tier}</strong>.`);
H += `<div class="mbio-note"><p><span class="mbio-note__lead">How to read these.</span> <em>Christensenellaceae</em> is a genuine, health-associated resident, so a <em>depletion</em> here usually marks a less healthy or higher-BMI state rather than a cause of the condition. It is family-level, low-abundance, and strongly heritable, so its level partly reflects host genetics and detection sensitivity. Read a decline as a marker of a less favorable community, not a target to remove. This is why the aggregate tier stays ${tier}.</p></div>`;
H += `<!--CONDITIONS_TABLE-->`;

H += `<h2 class="wp-block-heading" id="h-faqs">FAQs</h2>`;
const FAQ = [
  ["Is Christensenellaceae good or bad?", `Good. <em>Christensenellaceae</em> is a health-associated family, most strongly and reproducibly linked to leanness and metabolic health.${cite("waters")} It is usually more abundant in leaner, healthier people, so a low level tends to mark a less favorable state.`],
  ["What is Christensenellaceae associated with?", `Lower body mass index across many populations, the most reproducible link between the gut microbiome and metabolic disease found so far, and a healthy status in contexts including inflammatory bowel disease.${cite("waters")}`],
  ["Why is Christensenellaceae important?", `It is the most heritable microbe in the human gut and the hub of a network of heritable bacteria and methanogens.${cite("goodrich")} Transplanting <em>Christensenella minuta</em> into mice reduced weight gain, suggesting it may actively contribute to leanness.${cite("goodrich")}`],
  ["How do you increase Christensenellaceae?", `This is genuinely hard, because its abundance is largely set by host genetics.${cite("goodrich")} Supporting a diverse, fiber-fed anaerobic community may help, and <em>Christensenella minuta</em> is being explored as a probiotic. These are research-stage ideas, not medical advice.`],
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
H += P(`Internal summaries of the ${rfStudies.length} studies we reviewed in which <em>Christensenellaceae</em> was a differential taxon across this corpus.`);
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
H += `<div class="mbio-update-history"><div class="mbio-update-history__content"><article class="mbio-card"><div class="mbio-card__border"></div><p class="mbio-card__date">2026-07-04</p><span class="mbio-card__title">Christensenellaceae <span class="mbio-card__type btn btn--rounded">major</span></span><div class="mbio-card__content"><p class="wp-block-paragraph">Taxon page created: biology (morphology, metabolism, heritability and health associations), the beneficial role and the limits on modulating it, exploratory interventions, the data-derived Conditions table across ${conds.length} conditions, and the full research feed.</p></div></article></div></div>`;

H += `<h2 class="wp-block-heading" id="h-references">References</h2><ol class="rgbc-references">`;
for (const k of order) { const r = R[k]; H += `<li class="rgbc-references__item" id="ref-${k}"><a class="rgbc-references__link" href="${r.url}" target="_blank">${esc(r.name)}</a> ${esc(r.authors)} <span>(${esc(r.date)})</span></li>`; }
H += `</ol>`;
for (const k of order) { const r = R[k]; H += `<div class="tooltip rgbc-reference-tooltip wiki-ref-${k}"><div class="tooltip__content rgbc-reference-tooltip__content"><p>${esc(r.authors)}</p><a href="${r.url}" target="_blank">${esc(r.name)}</a><p>${esc(r.date)}</p></div></div>`; }

const meta = {
  did_you_know: "Christensenellaceae is the most heritable microbe in your gut, and the more of it you have, the leaner you tend to be. Transplanting it into mice even reduced their weight gain.",
  authors: [{ name: "Karen Pendergrass", orcid: "https://orcid.org/0000-0002-2348-7259", avatar: "https://secure.gravatar.com/avatar/104bc2e8ba283fda6309c14b2eca02fe9612e8793ed62621c691e83230d4a963?s=96&d=mm&r=g" }],
  conditions: conditionsData,
};
const excerpt_html = "<p>Christensenellaceae is a family of beneficial gut bacteria most strongly and reproducibly linked to leanness and metabolic health. It is the most heritable taxon in the human gut, and on this database its signal usually marks a healthier, leaner community.</p>";

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
    let nid = Number(maxRf?.id) || 991000;
    for (const r of rfRows) { nid++; const { error } = await db.from("content_items").insert({ id: nid, type: "research-feed", slug: r.slug, title: r.title, content_html: r.content_html, excerpt_html: r.excerpt_html, meta: r.meta, status: "publish", published_at: r.published_at || now, modified_at: now }); if (error) console.log(`RF insert ERROR (${r.slug}): ${error.message}`); }
    console.log(`research-feed: created ${rfRows.length} new page(s), reused ${studies.length - rfRows.length}`);
  } else { console.log(`research-feed: all ${studies.length} studies already have pages (reused)`); }
  let rfUpdated = 0;
  for (const s of studies) { const title = (s["Title"] || "").trim(); if (!title) continue; const pmid = (s["PMID"] || s["Study page name"] || "").trim(); if (!AUTHORED[pmid]) continue; const { data: upd, error } = await db.from("content_items").update({ content_html: sectionsToHtml(AUTHORED[pmid].sections), excerpt_html: AUTHORED[pmid].excerpt, modified_at: now }).eq("type", "research-feed").eq("slug", slugify(title)).select("id"); if (error) console.log(`RF update ERROR: ${error.message}`); else if (upd?.length) rfUpdated += upd.length; }
  console.log(`research-feed: refreshed ${rfUpdated} page(s) with authored summaries`);
  const { data: existing } = await db.from("content_items").select("id").eq("type", "microbe").eq("slug", TAXON.slug).maybeSingle();
  if (existing) { const { error } = await db.from("content_items").update({ title: TAXON.title, content_html: H, excerpt_html, meta, modified_at: now }).eq("id", existing.id); console.log(error ? "update ERROR: " + error.message : `updated -> microbe#${existing.id} (${TAXON.slug})`); }
  else { const { data: maxRow } = await db.from("content_items").select("id").order("id", { ascending: false }).limit(1).maybeSingle(); const id = (Number(maxRow?.id) || 991000) + 1; const { error } = await db.from("content_items").insert({ id, type: "microbe", slug: TAXON.slug, title: TAXON.title, content_html: H, excerpt_html, meta, status: "publish", published_at: now, modified_at: now }); console.log(error ? "insert ERROR: " + error.message : `inserted -> microbe#${id} (${TAXON.slug})`); }
}
