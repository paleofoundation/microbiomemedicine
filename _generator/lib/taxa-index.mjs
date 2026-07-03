// All-taxa index: the taxon-centric transpose of the condition pages. Unions every
// taxon observed across ALL conditions in the database. Two source paths:
//   • CSV-backed conditions  -> full grade + domain + curation-state (via the grade engine)
//   • Supabase meta.signature -> name+value per taxon (breadth across the whole DB),
//                                domain resolved from a name lookup, direction from value sign
// See docs/EVIDENCE-GRADING.md §11.3.

import { aggregateSignatures, parseSidebar } from "./signature.mjs";
import { gradeSignatures } from "./grade.mjs";

const LEVEL_ORDER = ["Kingdom", "Phylum", "Class", "Order", "Family", "Genus", "Species"];

export function slugifyTaxon(name) {
  return String(name || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Common non-bacterial taxa whose domain can't be inferred from a bare name elsewhere.
export const DOMAIN_FALLBACK = {
  Candida: "Fungi", Saccharomyces: "Fungi", Aspergillus: "Fungi", Penicillium: "Fungi",
  Cladosporium: "Fungi", Talaromyces: "Fungi", Rhodotorula: "Fungi", Malassezia: "Fungi",
  Mucor: "Fungi", Fusarium: "Fungi", Debaryomyces: "Fungi", Wallemia: "Fungi",
  Methanobrevibacter: "Archaea", Methanosphaera: "Archaea", Methanomassiliicoccus: "Archaea",
};

// Raw-CSV condition -> normalized taxa list WITH grade + domain + curation-state.
export function normalizeCsvCondition({ slug, title, signaturesCsv, experimentsCsv, studiesCsv, sidebarCsv }) {
  const { scores } = aggregateSignatures(signaturesCsv);
  const { taxonEvidence } = gradeSignatures({ signaturesCsv, experimentsCsv, studiesCsv });
  const curated = new Set();
  if (sidebarCsv) { const { sidebarScore } = parseSidebar(sidebarCsv); for (const n of sidebarScore.keys()) curated.add(n); }
  const taxa = [];
  for (const [key, value] of scores) {
    if (!value) continue;
    const [level, name] = key.split("\t");
    const ev = taxonEvidence[name] || {};
    taxa.push({
      level, name, value,
      direction: ev.direction || (value > 0 ? "increased" : "decreased"),
      tier: ev.tier || "Very-Low", agreementBin: ev.agreementBin || "low",
      domain: ev.domain || "Unknown", curated: curated.has(name),
    });
  }
  return { slug, title, taxa };
}

// Supabase meta.signature.levels -> normalized taxa list (breadth; grade optional).
export function normalizeSignatureLevels({ slug, title, levels }, domainMap = {}) {
  const taxa = [];
  for (const [level, arr] of Object.entries(levels || {})) {
    if (!Array.isArray(arr) || !LEVEL_ORDER.includes(level)) continue;
    for (const it of arr) {
      if (!it || !it.name || !it.value) continue;
      taxa.push({
        level, name: it.name, value: it.value,
        direction: it.direction || (it.value > 0 ? "increased" : "decreased"),
        tier: it.tier || null, agreementBin: it.agreementBin || null,
        domain: it.domain || domainMap[it.name] || DOMAIN_FALLBACK[it.name] || "Unknown",
        curated: true, // it is, by definition, in the rendered (curated) signature set
      });
    }
  }
  return { slug, title, taxa };
}

// Union normalized conditions ([{slug,title,taxa:[...]}]) into the taxa index.
export function buildTaxaIndex({ conditions }) {
  const byKey = new Map();
  for (const cond of conditions) {
    for (const t of cond.taxa) {
      const key = t.level + "\t" + t.name;
      let e = byKey.get(key);
      if (!e) { e = { name: t.name, slug: slugifyTaxon(t.name), level: t.level, domain: "Unknown", conditions: [], up: 0, down: 0 }; byKey.set(key, e); }
      if (t.domain && t.domain !== "Unknown") e.domain = t.domain;
      e.conditions.push({ slug: cond.slug, title: cond.title, value: t.value, direction: t.direction, tier: t.tier, curated: t.curated });
      if (t.value > 0) e.up++; else e.down++;
    }
  }

  const TIER_RANK = { High: 3, Moderate: 2, Low: 1, "Very-Low": 0 };
  const taxa = [];
  for (const e of byKey.values()) {
    const anyCurated = e.conditions.some((c) => c.curated);
    const bestTier = e.conditions.reduce((b, c) => (c.tier && (TIER_RANK[c.tier] ?? -1) > (TIER_RANK[b] ?? -1) ? c.tier : b), null);
    taxa.push({
      name: e.name, slug: e.slug, level: e.level, domain: e.domain,
      nConditions: e.conditions.length,
      dirPattern: e.up && e.down ? "mixed" : e.up ? "increased" : "decreased",
      bestTier: bestTier || "—",
      curationState: anyCurated ? "on-chart" : "in-signatures-not-curated",
      conditions: e.conditions.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
    });
  }
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
