// Build a Microbiome Signature condition page from the CSV set in
// _generator/samples/<slug>/ (signatures.csv, sidebar.csv, studies.csv, experiments.csv).
//
//   node _generator/build-signature.mjs --slug endometriosis --title "Endometriosis" --dry-run
//
// --dry-run  print computed data, write nothing
// Without --dry-run it upserts meta.signature + meta.feed onto the content_items row.

import fs from "node:fs";
import path from "node:path";
import { aggregateSignatures, parseSidebar, buildLevels, LEVEL_ORDER } from "./lib/signature.mjs";
import { parseCsvObjects } from "./lib/csv.mjs";

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) {
    const k = argv[i].slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    args[k] = v;
  }
}
const slug = args.slug;
const title = args.title || slug;
if (!slug) { console.error("Usage: --slug <slug> [--title <Title>] [--dry-run]"); process.exit(1); }

const dir = path.join("_generator", "samples", slug);
const read = (f) => {
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) { console.error(`Missing ${p}`); process.exit(1); }
  return fs.readFileSync(p, "utf8");
};

const { scores, taxonLevel } = aggregateSignatures(read("signatures.csv"));
const { organisms, sidebarScore } = parseSidebar(read("sidebar.csv"));
const levels = buildLevels({ scores, taxonLevel, organisms, sidebarScore });
const unleveled = levels.__unleveled || [];
delete levels.__unleveled;

const studies = parseCsvObjects(read("studies.csv"))
  .map((s) => ({
    title: s["Title"],
    url: s["URL"] || (s["DOI"] ? `https://doi.org/${s["DOI"]}` : ""),
    doi: s["DOI"], pmid: s["PMID"], journal: s["Journal"], year: s["Year"], authors: s["Authors list"],
  }))
  .filter((s) => s.title);

const exps = parseCsvObjects(read("experiments.csv"));
const split = (v) => (v || "").split(",").map((x) => x.trim()).filter(Boolean);
const uniq = (a) => [...new Set(a)];
const feed = {
  location: uniq(exps.flatMap((e) => split(e["Location of subjects"]))),
  sample_site: uniq(exps.flatMap((e) => split(e["Body site"]))),
  species: uniq(exps.flatMap((e) => split(e["Host species"]))),
};

const meta = {
  signature: {
    levels,
    organisms,
    studies: studies.map((s) => ({ title: s.title, url: s.url })),
  },
  feed,
};

// Cross-check the aggregation against the sidebar's embedded scores.
let mism = 0;
for (const [name, sScore] of sidebarScore) {
  const lvl = taxonLevel.get(name);
  const agg = scores.get(lvl + "\t" + name);
  if (agg !== undefined && agg !== sScore) mism++;
}

console.log(`\n=== ${title} (${slug}) ===`);
for (const L of LEVEL_ORDER) {
  const top = levels[L].slice(0, 3).map((t) => `[${t.value}] ${t.name}`).join(", ");
  console.log(`  ${L.padEnd(8)} ${String(levels[L].length).padStart(3)} taxa   ${top}`);
}
console.log(`  total chart taxa: ${LEVEL_ORDER.reduce((n, L) => n + levels[L].length, 0)} | sidebar taxa: ${sidebarScore.size} | unleveled: ${unleveled.length}${unleveled.length ? " (" + unleveled.slice(0, 8).join(", ") + ")" : ""}`);
console.log(`  studies: ${studies.length} | organisms w/ detail: ${Object.values(organisms).filter((o) => o.overview).length}`);
console.log(`  feed.location: ${feed.location.join(", ")}`);
console.log(`  feed.sample_site: ${feed.sample_site.join(", ")}`);
console.log(`  feed.species: ${feed.species.join(", ")}`);
console.log(`  aggregation vs sidebar score mismatches: ${mism}`);

if (args["dry-run"]) {
  if (args.out) fs.writeFileSync(args.out, JSON.stringify(meta, null, 2));
  process.exit(0);
}

// --- Supabase upsert (enabled after the dry-run verification looks right) ---
const { createClient } = await import("@supabase/supabase-js");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data: item } = await db.from("content_items").select("id,meta").eq("slug", slug).maybeSingle();
if (!item) { console.error(`No content_items row for slug=${slug}; create the page first.`); process.exit(1); }
const newMeta = { ...(item.meta || {}), ...meta };
const { error } = await db.from("content_items").update({ meta: newMeta }).eq("id", item.id);
console.log(error ? `ERROR: ${error.message}` : `Updated content_items#${item.id} meta.signature + meta.feed.`);
