// Evidence grading: replaces the naive ±1 vote's blindness to study quality with a
// methodology weight w = A·D·S·C·R computed from columns already in experiments.csv +
// studies.csv, rolled up per taxon into an ordinal certainty tier. The signed integer
// net vote (signature.mjs `value`) is left UNTOUCHED — tier/agreement/coverage ride as
// sibling fields. See docs/EVIDENCE-GRADING.md §3–§4.

import { parseCsvObjects } from "./csv.mjs";
import { domainOfCell, capability, methodKey, LOW_BIOMASS_SET, DOMAINS, coverageGlyph } from "./coverage.mjs";

const LEVEL = { k: "Kingdom", p: "Phylum", c: "Class", o: "Order", f: "Family", g: "Genus", s: "Species" };
const has = (v) => { const s = String(v || "").trim().toLowerCase(); return !!s && !["n/a", "none", "-", "false"].includes(s); };
const lowBiomass = (site) => String(site || "").toLowerCase().split(",").some((x) => LOW_BIOMASS_SET.has(x.trim()));
const COMP_GOOD = /ancom|aldex|deseq/i;
const COMP_NAIVE = /t-?test|wilcoxon|mann-?whitney|kruskal/i;

// --- per-experiment weight w = A·D·S·C·R ---------------------------------------
export function experimentWeight(e, study) {
  const seq = methodKey(e["Sequencing type"]);
  const regs = String(e["16S variable region"] || "").split(",").map((x) => x.trim()).filter(Boolean).length;

  // A — method reliability FOR THE BACTERIAL/target call (capped at 1.00; aperture
  //     breadth lives in coverage.mjs, NOT here — see §3.1 correction C1).
  let A;
  if (seq === "WMS") A = 1.0;
  else if (seq === "16S") A = regs >= 7 ? 1.0 : regs >= 3 ? 0.9 : regs === 2 ? 0.8 : regs === 1 ? 0.7 : 0.65;
  else if (seq === "ITS" || seq === "18S") A = 1.0;   // full reliability for their own domain
  else if (seq === "QPCR") A = 0.8;                    // high reliability for its single target
  else if (seq === "CULTURE") A = 0.6;
  else A = 0.65;
  if (seq === "WMS" && lowBiomass(e["Body site"])) A *= 0.8 * 0.9; // host-swamp + classifier penalties

  // D — study design (JOINED from studies.csv; experiments.csv has it blank)
  const d = String(study?.["Study design"] || "").toLowerCase();
  let D = d.includes("prospective") ? 1.0 : d.includes("case-control") ? 0.9
        : d.includes("cross-sectional") ? 0.7 : d.includes("laboratory") ? 0.55
        : d.includes("cohort") ? 0.9 : d.includes("mechanistic") || d.includes("interventional") ? 0.85 : 0.7;
  D = Math.min(D * (1 + 0.1 * has(e["Matched on"]) + 0.1 * has(e["Confounders controlled for"])), 1.0);

  // S — statistical rigor (compositional-aware; LDA reward removed, §3.1 C2)
  const mht = /true/i.test(e["MHT correction"] || "") ? 1.0 : 0.8;
  const t = parseFloat(e["Significance threshold"]);
  const thr = t > 0 && t <= 0.05 ? 1.0 : t > 0.05 ? 0.85 : 0.9;   // "0"/blank = unreported -> 0.9
  const st = e["Statistical test"] || "";
  const comp = COMP_GOOD.test(st) ? 1.1 : COMP_NAIVE.test(st) ? 0.85 : 1.0;
  const S = mht * thr * comp;

  // C — sample-size confidence (saturating on the smaller arm)
  const n = Math.min(+e["Group 0 sample size"] || 0, +e["Group 1 sample size"] || 0);
  const C = n ? 0.3 + 0.7 * n / (n + 25) : 0.4;

  // R — contamination control (three states; blank at low biomass = UNASSESSED, §3.1)
  let R = 1.0;
  if (lowBiomass(e["Body site"])) {
    const nc = String(e["Negative controls reported"] || "").trim().toLowerCase();
    R = nc === "true" ? 1.0 : nc === "false" ? 0.55 : 0.8;
  }

  return { w: A * D * S * C * R, A, D, S, C, R, seq, n };
}

const agreementBin = (a) => (a >= 0.75 ? "high" : a >= 0.6 ? "medium" : "low");

// --- roll-up: signatures + experiments + studies -> per-taxon evidence ----------
export function gradeSignatures({ signaturesCsv, experimentsCsv, studiesCsv }) {
  const sigs = parseCsvObjects(signaturesCsv);
  const exps = parseCsvObjects(experimentsCsv);
  const studies = parseCsvObjects(studiesCsv);

  const studyByName = new Map(studies.map((s) => [(s["Study page name"] || "").trim(), s]));
  // Experiments: composite key Study||Experiment page name, with a Study-only fallback.
  const expByComposite = new Map();
  const expByStudy = new Map();
  for (const e of exps) {
    const st = (e["Study"] || "").trim();
    expByComposite.set(st + "||" + (e["Experiment page name"] || "").trim(), e);
    if (!expByStudy.has(st)) expByStudy.set(st, e);
  }

  // Per (level,name): weighted up/down, cohort keys, niches, domain.
  const tax = new Map();
  const get = (key) => {
    let o = tax.get(key);
    if (!o) { o = { up: 0, down: 0, cohortsUp: new Set(), cohortsDown: new Set(), niches: new Set(), domain: "Unknown", studies: new Set() }; tax.set(key, o); }
    return o;
  };

  for (const row of sigs) {
    const dir = String(row["Abundance in Group 1"] || "").toLowerCase();
    const val = dir === "increased" ? 1 : dir === "decreased" ? -1 : 0;
    const names = row["MetaPhlAn taxon names"] || "";
    if (!val || !names) continue;
    const st = (row["Study"] || "").trim();
    const e = expByComposite.get(st + "||" + (row["Experiment"] || "").trim()) || expByStudy.get(st) || {};
    const study = studyByName.get(st);
    const { w } = experimentWeight(e, study);
    const site = (e["Body site"] || "").split(",")[0].trim().toLowerCase() || "unknown";
    const cohortKey = [site, e["Group 0 sample size"] || "", e["Group 1 sample size"] || ""].join("|");

    const seen = new Set();
    for (const lineage of names.split(",")) {
      const dom = domainOfCell(lineage);
      const parts = lineage.trim().split("|");
      // kingdom dedupe: emit ONE Kingdom node = resolved domain (fixes double-k__).
      const emitted = [];
      let kingdomDone = false;
      for (const el of parts) {
        const m = el.trim().match(/^([kpcofgs])__(.+)$/);
        if (!m) continue;
        const level = LEVEL[m[1]];
        let name = m[2].trim();
        if (!level || !name) continue;
        if (level === "Kingdom") { if (kingdomDone || dom === "Unknown") continue; name = dom; kingdomDone = true; }
        emitted.push([level, name]);
      }
      for (const [level, name] of emitted) {
        const key = level + "\t" + name;
        if (seen.has(key)) continue;
        seen.add(key);
        const o = get(key);
        o.domain = dom;
        o.niches.add(site);
        if (st) o.studies.add(st);
        if (val > 0) { o.up += w; o.cohortsUp.add(cohortKey); }
        else { o.down += w; o.cohortsDown.add(cohortKey); }
      }
    }
  }

  // Finalize per-taxon evidence.
  const taxonEvidence = {}; // name -> evidence (last-wins across levels; names are unique enough for chart)
  for (const [key, o] of tax) {
    const [level, name] = key.split("\t");
    const net = o.up - o.down;
    const direction = net > 0 ? "increased" : net < 0 ? "decreased" : "mixed";
    const denom = o.up + o.down || 1;
    const agreement = Math.abs(net) / denom;
    const kIndep = direction === "increased" ? o.cohortsUp.size : direction === "decreased" ? o.cohortsDown.size : Math.max(o.cohortsUp.size, o.cohortsDown.size);
    const raw = Math.max(o.up, o.down) * agreement;         // replication bonus OFF (no Cohort ID yet)
    const conf = 100 * (1 - Math.exp(-raw / 2.5));           // INTERNAL sort key only, never shown
    let tier;
    if (conf >= 70 && kIndep >= 3 && agreement >= 0.75) tier = "High";
    else if (conf >= 45 && kIndep >= 2 && agreement >= 0.6) tier = "Moderate";
    else if (conf >= 20 && kIndep >= 1) tier = "Low";
    else tier = "Very-Low";
    const ev = { level, domain: o.domain, direction, tier, agreement: +agreement.toFixed(2), agreementBin: agreementBin(agreement), kIndep, niches: [...o.niches], nStudies: o.studies.size };
    // Prefer the most specific level's evidence for a given display name.
    taxonEvidence[name] = ev;
  }

  // --- condition-level detection coverage (the "Bacteria ● Fungi ○" strip) ------
  const methodMix = {};
  for (const e of exps) { const k = methodKey(e["Sequencing type"]); methodMix[k] = (methodMix[k] || 0) + 1; }
  const nExp = exps.length || 1;
  const domainCoverage = {};
  for (const dom of DOMAINS) {
    let sum = 0;
    for (const e of exps) sum += capability(e["Sequencing type"], dom);
    domainCoverage[dom] = { frac: +(sum / nExp).toFixed(3), glyph: coverageGlyph(sum / nExp) };
  }
  const distinctMethods = Object.keys(methodMix).filter((k) => k !== "UNKNOWN").length;
  const conditionEvidence = {
    nStudies: studies.length,
    nExperiments: exps.length,
    methodMix,
    domainCoverage,
    methodMonoculture: distinctMethods <= 1,
    coverageStrip: DOMAINS.map((d) => `${d} ${domainCoverage[d].glyph}`).join(" · "),
  };

  return { taxonEvidence, conditionEvidence };
}
