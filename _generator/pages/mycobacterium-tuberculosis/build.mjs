// Build + publish the "Mycobacterium tuberculosis (M. tb)" MICROBE page, modelled on the
// microsporum-canis microbe template with the standard microbe sidebar: Overview,
// Interventions, FAQs, Research Feed, Update History, References. Overview + Interventions
// are synthesized from the already-published, cited Tuberculosis condition material (same
// verified references). Research Feed = every research-feed that mentions the microbe.
// Run from repo root with .env.local loaded (needs SUPABASE_SERVICE_ROLE_KEY).
import { createClient } from "@supabase/supabase-js";

// ---- references (verified, real URLs — shared with the TB condition page) --------------
const R = {
  who: { name: "Global Tuberculosis Report 2024", authors: "World Health Organization.", date: "WHO, 2024", url: "https://www.who.int/teams/global-tuberculosis-programme/tb-reports" },
  ironhom: { name: "Iron Homeostasis in Mycobacterium tuberculosis: siderophore-mediated iron uptake.", authors: "Sritharan M.", date: "J Bacteriol. 2016", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4999934/" },
  irtab: { name: "Identification of an ABC transporter required for iron acquisition and virulence in M. tuberculosis (IrtAB).", authors: "Rodriguez GM, Smith I.", date: "J Bacteriol. 2006", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC1347291/" },
  ideR: { name: "IdeR controls iron acquisition, storage and survival in macrophages.", authors: "Gold B, Rodriguez GM, et al.", date: "Mol Microbiol. 2001", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC128082/" },
  siderocalin: { name: "Siderocalin (Lcn2) binds carboxymycobactins, defending against mycobacterial infection.", authors: "Holmes MA, et al.", date: "Structure. 2005", url: "https://pubmed.ncbi.nlm.nih.gov/15642259/" },
  overload: { name: "Tuberculosis and iron overload in Africa: a review.", authors: "Gangaidzo IT, Gordeuk VR.", date: "Cent Afr J Med. 1995", url: "https://pubmed.ncbi.nlm.nih.gov/9631102/" },
  ironstatus: { name: "Iron Status Predicts Treatment Failure and Mortality in Tuberculosis Patients.", authors: "Isanaka S, et al.", date: "PLoS One. 2012", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3350480/" },
  nramp1: { name: "SLC11A1 (NRAMP1) polymorphisms and tuberculosis susceptibility: meta-analysis.", authors: "Li X, et al.", date: "PLoS One. 2011", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3026788/" },
  botella: { name: "Mycobacterial P1-type ATPases mediate resistance to zinc poisoning in human macrophages.", authors: "Botella H, et al.", date: "Cell Host Microbe. 2011", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3221041/" },
  copper: { name: "Copper resistance is essential for virulence of Mycobacterium tuberculosis.", authors: "Wolschendorf F, et al.", date: "PNAS. 2011", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3029754/" },
  zncu: { name: "Zinc and copper toxicity in host defense against pathogens: M. tuberculosis as a model.", authors: "Neyrolles O, Mintz E, Catty P.", date: "Front Cell Infect Microbiol. 2013", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3841717/" },
  hepcidin: { name: "Hepcidin-Ferroportin Interaction Controls Systemic Iron Homeostasis.", authors: "Nemeth E, Ganz T.", date: "Int J Mol Sci. 2021", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8235187/" },
  lactoferrin: { name: "Lactoferrin corrects iron-overload susceptibility to tuberculosis.", authors: "Schaible UE, et al.", date: "J Exp Med. 2002", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2194267/" },
  calprotectin: { name: "Molecular basis for manganese sequestration by calprotectin.", authors: "Damo SM, et al.", date: "PNAS. 2013", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3593839/" },
  dosr: { name: "The M. tuberculosis DosR regulon and recovery from nonrespiring dormancy.", authors: "Leistikow RL, et al.", date: "J Bacteriol. 2010", url: "https://journals.asm.org/doi/10.1128/jb.00926-09" },
  hypoxia: { name: "M. tuberculosis relies on trace oxygen to survive hypoxic environments (obligate aerobe).", authors: "Kalia NP, et al.", date: "Cell Rep. 2023", url: "https://pubmed.ncbi.nlm.nih.gov/37115669/" },
  gutlung: { name: "The microbiome and the gut-lung axis in tuberculosis.", authors: "Alvarado-Pena N, et al.", date: "Front Microbiol. 2023", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10643882/", review: "/research-feeds/the-potential-mechanism-of-the-progression-from-latent-to-active-tuberculosis-based-on-the-intestinal-microbiota-alterations/" },
  cheung: { name: "Sputum microbiota in tuberculosis as revealed by 16S rRNA pyrosequencing.", authors: "Cheung MK, et al.", date: "PLoS One. 2013", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3554703/" },
  kayongo: { name: "Airway microbiome signature discriminates M. tuberculosis infection status.", authors: "Kayongo A, et al.", date: "iScience. 2024", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11187240/" },
  segal: { name: "Enrichment of the lung microbiome with oral taxa drives a Th17 inflammatory phenotype.", authors: "Segal LN, et al.", date: "Nat Microbiol. 2016", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5010013/" },
  scfa: { name: "Diabetes, short-chain fatty acids and increased tuberculosis susceptibility.", authors: "Lachmandas E, et al.", date: "J Diabetes Res. 2016", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4709651/" },
  gsh: { name: "Synergistic effects of NAC and first-line antibiotics in the granulomatous response to Mtb.", authors: "Teskey G, et al.", date: "Front Immunol. 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6144952/" },
  amaral: { name: "N-acetylcysteine exhibits potent anti-mycobacterial activity.", authors: "Amaral EP, et al.", date: "BMC Microbiol. 2016", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5084440/" },
  wallis: { name: "Adjunctive N-Acetylcysteine and Lung Function in Pulmonary Tuberculosis.", authors: "Wallis RS, et al.", date: "NEJM Evid. 2024", url: "https://pubmed.ncbi.nlm.nih.gov/39189858/" },
  jolliffe: { name: "Adjunctive vitamin D in tuberculosis treatment: meta-analysis of individual participant data.", authors: "Jolliffe DA, et al.", date: "Eur Respir J. 2019", url: "https://pubmed.ncbi.nlm.nih.gov/30728208/" },
  vitdcath: { name: "Vitamin D3 induces autophagy in human macrophages via cathelicidin.", authors: "Yuk JM, et al.", date: "Cell Host Microbe. 2009", url: "https://www.cell.com/cell-host-microbe/fulltext/S1931-3128(09)00283-2" },
  schon: { name: "Arginine as an adjuvant to chemotherapy improves clinical outcome in active tuberculosis.", authors: "Schon T, et al.", date: "Eur Respir J. 2003", url: "https://publications.ersnet.org/content/erj/21/3/483" },
  actor: { name: "Lactoferrin: a modulator of immunity against tuberculosis-related granulomatous pathology.", authors: "Hwang SA, Actor JK.", date: "Mediators Inflamm. 2015", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4691619/" },
  degner: { name: "Metformin use reverses increased mortality associated with diabetes during TB treatment.", authors: "Degner NR, et al.", date: "Clin Infect Dis. 2018", url: "https://academic.oup.com/cid/article/66/2/198/4161913" },
  cholesterol: { name: "The impact of M. tuberculosis on the macrophage cholesterol metabolism pathway.", authors: "—", date: "Front Immunol. 2024", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11169584/" },
  statinmouse: { name: "Statin adjunctive therapy shortens TB treatment in mice.", authors: "Dutta NK, et al.", date: "J Antimicrob Chemother. 2016", url: "https://academic.oup.com/jac/article/71/6/1570/1751024" },
  murray: { name: "The adverse effect of iron repletion on the course of certain infections.", authors: "Murray MJ, et al.", date: "Br Med J. 1978", url: "https://pubmed.ncbi.nlm.nih.gov/361162/" },
  nienaber: { name: "Iron status and supplementation during tuberculosis.", authors: "Nienaber A, et al.", date: "Microorganisms. 2023", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10055784/" },
};

// ---- citation engine (endo-faithful) --------------------------------------------------
const order = [];
const numByKey = new Map();
function cite(...keys) {
  let out = "";
  for (const k of keys) {
    if (!R[k]) throw new Error("unknown ref: " + k);
    if (!numByKey.has(k)) { order.push(k); numByKey.set(k, order.length); }
    const n = numByKey.get(k), r = R[k];
    const rev = r.review ? ` data-review-link="${r.review}"` : "";
    out += `<sup><a class="rgbc-reference rgbc-tooltip js-rgbc-scroll-link" href="#ref-${k}" id="ref-${k}-back" data-title="${esc(r.authors)}" data-link="${r.url}" data-link-name="${esc(r.name)}" data-date="${esc(r.date)}"${rev} target="_blank" data-options="position:left" title=".wiki-ref-${k}">[${n}]</a></sup>`;
  }
  return out;
}
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
const P = (s) => `<p class="wp-block-paragraph">${s}</p>`;
const dlink = (href, text) => `<a href="${href}" target="_blank">${text}</a>`;

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ---- page body ------------------------------------------------------------------------
let H = "";

H += `<h2 class="wp-block-heading" id="h-overview">Overview</h2>`;
H += P(`<em>Mycobacterium tuberculosis</em> (Mtb) is the obligate-aerobic, acid-fast bacillus that causes ${dlink("/conditions/tuberculosis/", "tuberculosis")} (TB) and remains one of the world's deadliest single pathogens.${cite("who")} Spread by respiratory aerosols, it is an intracellular parasite of the macrophage: after phagocytosis it arrests phagosome maturation and persists in the very cell meant to kill it. Most infected hosts contain the bacillus in a clinically silent <em>latent</em> state, while roughly 5&ndash;10% progress to <em>active</em> disease&mdash;an outcome set at the host&ndash;pathogen interface rather than by the organism alone.`);
H += P(`What makes Mtb distinctive on this database is how it fights for metals and oxygen. It is, above all, an iron pirate: it strips host iron using the siderophores mycobactin and carboxymycobactin, imported through the IrtAB transporter under IdeR control,${cite("ironhom", "irtab", "ideR")} while the host withholds iron through hepcidin, lactoferrin, transferrin, and siderocalin.${cite("siderocalin")} Because iron feeds the bacillus, iron loading and high ferritin track with worse outcomes${cite("overload", "ironstatus")}&mdash;the low serum iron of active TB is usually host defense, not a deficiency to correct.`);

H += `<h3 class="wp-block-heading" id="h-biology"><strong>Biology &amp; lifestyle</strong></h3>`;
H += P(`Mtb is a slow-growing obligate aerobe. Inside the granuloma's caseous core it meets falling oxygen, and because it cannot ferment, hypoxia does not kill it&mdash;it forces a non-replicating dormancy through the DosR regulon, the molecular basis of latency and of decades-long persistence.${cite("dosr", "hypoxia")} Reoxygenation permits regrowth, which is why raising tissue oxygen is the wrong lever for TB&mdash;the opposite of anaerobe-dominated infections. The bacillus is, however, vulnerable to host redox chemistry: glutathione and its precursor N-acetylcysteine have direct anti-mycobacterial activity within the granuloma.${cite("gsh")}`);

H += `<h3 class="wp-block-heading" id="h-metallome"><strong>Metallome &amp; virulence</strong></h3>`;
H += P(`The macrophage attacks Mtb with metal in two directions at once: iron and manganese <em>withholding</em>, and copper and zinc <em>intoxication</em>.${cite("zncu")} Mtb survives copper poisoning through the efflux ATPase CtpV, the copper sensor CsoR, and the channel MctB&mdash;all virulence-essential, such that loss of copper resistance cripples the bacillus${cite("copper")}&mdash;and counters phagosomal zinc with the P-type ATPase CtpC.${cite("botella")} On the host side, neutrophil calprotectin sequesters manganese and zinc${cite("calprotectin")} and the phagosomal transporter NRAMP1/SLC11A1 pumps iron and manganese away from the bacillus, with SLC11A1 variants reproducibly linked to susceptibility.${cite("nramp1")}`);

H += `<h3 class="wp-block-heading" id="h-host-defense"><strong>How the host fights it</strong></h3>`;
H += P(`Beyond the phagosomal metal battle, the host deploys systemic ${dlink("/definition/nutritional-immunity/", "nutritional immunity")}: IL-6 drives ${dlink("/definition/hepcidin/", "hepcidin")}, degrading ferroportin to produce the hypoferremia and anemia of inflammation that starve the bacillus;${cite("hepcidin")} ${dlink("/interventions/lactoferrin/", "lactoferrin")} reinforces iron-withholding and lowers mycobacterial burden in iron-overloaded hosts;${cite("lactoferrin")} and siderocalin intercepts Mtb's carboxymycobactin directly.${cite("siderocalin")} At the mucosa, the airway and gut microbiome shape this defense&mdash;active disease shows a collapse of airway diversity with enrichment of oral-origin anaerobes,${cite("cheung", "kayongo", "segal")} and gut-lung-axis dysbiosis with loss of short-chain-fatty-acid producers may blunt protective immunity${cite("scfa", "gutlung")} (associative, and heavily antibiotic-confounded).`);

// ----- Interventions -----
H += `<h2 class="wp-block-heading" id="h-interventions">Interventions</h2>`;
H += P(`${dlink("/our-validation-method/", "Our validation method")} evaluates each candidate against <em>M. tuberculosis</em> with the Triangle Test, then classifies it as Validated, Promising Candidate, or Validation In Progress. All of the below are host-directed adjuncts to standard multidrug chemotherapy (isoniazid, rifampicin, pyrazinamide, ethambutol, or the appropriate drug-resistant regimen); none replaces it.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Intervention</th><th>Classification</th><th>Status</th></tr></thead><tbody>`
  + `<tr><td>N-acetylcysteine (NAC)</td><td>Supplement</td><td>Promising Candidate</td></tr>`
  + `<tr><td>Vitamin D</td><td>Supplement</td><td>Promising Candidate</td></tr>`
  + `<tr><td>L-arginine / nitric oxide</td><td>Supplement</td><td>Promising Candidate</td></tr>`
  + `<tr><td>${dlink("/interventions/lactoferrin/", "Lactoferrin")}</td><td>Supplement</td><td>Validation In Progress</td></tr>`
  + `<tr><td>Iron restriction / chelation</td><td>Diet / Pharmaceutical</td><td>Validation In Progress</td></tr>`
  + `</tbody></table></figure>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">How do these interventions act on M. tuberculosis?</span></summary><figure class="wp-block-table"><table class="has-fixed-layout"><tbody>`
  + `<tr><td><strong>Intervention</strong></td><td><strong>Classification</strong></td><td><strong>Notes</strong></td></tr>`
  + `<tr><td>N-acetylcysteine (NAC)</td><td>Supplement</td><td>Restores glutathione and is directly anti-mycobacterial;${cite("amaral")} a 140-patient RCT confirmed glutathione repletion and better lung-function recovery but no faster culture conversion.${cite("wallis")}</td></tr>`
  + `<tr><td>Vitamin D</td><td>Supplement</td><td>Induces cathelicidin (LL-37) and autophagy against intracellular Mtb;${cite("vitdcath")} an IPD meta-analysis found no overall culture-conversion benefit but marked acceleration in multidrug-resistant TB.${cite("jolliffe")}</td></tr>`
  + `<tr><td>L-arginine</td><td>Supplement</td><td>Substrate for macrophage nitric oxide; one RCT positive in HIV-negative patients.${cite("schon")}</td></tr>`
  + `<tr><td>${dlink("/interventions/lactoferrin/", "Lactoferrin")}</td><td>Supplement</td><td>Reinforces iron-withholding and shifts immunity toward Th1; reduces Mtb burden in iron-overloaded models.${cite("actor", "lactoferrin")}</td></tr>`
  + `<tr><td>Metformin</td><td>Drug Repurposing</td><td>AMPK-driven autophagy; observational mortality benefit in diabetics with TB.${cite("degner")}</td></tr>`
  + `<tr><td>Statins</td><td>Drug Repurposing</td><td>Mtb consumes host cholesterol;${cite("cholesterol")} statins shorten treatment in mice.${cite("statinmouse")}</td></tr>`
  + `</tbody></table></figure></details>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">What should be avoided (STOP)?</span></summary>`
  + P(`Routine iron supplementation during active TB: the low serum iron is hepcidin-driven sequestration (host defense), not deficiency, and exogenous iron can feed Mtb's siderophore machinery while iron loading independently worsens outcomes.${cite("murray", "nienaber")} Reserve iron for documented true iron-deficiency anemia, cautiously.`)
  + `</details>`;

// ----- FAQs (heading only; quick-answers injected at render) -----
H += `<h2 class="wp-block-heading" id="h-faqs">FAQs</h2>`;

// ----- Research Feed: every study that mentions the microbe ------------------------------
const { data: studies } = await db
  .from("content_items")
  .select("slug,title,excerpt_html,modified_at,published_at,meta")
  .eq("type", "research-feed").eq("status", "publish")
  .textSearch("search_tsv", "Mycobacterium tuberculosis", { type: "websearch", config: "english" })
  .order("modified_at", { ascending: false, nullsFirst: false });
const RF = studies || [];
const SVG_PLUS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="12" height="12" style="margin:auto"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path></svg>`;
const SVG_MINUS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="12" height="12" style="margin:auto"><path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>`;
const SVG_DOC = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
const SVG_LINK = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
const SVG_MAIL = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
const plain = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
H += `<h2 class="wp-block-heading" id="h-research-feed">Research Feed</h2>`;
H += `<div class="research-feed accordion" data-accordion-disable-auto-close="true">`;
for (const s of RF) {
  const url = "/research-feeds/" + s.slug;
  const paper = s.meta?.feed?.paper_url || null;
  const year = (s.modified_at || s.published_at || "").slice(0, 4);
  const mailto = `mailto:?subject=${encodeURIComponent(s.title)}&body=${encodeURIComponent(paper || ("https://microbiomemedicine.com" + url))}`;
  H += `<div class="research-feed__item accordion__item">`
    + `<div class="research-feed__header-wrap accordion__header"><div class="research-feed__toggle-icon-wrap"><span class="research-feed__toggle-icon research-feed__toggle-icon--plus">${SVG_PLUS}</span><span class="research-feed__toggle-icon research-feed__toggle-icon--minus">${SVG_MINUS}</span></div><div class="research-feed__title">${esc(s.title)}</div></div>`
    + `<div class="research-feed__sub-header"><div class="research-feed__sub-header-item research-feed__sub-header-item--date">${esc(year)}</div><div class="research-feed__sub-header-item">/</div><div class="research-feed__sub-header-item"><div class="research-feed__categories"><div class="research-feed__category-wrap">Research Feed</div></div></div></div>`
    + `<div class="research-feed__excerpt">${esc(plain(s.excerpt_html))}</div>`
    + `<div class="research-feed__content accordion__content"><p class="wp-block-paragraph">${esc(plain(s.excerpt_html))}</p><p class="wp-block-paragraph">${dlink(url, "Read the full study summary →")}</p></div>`
    + `<div class="research-feed__footer"><div><a class="btn" href="${url}">${SVG_DOC}Open</a><a class="btn" href="${paper || url}" target="_blank" rel="noreferrer">${SVG_LINK}Link</a><a class="btn" href="${mailto}">${SVG_MAIL}Email</a></div></div>`
    + `</div>`;
}
H += `</div>`;

// ----- Update History -----
H += `<h2 class="wp-block-heading" id="h-update-history">Update History</h2>`;
H += `<div class="mbio-update-history"><div class="mbio-update-history__content"><article class="mbio-card"><div class="mbio-card__border"></div><p class="mbio-card__date">2026-06-27</p><span class="mbio-card__title">Mycobacterium tuberculosis <span class="mbio-card__type btn btn--rounded">major</span></span><div class="mbio-card__content"><p class="wp-block-paragraph">Microbe page published: biology, metallome &amp; virulence, host nutritional immunity, triangle-tested interventions, and the full research feed of studies mentioning the organism.</p></div></article></div></div>`;

// ----- References -----
H += `<h2 class="wp-block-heading" id="h-references">References</h2><ol class="rgbc-references">`;
for (const k of order) {
  const r = R[k];
  H += `<li class="rgbc-references__item" id="ref-${k}"><a class="rgbc-references__link" href="${r.url}" target="_blank">${esc(r.name)}</a> ${esc(r.authors)} <span>(${esc(r.date)})</span>${r.review ? ` <a class="rgbc-references__review" href="${r.review}" target="_blank">[Review]</a>` : ""}</li>`;
}
H += `</ol>`;
for (const k of order) {
  const r = R[k];
  H += `<div class="tooltip wiki-ref-${k}"><div class="tooltip__header">Reference [${numByKey.get(k)}]</div><div class="tooltip__content"><p>${esc(r.name)}</p><p><em>${esc(r.authors)} ${esc(r.date)}</em></p><a href="${r.url}" target="_blank">View source</a>${r.review ? ` &middot; <a href="${r.review}" target="_blank">Review</a>` : ""}</div></div>`;
}

console.log(`built content_html: ${H.length} chars · refs: ${order.length} · studies: ${RF.length}`);

// ---- publish --------------------------------------------------------------------------
if (process.argv.includes("--publish")) {
  const slug = "mycobacterium-tuberculosis-m-tb";
  const title = "Mycobacterium tuberculosis (M. tb)";
  const excerpt_html = "<p>Mycobacterium tuberculosis (Mtb) is the obligate-aerobic, acid-fast bacillus that causes tuberculosis — an intracellular macrophage pathogen and iron pirate that survives phagosomal copper/zinc intoxication and granuloma hypoxia.</p>";
  const meta = {
    did_you_know: "Mycobacterium tuberculosis is an obligate aerobe held dormant by the granuloma's low oxygen — so raising tissue oxygen is the wrong lever, the opposite of anaerobe-driven infections.",
    authors: [{ name: "Karen Pendergrass", orcid: "https://orcid.org/0000-0002-2348-7259", avatar: "https://secure.gravatar.com/avatar/104bc2e8ba283fda6309c14b2eca02fe9612e8793ed62621c691e83230d4a963?s=96&d=mm&r=g" }],
  };
  const { data: existing } = await db.from("content_items").select("id").eq("type", "microbe").eq("slug", slug).maybeSingle();
  const now = new Date().toISOString();
  if (existing) {
    const { error } = await db.from("content_items").update({ title, content_html: H, excerpt_html, meta, modified_at: now }).eq("id", existing.id);
    console.log(error ? "update ERROR: " + error.message : `updated → microbe#${existing.id} (${slug})`);
  } else {
    const { data: maxRow } = await db.from("content_items").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
    const id = (Number(maxRow?.id) || 990015) + 1;
    const { error } = await db.from("content_items").insert({ id, type: "microbe", slug, title, content_html: H, excerpt_html, meta, status: "publish", published_at: now, modified_at: now });
    console.log(error ? "insert ERROR: " + error.message : `inserted → microbe#${id} (${slug})`);
  }
}
