// Build the Tuberculosis condition page content_html in the canonical endometriosis
// gold-standard structure (Overview>Primer, Interventions tables, STOPs/SWAPs, Research
// Feed cards, Update History, rgbc-references citations + tooltip blocks) and publish it.
// Run from repo root with .env.local loaded (needs SUPABASE_SERVICE_ROLE_KEY).
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ---- references (verified, real URLs) -------------------------------------------------
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
  blood2021: { name: "Iron homeostasis during anemia of inflammation: a prospective study of patients with tuberculosis.", authors: "Cercamondi CI, et al.", date: "Blood. 2021", url: "https://ashpublications.org/blood/article/138/15/1293/475787/" },
  anemia: { name: "Iron deficiency and anemia predict mortality in patients with tuberculosis.", authors: "Isanaka S, et al.", date: "J Nutr. 2012", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3260062/" },
  dosr: { name: "The M. tuberculosis DosR regulon and recovery from nonrespiring dormancy.", authors: "Leistikow RL, et al.", date: "J Bacteriol. 2010", url: "https://journals.asm.org/doi/10.1128/jb.00926-09" },
  hypoxia: { name: "M. tuberculosis relies on trace oxygen to survive hypoxic environments (obligate aerobe).", authors: "Kalia NP, et al.", date: "Cell Rep. 2023", url: "https://pubmed.ncbi.nlm.nih.gov/37115669/" },
  gutlung: { name: "The microbiome and the gut-lung axis in tuberculosis.", authors: "Alvarado-Pena N, et al.", date: "Front Microbiol. 2023", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10643882/", review: "/research-feeds/the-potential-mechanism-of-the-progression-from-latent-to-active-tuberculosis-based-on-the-intestinal-microbiota-alterations/" },
  cheung: { name: "Sputum microbiota in tuberculosis as revealed by 16S rRNA pyrosequencing.", authors: "Cheung MK, et al.", date: "PLoS One. 2013", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3554703/" },
  kayongo: { name: "Airway microbiome signature discriminates M. tuberculosis infection status.", authors: "Kayongo A, et al.", date: "iScience. 2024", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11187240/" },
  segal: { name: "Enrichment of the lung microbiome with oral taxa drives a Th17 inflammatory phenotype.", authors: "Segal LN, et al.", date: "Nat Microbiol. 2016", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5010013/" },
  scfa: { name: "Diabetes, short-chain fatty acids and increased tuberculosis susceptibility.", authors: "Lachmandas E, et al.", date: "J Diabetes Res. 2016", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4709651/" },
  gsh: { name: "Synergistic effects of NAC and first-line antibiotics in the granulomatous response to Mtb.", authors: "Teskey G, et al.", date: "Front Immunol. 2018", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6144952/" },
  whodx: { name: "WHO consolidated guidelines on tuberculosis: Module 3 - Diagnosis.", authors: "World Health Organization.", date: "WHO, 2024", url: "https://www.who.int/publications/i/item/9789240089488" },
  anemiarev: { name: "Tuberculosis-Associated Anemia: A Narrative Review.", authors: "Dasaradhan T, et al.", date: "Cureus. 2022", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9447415/" },
  wallis: { name: "Adjunctive N-Acetylcysteine and Lung Function in Pulmonary Tuberculosis.", authors: "Wallis RS, et al.", date: "NEJM Evid. 2024", url: "https://pubmed.ncbi.nlm.nih.gov/39189858/" },
  amaral: { name: "N-acetylcysteine exhibits potent anti-mycobacterial activity.", authors: "Amaral EP, et al.", date: "BMC Microbiol. 2016", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5084440/" },
  jolliffe: { name: "Adjunctive vitamin D in tuberculosis treatment: meta-analysis of individual participant data.", authors: "Jolliffe DA, et al.", date: "Eur Respir J. 2019", url: "https://pubmed.ncbi.nlm.nih.gov/30728208/" },
  actor: { name: "Lactoferrin: a modulator of immunity against tuberculosis-related granulomatous pathology.", authors: "Hwang SA, Actor JK.", date: "Mediators Inflamm. 2015", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4691619/" },
  schon: { name: "Arginine as an adjuvant to chemotherapy improves clinical outcome in active tuberculosis.", authors: "Schon T, et al.", date: "Eur Respir J. 2003", url: "https://publications.ersnet.org/content/erj/21/3/483" },
  ralph: { name: "L-arginine and vitamin D adjunctive therapies in pulmonary TB: a randomised placebo-controlled trial.", authors: "Ralph AP, et al.", date: "PLoS One. 2013", url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0070032" },
  metfrct: { name: "Randomized trial of metformin with anti-TB drugs for early sputum conversion.", authors: "Padmapriyadarsini C, et al.", date: "Clin Infect Dis. 2022", url: "https://academic.oup.com/cid/article/75/3/425/6444297" },
  degner: { name: "Metformin use reverses increased mortality associated with diabetes during TB treatment.", authors: "Degner NR, et al.", date: "Clin Infect Dis. 2018", url: "https://academic.oup.com/cid/article/66/2/198/4161913" },
  statinmouse: { name: "Statin adjunctive therapy shortens TB treatment in mice.", authors: "Dutta NK, et al.", date: "J Antimicrob Chemother. 2016", url: "https://academic.oup.com/jac/article/71/6/1570/1751024" },
  statinobs: { name: "Statin use and risk of tuberculosis: a systematic review of observational studies.", authors: "Duan H, et al.", date: "Int J Infect Dis. 2020", url: "https://www.ijidonline.com/article/S1201-9712(20)30038-2/fulltext" },
  zincneg: { name: "Zinc and vitamin A supplementation fails to reduce sputum conversion time in malnourished TB.", authors: "Pakasi TA, et al.", date: "Nutr J. 2010", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2957385/" },
  pba: { name: "Oral phenylbutyrate and vitamin D3 adjunctive therapy in pulmonary TB: a randomized controlled trial.", authors: "Mily A, et al.", date: "PLoS One. 2015", url: "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0138340" },
  murray: { name: "The adverse effect of iron repletion on the course of certain infections.", authors: "Murray MJ, et al.", date: "Br Med J. 1978", url: "https://pubmed.ncbi.nlm.nih.gov/361162/" },
  nienaber: { name: "Iron status and supplementation during tuberculosis.", authors: "Nienaber A, et al.", date: "Microorganisms. 2023", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10055784/" },
  cholesterol: { name: "The impact of M. tuberculosis on the macrophage cholesterol metabolism pathway.", authors: "—", date: "Front Immunol. 2024", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11169584/" },
  vitdcath: { name: "Vitamin D3 induces autophagy in human macrophages via cathelicidin.", authors: "Yuk JM, et al.", date: "Cell Host Microbe. 2009", url: "https://www.cell.com/cell-host-microbe/fulltext/S1931-3128(09)00283-2" },
};

// ---- citation engine (endo-faithful) --------------------------------------------------
const order = [];           // ref keys in first-appearance order
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
const dlink = (href, text) => `<a href="${href}" target="_blank">${text}</a>`; // internal cross-link

// ---- page body ------------------------------------------------------------------------
let H = "";

H += `<h2 class="wp-block-heading" id="h-overview">Overview</h2>`;
H += P(`Tuberculosis (TB) is a chronic infectious disease caused by <em>Mycobacterium tuberculosis</em> (Mtb), an obligate-aerobic, acid-fast bacillus spread by respiratory aerosols. It remains one of the world's deadliest infections, and most people who are infected contain the bacillus in a clinically silent <em>latent</em> state while roughly 5&ndash;10% progress to <em>active</em> disease.${cite("who")} Whether an exposed host clears, contains, or progresses is a property of the host&ndash;pathogen interface&mdash;not of the organism alone.`);
H += P(`Mtb is the established and undisputed cause of TB. What the single-cause model does not explain is the disease's heterogeneity, and that is what this page addresses through the host ${dlink("/definition/metallomic-signature/", "metallome")}, ${dlink("/definition/nutritional-immunity/", "nutritional immunity")}, and the airway/gut ${dlink("/definition/microbiome-signatures-2/", "microbiome")}. The master variable is iron: Mtb is an intracellular iron pirate that scavenges host iron with the siderophores mycobactin and carboxymycobactin,${cite("ironhom")} while the host withholds it through hepcidin, lactoferrin, transferrin, and siderocalin.${cite("siderocalin")} Because iron loading worsens outcomes,${cite("overload", "ironstatus")} the metallomic lens reframes care&mdash;low serum iron in active TB is usually host defense, not a deficiency to correct, so reflexive iron repletion can feed the pathogen, and because Mtb is an obligate aerobe held in check by granuloma hypoxia, oxygenation strategies such as ${dlink("/interventions/hyperbaric-oxygen-therapy-hbot/", "HBOT")} are the wrong lever.`);

H += `<h3 class="wp-block-heading" id="h-associated-conditions"><strong>Associated Conditions</strong></h3>`;
H += P(`TB risk and severity rise sharply with conditions that weaken cell-mediated immunity or alter the host metallome. The strongest associations are HIV co-infection, ${dlink("/conditions/diabetes/", "diabetes mellitus")} (a bidirectional relationship in which hyperglycaemia impairs immunity and TB worsens glycaemic control),${cite("scfa")} silicosis, undernutrition, smoking and chronic lung disease, and harmful alcohol use. Iron overload is itself a recognised risk factor,${cite("overload")} and active TB commonly produces an anemia of inflammation that independently predicts worse outcomes.${cite("anemia")} Survivors frequently carry long-term post-TB lung disease.`);

H += `<h3 class="wp-block-heading" id="h-causes">Causes</h3>`;
H += P(`The cause of TB is infection with <em>M. tuberculosis</em>; the open question is what determines progression from latent infection to active, tissue-destroying disease. A systems view holds that the outcome is set by interacting constraints&mdash;host iron and redox status, macrophage genetics, the phagosomal metal battle, granuloma oxygen tension, and the surrounding microbiome&mdash;rather than by exposure alone.`);
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">What determines progression from latent to active tuberculosis?</span></summary><figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Determinant</th><th>Role in progression</th></tr></thead><tbody>`
  + `<tr><td>Iron availability</td><td>Iron fuels Mtb growth and biofilm; macrophage/dietary iron loading and high ferritin track with progression and death.${cite("ironstatus", "overload")}</td></tr>`
  + `<tr><td>NRAMP1/SLC11A1 genotype</td><td>The phagosomal metal-efflux transporter; polymorphisms are reproducibly associated with susceptibility.${cite("nramp1")}</td></tr>`
  + `<tr><td>Phagosomal Cu/Zn intoxication</td><td>Macrophages poison the bacillus with copper and zinc; the capacity to resist (or to overwhelm) this defense shapes survival.${cite("botella", "copper")}</td></tr>`
  + `<tr><td>Immune status (HIV, diabetes)</td><td>Loss of effective Th1/macrophage immunity is the dominant driver of reactivation.${cite("scfa")}</td></tr>`
  + `<tr><td>Granuloma oxygen tension</td><td>Hypoxia forces non-replicating dormancy (latency); reoxygenation permits regrowth.${cite("dosr", "hypoxia")}</td></tr>`
  + `<tr><td>Airway/gut microbiome</td><td>Dysbiosis and lost SCFA producers may tilt mucosal immunity toward tolerance (associative, antibiotic-confounded).${cite("gutlung")}</td></tr>`
  + `</tbody></table></figure></details>`;

H += `<h3 class="wp-block-heading" id="h-diagnosis">Diagnosis</h3>`;
H += P(`WHO-recommended rapid molecular tests (NAATs such as Xpert MTB/RIF / Ultra) are the initial diagnostic, detecting Mtb DNA and rifampicin resistance within hours; mycobacterial <strong>culture</strong> remains the reference standard, and sputum-smear microscopy, chest imaging (upper-lobe infiltrates and cavitation), and tests of infection (IGRA, tuberculin skin test&mdash;which cannot distinguish latent from active disease) complete the work-up.${cite("whodx")} Within the metallomic frame, the anemia of active TB is typically an anemia of inflammation&mdash;low serum iron with normal/high ferritin and elevated hepcidin&mdash;a host-defense pattern, not a cue to replete iron.${cite("anemiarev", "blood2021")}`);

H += `<h3 class="wp-block-heading" id="h-primer">Primer</h3>`;
H += P(`The interplay between metal homeostasis, host nutritional immunity, granuloma oxygen ecology, and the airway/gut microbiome explains how a single pathogen produces such varied disease&mdash;and where microbiome- and metal-targeted strategies could intervene.`);

H += `<h4 class="wp-block-heading" id="h-nutritional-immunity">Nutritional Immunity</h4>`;
H += P(`In active TB, IL-6 drives ${dlink("/definition/nutritional-immunity/", "hepcidin")}, which degrades ferroportin to produce hypoferremia and the functional anemia of inflammation;${cite("hepcidin", "blood2021")} lactoferrin and transferrin chelate iron, and ${dlink("/interventions/lactoferrin/", "lactoferrin")} specifically lowers mycobacterial burden in iron-overloaded hosts.${cite("lactoferrin")} Siderocalin (lipocalin-2) intercepts Mtb's carboxymycobactin directly,${cite("siderocalin")} while calprotectin sequesters manganese and zinc.${cite("calprotectin")} The decisive interpretive rule: low serum iron and zinc here are usually the host starving the bacillus&mdash;defenses to support, not deficiencies to override.`);

H += `<h4 class="wp-block-heading" id="h-metallomic-signature">Metallomic Signature</h4>`;
H += P(`The TB metallome is defined by two opposing maneuvers at the host&ndash;pathogen interface: iron and manganese <em>withholding</em> on one side, copper and zinc <em>intoxication</em> on the other&mdash;a coordinated assault that Mtb has evolved a specific toolkit to survive.${cite("zncu")}`);
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">What is the metallomic signature of tuberculosis?</span></summary><figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th>Metal</th><th>Findings</th></tr></thead><tbody>`
  + `<tr><td><mark style="background-color:rgba(0,0,0,0)" class="has-inline-color has-vivid-red-color">Iron</mark></td><td>The master variable. Mtb strips host iron with mycobactin/carboxymycobactin via the IrtAB importer under IdeR control;${cite("ironhom", "irtab", "ideR")} the host withholds it (hepcidin, lactoferrin, siderocalin). Serum iron is low (sequestration), but macrophage/tissue iron loading and high ferritin track with worse outcomes&mdash;<em>do not supplement</em>.${cite("ironstatus", "overload")}</td></tr>`
  + `<tr><td><mark style="background-color:rgba(0,0,0,0)" class="has-inline-color has-vivid-red-color">Copper</mark></td><td>The macrophage floods the phagosome with toxic copper; Mtb survives via the efflux ATPase CtpV, the sensor CsoR, and the channel MctB, all virulence-essential.${cite("copper", "zncu")}</td></tr>`
  + `<tr><td><mark style="background-color:rgba(0,0,0,0)" class="has-inline-color has-vivid-red-color">Zinc</mark></td><td>Host-imposed zinc intoxication of the phagosome is countered by the P-type ATPase CtpC; serum zinc is typically low as a cytokine-driven redistribution, not dietary deficiency.${cite("botella", "zncu")}</td></tr>`
  + `<tr><td><mark style="background-color:rgba(0,0,0,0)" class="has-inline-color has-vivid-red-color">Manganese</mark></td><td>Neutrophil calprotectin sequesters Mn (and Zn), and NRAMP1/SLC11A1 pumps Fe/Mn out of the phagosome&mdash;SLC11A1 variants are linked to susceptibility.${cite("calprotectin", "nramp1")}</td></tr>`
  + `</tbody></table></figure></details>`;

H += P(`Explore the interactive ${dlink("#rgbc-database", "Microbiome Signature")} chart above for the per-taxon metallome panels. The airway signature is dominated by enrichment of oral-origin anaerobes (<em>Prevotella</em>, <em>Streptococcus</em>, <em>Megasphaera</em>, <em>Campylobacter</em>, <em>Kingella</em>) and a collapse of diversity, with active disease often Mtb-dominated;${cite("cheung", "kayongo")} in non-TB lungs the same oral-taxa "pneumotype" provokes a Th17 inflammatory tone.${cite("segal")} Through the gut&ndash;lung axis, depletion of SCFA producers and butyrate may blunt protective Th1/Th17 immunity.${cite("scfa", "gutlung")} These are associations around a known pathogen and are heavily antibiotic-confounded&mdash;interpret each taxon in that light.`);

H += `<h4 class="wp-block-heading" id="h-oxygen-ecology">Oxygen Ecology</h4>`;
H += P(`TB's disease-specific mechanism is oxygen ecology. The granuloma's caseous core becomes hypoxic, and because Mtb is an obligate aerobe, falling O&#8322; does not aid it&mdash;it forces non-replicating dormancy through the DosR regulon, the basis of latency and decades-long persistence.${cite("dosr", "hypoxia")} This is why raising tissue oxygen (HBOT) is the wrong lever for TB&mdash;the exact opposite of anaerobe-dominated conditions. The bacillus is also vulnerable to host redox: glutathione (and its precursor NAC) has direct anti-mycobacterial and immune-enhancing effects in the granuloma.${cite("gsh")}`);

// ----- Interventions -----
H += `<h2 class="wp-block-heading" id="h-interventions">Interventions</h2>`;
H += P(`${dlink("/our-validation-method/", "Our validation method")} evaluates each candidate with the Triangle Test&mdash;does the intervention move a host feature in the predicted direction, does it improve TB clinically, and is that feature causally linked to TB&mdash;then classifies it as Validated, Promising Candidate, or Validation In Progress. All of the below are host-directed <strong>adjuncts to standard multidrug chemotherapy</strong> (isoniazid, rifampicin, pyrazinamide, ethambutol, or the appropriate drug-resistant regimen); none replaces it.`);
H += `<figure class="wp-block-table"><table class="has-fixed-layout"><thead><tr><th><strong>Intervention</strong></th><th><strong>Classification</strong></th><th><strong>Status</strong></th></tr></thead><tbody>`
  + `<tr><td>N-acetylcysteine (NAC)</td><td>Supplement</td><td>Promising Candidate</td></tr>`
  + `<tr><td>Vitamin D</td><td>Supplement</td><td>Promising Candidate</td></tr>`
  + `<tr><td>L-arginine / nitric oxide</td><td>Supplement</td><td>Promising Candidate</td></tr>`
  + `<tr><td>${dlink("/interventions/lactoferrin/", "Lactoferrin")}</td><td>Supplement</td><td>Validation In Progress</td></tr>`
  + `<tr><td>Iron restriction / chelation</td><td>Diet / Pharmaceutical</td><td>Validation In Progress</td></tr>`
  + `</tbody></table></figure>`;
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">What interventions are still in the process of validation?</span></summary><figure class="wp-block-table"><table class="has-fixed-layout"><tbody>`
  + `<tr><td><strong>Intervention</strong></td><td><strong>Classification</strong></td><td><strong>Notes</strong></td></tr>`
  + `<tr><td>N-acetylcysteine (NAC)</td><td>Supplement</td><td>Restores glutathione and has direct anti-Mtb activity;${cite("amaral")} a 140-patient RCT confirmed glutathione repletion and improved lung-function recovery but <em>no</em> faster culture conversion&mdash;promising for tissue protection, not bacterial clearance.${cite("wallis")}</td></tr>`
  + `<tr><td>Vitamin D</td><td>Supplement</td><td>Induces cathelicidin (LL-37) and autophagy;${cite("vitdcath")} an IPD meta-analysis (n=1,850) found no overall culture-conversion benefit but a marked acceleration in multidrug-resistant TB.${cite("jolliffe")}</td></tr>`
  + `<tr><td>L-arginine</td><td>Supplement</td><td>Substrate for macrophage nitric oxide; one RCT positive in HIV-negative patients,${cite("schon")} a larger trial null with no rise in exhaled NO.${cite("ralph")}</td></tr>`
  + `<tr><td>${dlink("/interventions/lactoferrin/", "Lactoferrin")}</td><td>Supplement</td><td>Reinforces iron-withholding and shifts immunity toward Th1; reduces Mtb burden in iron-overloaded models&mdash;preclinical, no human treatment trials yet.${cite("actor", "lactoferrin")}</td></tr>`
  + `<tr><td>Metformin</td><td>Drug Repurposing</td><td>AMPK-driven autophagy; observational mortality benefit in diabetics with TB,${cite("degner")} but an adjunctive RCT did not shorten sputum conversion.${cite("metfrct")}</td></tr>`
  + `<tr><td>Statins</td><td>Drug Repurposing</td><td>Mtb consumes host cholesterol;${cite("cholesterol")} statins shorten treatment in mice${cite("statinmouse")} and are linked to lower TB incidence observationally${cite("statinobs")}&mdash;no efficacy RCT yet.</td></tr>`
  + `<tr><td>Zinc + vitamin A</td><td>Supplement</td><td>Adjunct micronutrients; trials are mixed and a malnourished-patient RCT showed no benefit on sputum conversion&mdash;reasonable for documented deficiency only.${cite("zincneg")}</td></tr>`
  + `<tr><td>Phenylbutyrate + vitamin D</td><td>Supplement</td><td>Both induce cathelicidin; a Bangladesh RCT reported faster clinical recovery and intracellular Mtb killing&mdash;a single positive trial awaiting confirmation.${cite("pba")}</td></tr>`
  + `</tbody></table></figure></details>`;

H += `<h3 class="wp-block-heading" id="h-stops">STOPs</h3>`;
H += P(`A ${dlink("/definition/suggested-termination-of-practice/", "STOP (Suggested Termination Of Practice)")} flags a conventional practice that is counterproductive because it feeds the pathogen, overrides host defense, or relieves a host-imposed constraint. In TB the clearest example is routine iron supplementation: the low serum iron of active disease is hepcidin-driven sequestration, and exogenous iron can feed Mtb's siderophore machinery while iron loading is independently associated with worse outcomes.${cite("blood2021", "murray")}`);
H += `<details class="wp-block-details is-layout-flow"><summary><span style="color: #1c43ad;">What STOPs should be considered?</span></summary><figure class="wp-block-table"><table><thead><tr><th>STOP</th><th>Rationale and SWAP</th></tr></thead><tbody>`
  + `<tr><td>Routine iron supplementation in active TB</td><td>Low serum iron is anemia of inflammation (host defense), not deficiency; iron feeds Mtb and loading worsens outcomes; iron repletion of iron-deficient hosts increased infections and TB reactivation in a randomized study.${cite("blood2021", "murray", "nienaber")} Treat the infection (the anemia resolves with effective therapy); support sequestration with ${dlink("/interventions/lactoferrin/", "lactoferrin")}; reserve iron for documented true iron-deficiency anemia, cautiously.</td></tr>`
  + `<tr><td>HBOT as a strategy</td><td>Mtb is an obligate aerobe restrained by granuloma hypoxia; raising O&#8322; relieves the constraint that holds it dormant, the opposite of anaerobe-dominated disease. (Mechanistic caution; direct TB-HBOT trials are essentially absent.)${cite("hypoxia", "dosr")} Prioritize effective multidrug chemotherapy; do not pursue hyperoxygenation as anti-TB therapy.</td></tr>`
  + `<tr><td>High-dose zinc supplementation</td><td>Serum zinc is low by redistribution, not dietary lack; routine repletion is unproven and trials are mixed.${cite("zincneg")} Correct documented deficiency only; otherwise support host sequestration.</td></tr>`
  + `</tbody></table></figure></details>`;

// ----- FAQs (heading only; quick-answers injected at render) -----
H += `<h2 class="wp-block-heading" id="h-faqs">FAQs</h2>`;

// ----- Research Feed (endo-style accordion cards; toggle wired by WpInteractivity) -----
const RF = JSON.parse(fs.readFileSync(new URL("./rf.json", import.meta.url))).feeds;
let SUM = {};
try { SUM = JSON.parse(fs.readFileSync(new URL("./summaries.json", import.meta.url))); } catch { SUM = {}; }
const SVG_PLUS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="12" height="12" style="margin:auto"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"></path></svg>`;
const SVG_MINUS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="12" height="12" style="margin:auto"><path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>`;
const SVG_DOC = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
const SVG_LINK = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
const SVG_MAIL = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
function rfGraphs(f) {
  const fields = [["Location", f.location], ["Sample Site", f.sample_site], ["Species", f.species]].filter(([, v]) => Array.isArray(v) && v.length);
  if (!fields.length) return "";
  return `<div class="research-feed__graphs">` + fields.map(([t, items]) =>
    `<div class="research-feed__graph"><div class="research-feed__graph-title">${esc(t)}</div><div class="research-feed__graph-items">` +
    items.map((i) => `<div class="research-feed__graph-item">${esc(i)}</div>`).join("") + `</div></div>`).join("") + `</div>`;
}
H += `<h2 class="wp-block-heading" id="h-research-feed">Research Feed</h2>`;
H += `<div class="research-feed accordion" data-accordion-disable-auto-close="true">`;
for (const s of RF) {
  const sum = SUM[s.slug] || {};
  const url = "/research-feeds/" + s.slug;
  const mailto = `mailto:?subject=${encodeURIComponent(s.title)}&body=${encodeURIComponent(s.paper_url || ("https://microbiomemedicine.com" + url))}`;
  H += `<div class="research-feed__item accordion__item">`
    + `<div class="research-feed__header-wrap accordion__header"><div class="research-feed__toggle-icon-wrap"><span class="research-feed__toggle-icon research-feed__toggle-icon--plus">${SVG_PLUS}</span><span class="research-feed__toggle-icon research-feed__toggle-icon--minus">${SVG_MINUS}</span></div><div class="research-feed__title">${esc(s.title)}</div></div>`
    + `<div class="research-feed__sub-header"><div class="research-feed__sub-header-item research-feed__sub-header-item--date">${esc(s.year || "")}</div><div class="research-feed__sub-header-item">/</div><div class="research-feed__sub-header-item"><div class="research-feed__categories"><div class="research-feed__category-wrap">${esc(sum.category || "Infectious Disease")}</div></div></div></div>`
    + `<div class="research-feed__excerpt">${esc(sum.excerpt || "")}</div>`
    + `<div class="research-feed__content accordion__content">${rfGraphs(s)}${sum.html ? sum.html.replace(/<(\/?)h3(\b[^>]*)>/g, "<$1h4$2>") : `<p class="wp-block-paragraph">${dlink(url, "Read the full study summary →")}</p>`}</div>`
    + `<div class="research-feed__footer"><div><a class="btn" href="${url}">${SVG_DOC}Open</a><a class="btn" href="${s.paper_url || url}" target="_blank" rel="noreferrer">${SVG_LINK}Link</a><a class="btn" href="${mailto}">${SVG_MAIL}Email</a></div></div>`
    + `</div>`;
}
H += `</div>`;

// ----- Update History -----
H += `<h2 class="wp-block-heading" id="h-update-history">Update History</h2>`;
H += `<div class="mbio-update-history"><div class="mbio-update-history__content"><article class="mbio-card"><div class="mbio-card__border"></div><p class="mbio-card__date">2026-06-26</p><span class="mbio-card__title">Tuberculosis <span class="mbio-card__type btn btn--rounded">major</span></span><div class="mbio-card__content"><p class="wp-block-paragraph">Page published: microbiome + metallomic signature, primer, triangle-tested interventions, and STOPs.</p></div></article></div></div>`;

// ----- References -----
H += `<h2 class="wp-block-heading" id="h-references">References</h2><ol class="rgbc-references">`;
for (const k of order) {
  const r = R[k];
  H += `<li class="rgbc-references__item" id="ref-${k}"><a class="rgbc-references__link" href="${r.url}" target="_blank">${esc(r.name)}</a> ${esc(r.authors)} <span>(${esc(r.date)})</span>${r.review ? ` <a class="rgbc-references__review" href="${r.review}" target="_blank">[Review]</a>` : ""}</li>`;
}
H += `</ol>`;

// ----- Tooltip blocks (hidden; power the citation hover, endo-faithful) -----
for (const k of order) {
  const r = R[k];
  H += `<div class="tooltip wiki-ref-${k}"><div class="tooltip__header">Reference [${numByKey.get(k)}]</div><div class="tooltip__content"><p>${esc(r.name)}</p><p><em>${esc(r.authors)} ${esc(r.date)}</em></p><a href="${r.url}" target="_blank">View source</a>${r.review ? ` · <a href="${r.review}" target="_blank">Review</a>` : ""}</div></div>`;
}

// ---- write artifact + publish ---------------------------------------------------------
const outPath = new URL("./tb-content.html", import.meta.url);
fs.writeFileSync(outPath, H);
console.log(`built content_html: ${H.length} chars · refs: ${order.length} · studies: ${RF.length}`);

if (process.argv.includes("--publish")) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const excerpt_html = "<p>The microbiome and metallomic signature of tuberculosis: how iron withholding, copper/zinc intoxication, granuloma oxygen ecology, and airway–gut dysbiosis shape susceptibility, progression, and treatment — with triangle-tested interventions and STOPs.</p>";
  const { data: ex } = await db.from("content_items").select("id,meta").eq("type", "condition").eq("slug", "tuberculosis").maybeSingle();
  const meta = { ...(ex?.meta || {}), did_you_know: "In active TB, low blood iron is usually the body deliberately starving the bacillus (nutritional immunity) — not a deficiency. Reflexively giving iron can feed the pathogen.", authors: [{ name: "Karen Pendergrass" }] };
  const { error } = await db.from("content_items").update({ content_html: H, excerpt_html, meta, modified_at: new Date().toISOString() }).eq("id", ex.id);
  console.log(error ? "publish ERROR: " + error.message : `published → condition#${ex.id} (tuberculosis)`);
}
