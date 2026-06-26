// Build a Microbiome Signature condition page + its research-feed study pages from
// the CSV set in _generator/samples/<slug>/.
//
//   node _generator/build-signature.mjs --slug endometriosis --title "Endometriosis" --dry-run
//   node _generator/build-signature.mjs --slug endometriosis --title "Endometriosis" --out /tmp/endo.json --dry-run
//   node _generator/build-signature.mjs --slug endometriosis --title "Endometriosis"   # writes to Supabase
//
// --dry-run  compute + print, write nothing
// --out F    (with --dry-run) write the computed {signature, feeds} JSON to F
// Writes require SUPABASE_SERVICE_ROLE_KEY (or a key allowed to write content_items).

import fs from "node:fs";
import path from "node:path";
import { aggregateSignatures, parseSidebar, buildLevels, LEVEL_ORDER } from "./lib/signature.mjs";
import { buildResearchFeeds } from "./lib/feeds.mjs";
import { parseCsvObjects } from "./lib/csv.mjs";

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) {
    const k = argv[i].slice(2);
    args[k] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
  }
}
const slug = args.slug;
const title = args.title || slug;
if (!slug) { console.error("Usage: --slug <slug> [--title <Title>] [--dry-run] [--out file]"); process.exit(1); }

const dir = path.join("_generator", "samples", args.sample || slug);
const read = (f) => {
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) { console.error(`Missing ${p}`); process.exit(1); }
  return fs.readFileSync(p, "utf8");
};

// Site researcher credited on generated research-feed pages (matches live pages).
const AUTHOR = {
  name: "Karen Pendergrass",
  orcid: "https://orcid.org/0000-0002-2348-7259",
  avatar: "https://secure.gravatar.com/avatar/104bc2e8ba283fda6309c14b2eca02fe9612e8793ed62621c691e83230d4a963?s=96&d=mm&r=g",
};

// --- Supabase client (also used to read existing slugs so we reuse, not duplicate) ---
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let db = null;
if (SUPA_URL && SUPA_KEY) {
  const { createClient } = await import("@supabase/supabase-js");
  db = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });
}

async function fetchExisting() {
  const slugs = [];
  const byTitle = new Map(); // research-feed Title -> slug (for reuse by title)
  if (!db) return { slugs, byTitle };
  for (let from = 0; from < 10000; from += 1000) {
    const { data } = await db.from("content_items").select("slug,title,type").range(from, from + 999);
    if (!data || !data.length) break;
    for (const r of data) {
      slugs.push(r.slug);
      if (r.type === "research-feed" && r.title) byTitle.set(r.title.trim(), r.slug);
    }
    if (data.length < 1000) break;
  }
  return { slugs, byTitle };
}

// --- compute signature ---
const { scores, taxonLevel } = aggregateSignatures(read("signatures.csv"));
const { organisms, sidebarScore } = parseSidebar(read("sidebar.csv"));
const levels = buildLevels({ scores, taxonLevel, organisms, sidebarScore });
delete levels.__unleveled;

// --- compute research-feed pages + internal study links ---
const { slugs: existingSlugs, byTitle: existingByTitle } = await fetchExisting();
const { rows: feedRows, urlByTitle } = buildResearchFeeds({
  studiesCsv: read("studies.csv"),
  experimentsCsv: read("experiments.csv"),
  conditionLabel: title,
  conditionSlug: slug,
  author: AUTHOR,
  existingSlugs,
  existingByTitle,
});

// Condition's modal Studies list, in studies.csv order, linked to internal feed pages.
const studiesList = parseCsvObjects(read("studies.csv"))
  .map((s) => (s["Title"] || "").trim())
  .filter(Boolean)
  .map((t) => ({ title: t, url: urlByTitle.get(t) || "" }))
  .filter((s) => s.url);

const signature = { levels, organisms, studies: studiesList };

// --- report ---
console.log(`\n=== ${title} (${slug}) ===`);
for (const L of LEVEL_ORDER) {
  const top = levels[L].slice(0, 3).map((t) => `[${t.value}] ${t.name}`).join(", ");
  console.log(`  ${L.padEnd(8)} ${String(levels[L].length).padStart(3)} taxa   ${top}`);
}
console.log(`  organisms w/ detail: ${Object.values(organisms).filter((o) => o.overview).length}`);
console.log(`  condition Studies list: ${studiesList.length} (linked to /research-feeds/…)`);
console.log(`  research-feed pages: ${feedRows.length} new to create, ${urlByTitle.size - feedRows.length} already live (reused)`);
console.log(`  existing content_items slugs known: ${existingSlugs.length}`);

if (args["dry-run"]) {
  if (args.out) {
    fs.writeFileSync(args.out, JSON.stringify({ slug, title, signature, feeds: feedRows }, null, 2));
    console.log(`  wrote ${args.out}`);
  }
  process.exit(0);
}

// --- write to Supabase ---
if (!db) { console.error("No Supabase credentials in env."); process.exit(1); }
const { data: cond } = await db.from("content_items").select("id,meta").eq("type", "condition").eq("slug", slug).maybeSingle();
if (!cond) { console.error(`No condition row for slug=${slug}. Create the condition page first, then re-run.`); process.exit(1); }
{
  const meta = { ...(cond.meta || {}), signature };
  const { error } = await db.from("content_items").update({ meta }).eq("id", cond.id);
  console.log(error ? `condition update ERROR: ${error.message}` : `condition#${cond.id} meta.signature updated.`);
}
let created = 0, failed = 0;
for (const r of feedRows) {
  const { error } = await db.from("content_items").insert({ ...r, modified_at: new Date().toISOString() });
  if (error) { failed++; if (failed < 4) console.log(`feed insert ERROR (${r.slug}): ${error.message}`); } else created++;
}
console.log(`research-feed pages created: ${created}, failed: ${failed}`);
