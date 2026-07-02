// Build the all-taxa index dataset by unioning every condition sample's signatures.
//   node _generator/build-taxa-index.mjs --dry-run          # print summary, write nothing
//   node _generator/build-taxa-index.mjs                    # write src/data/taxa-index.json
// See docs/EVIDENCE-GRADING.md §11.3.

import fs from "node:fs";
import path from "node:path";
import { buildTaxaIndex } from "./lib/taxa-index.mjs";

const argv = process.argv.slice(2);
const dry = argv.includes("--dry-run");
const outArg = (() => { const i = argv.indexOf("--out"); return i >= 0 ? argv[i + 1] : null; })();

const SAMPLES = path.join("_generator", "samples");
const TITLES = { endometriosis: "Endometriosis", tuberculosis: "Tuberculosis" };

const conditions = [];
for (const slug of fs.readdirSync(SAMPLES)) {
  const dir = path.join(SAMPLES, slug);
  if (!fs.statSync(dir).isDirectory()) continue;
  const p = (f) => path.join(dir, f);
  if (!fs.existsSync(p("signatures.csv"))) continue;
  conditions.push({
    slug,
    title: TITLES[slug] || slug.replace(/(^|-)([a-z])/g, (_, s, c) => s + c.toUpperCase()),
    signaturesCsv: fs.readFileSync(p("signatures.csv"), "utf8"),
    experimentsCsv: fs.existsSync(p("experiments.csv")) ? fs.readFileSync(p("experiments.csv"), "utf8") : "",
    studiesCsv: fs.existsSync(p("studies.csv")) ? fs.readFileSync(p("studies.csv"), "utf8") : "",
    sidebarCsv: fs.existsSync(p("sidebar.csv")) ? fs.readFileSync(p("sidebar.csv"), "utf8") : "",
  });
}

const { taxa, summary } = buildTaxaIndex({ conditions });

console.log(`\n=== All-taxa index ===`);
console.log(`  conditions: ${conditions.map((c) => c.slug).join(", ")}`);
console.log(`  taxa: ${summary.nTaxa}   by domain: ${Object.entries(summary.byDomain).map(([d, n]) => `${d} ${n}`).join(", ")}`);
console.log(`  in-signatures-not-curated (QA worklist): ${summary.nUncurated}`);
const fuso = taxa.find((t) => t.name === "Fusobacterium");
if (fuso) console.log(`  spot-check Fusobacterium: level=${fuso.level} domain=${fuso.domain} state=${fuso.curationState} conditions=${fuso.nConditions}`);
const fungi = taxa.filter((t) => t.domain === "Fungi").slice(0, 5).map((t) => t.name);
if (fungi.length) console.log(`  fungal taxa now indexed: ${fungi.join(", ")}`);

const dataset = { generatedFrom: conditions.map((c) => c.slug), summary, taxa };
if (dry) {
  if (outArg) { fs.writeFileSync(outArg, JSON.stringify(dataset, null, 2)); console.log(`  wrote ${outArg}`); }
  process.exit(0);
}
const outFile = outArg || path.join("src", "data", "taxa-index.json");
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(dataset));
console.log(`  wrote ${outFile} (${(fs.statSync(outFile).size / 1024).toFixed(1)} kB)`);
