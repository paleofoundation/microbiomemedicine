// All-taxa index: the taxon-centric transpose of the condition-centric signature
// pages. Unions every taxon observed across ALL conditions' signatures.csv (not just
// the curated sidebar set), attaches the grade + domain, and computes a curation-state
// so taxa that are IN the data but never charted (e.g. Fusobacterium before it was
// promoted) are surfaced instead of silently dropped. See docs/EVIDENCE-GRADING.md §11.3.

import { aggregateSignatures, parseSidebar, LEVEL_ORDER } from "./signature.mjs";
import { gradeSignatures } from "./grade.mjs";

export function slugifyTaxon(name) {
  return String(name || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// conditions: [{ slug, title, signaturesCsv, experimentsCsv, studiesCsv, sidebarCsv }]
export function buildTaxaIndex({ conditions }) {
  const byKey = new Map(); // "level\tname" -> taxon aggregate

  for (const cond of conditions) {
    const { scores, taxonLevel } = aggregateSignatures(cond.signaturesCsv);
    const { taxonEvidence } = gradeSignatures({
      signaturesCsv: cond.signaturesCsv,
      experimentsCsv: cond.experimentsCsv,
      studiesCsv: cond.studiesCsv,
    });
    const curatedNames = new Set();
    if (cond.sidebarCsv) {
      const { sidebarScore } = parseSidebar(cond.sidebarCsv);
      for (const n of sidebarScore.keys()) curatedNames.add(n);
    }

    for (const [key, value] of scores) {
      if (!value) continue;
      const [level, name] = key.split("\t");
      const ev = taxonEvidence[name] || {};
      let t = byKey.get(key);
      if (!t) {
        t = { name, slug: slugifyTaxon(name), level, domain: ev.domain || "Unknown", conditions: [], up: 0, down: 0 };
        byKey.set(key, t);
      }
      if (ev.domain && ev.domain !== "Unknown") t.domain = ev.domain;
      const curated = curatedNames.has(name);
      t.conditions.push({
        slug: cond.slug, title: cond.title, value,
        direction: ev.direction || (value > 0 ? "increased" : "decreased"),
        tier: ev.tier || "Very-Low", agreementBin: ev.agreementBin || "low", curated,
      });
      if (value > 0) t.up++; else t.down++;
    }
  }

  const taxa = [];
  for (const t of byKey.values()) {
    const anyCurated = t.conditions.some((c) => c.curated);
    const dirPattern = t.up && t.down ? "mixed" : t.up ? "increased" : "decreased";
    // Best (highest) tier this taxon reaches in any condition, for sorting/surfacing.
    const TIER_RANK = { High: 3, Moderate: 2, Low: 1, "Very-Low": 0 };
    const bestTier = t.conditions.reduce((b, c) => (TIER_RANK[c.tier] > TIER_RANK[b] ? c.tier : b), "Very-Low");
    taxa.push({
      name: t.name, slug: t.slug, level: t.level, domain: t.domain,
      nConditions: t.conditions.length, dirPattern, bestTier, anyCurated,
      curationState: anyCurated ? "on-chart" : "in-signatures-not-curated",
      conditions: t.conditions.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
    });
  }
  // Sort: most-conditions first, then level depth, then name.
  const LVL = Object.fromEntries(LEVEL_ORDER.map((l, i) => [l, i]));
  taxa.sort((a, b) => b.nConditions - a.nConditions || LVL[a.level] - LVL[b.level] || a.name.localeCompare(b.name));

  const summary = {
    nTaxa: taxa.length,
    nConditions: conditions.length,
    byDomain: taxa.reduce((m, t) => ((m[t.domain] = (m[t.domain] || 0) + 1), m), {}),
    nUncurated: taxa.filter((t) => t.curationState === "in-signatures-not-curated").length,
  };
  return { taxa, summary };
}
