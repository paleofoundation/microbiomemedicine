#!/usr/bin/env node
// Read-only image convention gate. Warn-only by default (exit 0); pass --strict to exit 1
// on any violation (for CI, ideally scoped to new/changed files). Flags the genuinely
// non-compliant cases — NOT descriptive PascalCase legacy names, which are semantically
// fine and grandfathered. See docs/IMAGE-CONVENTIONS.md.
import { promises as fs } from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd());
const UPLOADS = path.join(ROOT, "public", "wp-content", "uploads");
const STRICT = process.argv.includes("--strict");

const DENY = /logo|favicon|cropped-|logotype|screenshot|screen-shot|background-gray|home-page|resource-library|header_/i;
// Genuinely bad / placeholder filenames (not just "has capitals").
const JUNK = /^(img[-_ ]?\d|image[-_. ]|untitled|chatgpt|screen[ -]?shot|photo[-_ ]?\d|^e\d{5,}|download|unnamed)/i;

async function walk(dir, acc = []) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const warns = [];
function warn(file, msg) { warns.push(`${path.relative(ROOT, file)} — ${msg}`); }

const files = await walk(UPLOADS);
for (const f of files) {
  const base = path.basename(f);
  const stem = base.replace(/\.[a-z0-9]+$/i, "");
  const ext = path.extname(f).toLowerCase();
  if (DENY.test(base)) continue;
  if ([".png", ".jpg", ".jpeg"].includes(ext)) {
    // raster content art with no sibling .webp -> should be converted
    const webp = f.slice(0, -ext.length) + ".webp";
    if (!files.includes(webp)) warn(f, "raster content art without a WebP sibling — run `npm run img:convert`");
  }
  if (JUNK.test(stem) || /\s/.test(stem)) warn(f, "non-descriptive / placeholder filename — rename to kebab-case keyword-rich");
}

if (!warns.length) {
  console.log("image-lint: clean — no convention violations found.");
  process.exit(0);
}
console.log(`image-lint: ${warns.length} warning(s):`);
for (const w of warns) console.log("  - " + w);
console.log("\nSee docs/IMAGE-CONVENTIONS.md. (warn-only; pass --strict to fail the build)");
process.exit(STRICT ? 1 : 0);
