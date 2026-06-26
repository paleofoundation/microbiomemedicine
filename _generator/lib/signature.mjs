import { parseCsvObjects } from "./csv.mjs";

const LEVEL = { k: "Kingdom", p: "Phylum", c: "Class", o: "Order", f: "Family", g: "Genus", s: "Species" };
export const LEVEL_ORDER = ["Kingdom", "Phylum", "Class", "Order", "Family", "Genus", "Species"];

// signatures.csv -> net score per (level,name) and a taxon->level map.
// Each row lists taxa (MetaPhlAn lineages) that were increased(+1)/decreased(-1) in
// one experiment; a taxon is counted once per row (deduped) at each level in its lineage.
export function aggregateSignatures(csvText) {
  const rows = parseCsvObjects(csvText);
  const scores = new Map();      // "level\tname" -> net score
  const taxonLevel = new Map();  // name -> level
  for (const row of rows) {
    const dir = (row["Abundance in Group 1"] || "").toLowerCase();
    const val = dir === "increased" ? 1 : dir === "decreased" ? -1 : 0;
    const names = row["MetaPhlAn taxon names"] || "";
    if (!val || !names) continue;
    const seen = new Set();
    for (const lineage of names.split(",")) {
      for (const el of lineage.trim().split("|")) {
        const m = el.trim().match(/^([kpcofgs])__(.+)$/);
        if (!m) continue;
        const level = LEVEL[m[1]];
        const name = m[2].trim();
        if (!level || !name) continue;
        taxonLevel.set(name, level);
        const key = level + "\t" + name;
        if (seen.has(key)) continue;
        seen.add(key);
        scores.set(key, (scores.get(key) || 0) + val);
      }
    }
  }
  return { scores, taxonLevel };
}

// sidebar.csv -> organism details keyed by taxon name (+ the [score] embedded in col 1).
export function parseSidebar(csvText) {
  const rows = parseCsvObjects(csvText);
  const organisms = {};
  const sidebarScore = new Map();
  for (const row of rows) {
    const firstKey = Object.keys(row)[0]; // unnamed taxon column
    const raw = (row[firstKey] || "").trim();
    const m = raw.match(/^\[(-?\d+)\]\s*(.+)$/);
    const name = (m ? m[2] : raw).trim();
    if (!name) continue;
    if (m) sidebarScore.set(name, parseInt(m[1], 10));
    organisms[name] = {
      overview: (row["overview"] || "").trim(),
      metallome: (row["metallome"] || "").trim(),
      estrobolome: (row["estrobolome"] || "").trim(),
      bodySite: (row["body site"] || "").trim(),
      link: (row["link"] || "").trim(),
    };
  }
  return { organisms, sidebarScore };
}

// Assemble meta.signature.levels. The chart shows the CURATED set — exactly the taxa
// in the sidebar (= the downloaded export_998 template the human filled in), not the
// full observed long tail. Score = aggregated net score (verified to match the sidebar's
// embedded [score]); level = from the MetaPhlAn lineage; has_info = organism detail present.
export function buildLevels({ scores, taxonLevel, organisms, sidebarScore }) {
  const levels = {};
  for (const L of LEVEL_ORDER) levels[L] = [];
  const unleveled = [];
  if (sidebarScore && sidebarScore.size) {
    // Curated set = the sidebar (filled export_998) taxa; score from aggregation.
    for (const [name, sScore] of sidebarScore) {
      const level = taxonLevel.get(name);
      if (!level || !levels[level]) { unleveled.push(name); continue; }
      const agg = scores.get(level + "\t" + name);
      const value = agg !== undefined ? agg : sScore;
      const det = organisms[name];
      levels[level].push({ name, value, has_info: !!(det && det.overview) });
    }
  } else {
    // No sidebar yet: auto-curate = every taxon with a non-zero net score (this IS the
    // export_998 template). has_info stays false until the sidebar details are added.
    for (const [key, value] of scores) {
      if (!value) continue;
      const [level, name] = key.split("\t");
      if (!levels[level]) continue;
      const det = organisms[name];
      levels[level].push({ name, value, has_info: !!(det && det.overview) });
    }
  }
  for (const L of LEVEL_ORDER) levels[L].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  levels.__unleveled = unleveled; // diagnostic: sidebar taxa with no level mapping
  return levels;
}

// Emit the export_998-style sidebar template: one row per chart taxon ("[score] Name")
// with empty detail columns for a human/LLM to fill, then re-import as sidebar.csv.
export function emitTemplate(levels) {
  const out = [",overview,metallome,estrobolome,body site,link"];
  for (const L of LEVEL_ORDER) for (const t of levels[L] || []) {
    out.push(`"[${t.value}] ${String(t.name).replace(/"/g, '""')}",,,,,`);
  }
  return out.join("\n") + "\n";
}
