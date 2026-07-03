// Build the all-taxa index across the WHOLE database:
//   • every condition's meta.signature from Supabase (breadth), plus
//   • the grade engine's richer output for any condition that has local CSVs (depth).
//
//   node _generator/build-taxa-index.mjs --dry-run     # print summary, write nothing
//   node _generator/build-taxa-index.mjs               # write src/data/taxa-index.json
// Needs Supabase creds in env (NEXT_PUBLIC_SUPABASE_URL + a read key). See docs §11.3.

import fs from "node:fs";
import path from "node:path";
import { buildTaxaIndex, normalizeCsvCondition, normalizeSignatureLevels } from "./lib/taxa-index.mjs";

const argv = process.argv.slice(2);
const dry = argv.includes("--dry-run");
const outArg = (() => { const i = argv.indexOf("--out"); return i >= 0 ? argv[i + 1] : null; })();

// --- 1. CSV-backed conditions (full grade + domain + curation-state) -----------
const SAMPLES = path.join("_generator", "samples");
const csvConditions = [];
const domainMap = {};
if (fs.existsSync(SAMPLES)) {
  for (const slug of fs.readdirSync(SAMPLES)) {
    const dir = path.join(SAMPLES, slug);
    if (!fs.statSync(dir).isDirectory() || !fs.existsSync(path.join(dir, "signatures.csv"))) continue;
    const rd = (f) => (fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), "utf8") : "");
    const cond = normalizeCsvCondition({
      slug, title: titleCase(slug),
      signaturesCsv: rd("signatures.csv"), experimentsCsv: rd("experiments.csv"),
      studiesCsv: rd("studies.csv"), sidebarCsv: rd("sidebar.csv"),
    });
    csvConditions.push(cond);
    for (const t of cond.taxa) if (t.domain && t.domain !== "Unknown") domainMap[t.name] = t.domain; // seed name->domain
  }
}
const csvSlugs = new Set(csvConditions.map((c) => c.slug));

// --- 2. All conditions from Supabase (breadth) ---------------------------------
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supaConditions = [];
if (SUPA_URL && SUPA_KEY) {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
  const { data, error } = await db.from("content_items").select("slug,title,meta").eq("type", "condition");
  if (error) { console.error("Supabase read error:", error.message); process.exit(1); }
  for (const r of data || []) {
    if (csvSlugs.has(r.slug)) continue; // CSV version wins (newer, graded)
    const levels = r.meta?.signature?.levels;
    if (!levels || !Object.values(levels).some((a) => Array.isArray(a) && a.length)) continue;
    supaConditions.push(normalizeSignatureLevels({ slug: r.slug, title: r.title || titleCase(r.slug), levels }, domainMap));
  }
} else {
  console.warn("!! No Supabase creds — building from local CSV conditions only.");
}

const conditions = [...csvConditions, ...supaConditions];
const { taxa, summary } = buildTaxaIndex({ conditions });

console.log(`\n=== All-taxa index (whole database) ===`);
console.log(`  conditions: ${conditions.length}  (${csvConditions.length} CSV-graded + ${supaConditions.length} Supabase)`);
console.log(`  taxa: ${summary.nTaxa}   by domain: ${Object.entries(summary.byDomain).map(([d, n]) => `${d} ${n}`).join(", ")}`);
console.log(`  in-signatures-not-curated (QA worklist): ${summary.nUncurated}`);
const top = taxa.slice(0, 5).map((t) => `${t.name} (${t.nConditions})`);
console.log(`  most cross-cutting taxa: ${top.join(", ")}`);
const fuso = taxa.find((t) => t.name === "Fusobacterium");
if (fuso) console.log(`  Fusobacterium: in ${fuso.nConditions} conditions, domain ${fuso.domain}, state ${fuso.curationState}`);

const dataset = { generatedFrom: conditions.map((c) => c.slug), summary, taxa };
if (dry) {
  if (outArg) { fs.writeFileSync(outArg, JSON.stringify(dataset, null, 2)); console.log(`  wrote ${outArg}`); }
  process.exit(0);
}
const outFile = outArg || path.join("src", "data", "taxa-index.json");
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(dataset));
console.log(`  wrote ${outFile} (${(fs.statSync(outFile).size / 1024).toFixed(1)} kB)`);

function titleCase(slug) {
  return String(slug).replace(/-/g, " ").replace(/\b([a-z])/g, (_, c) => c.toUpperCase());
}
