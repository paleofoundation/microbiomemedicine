#!/usr/bin/env node
// Image WebP tooling for microbiomemedicine. Build-time / local only (sharp is a
// devDependency and never ships to the Vercel runtime). See docs/IMAGE-CONVENTIONS.md.
//
//   node scripts/convert-images.mjs <file|dir>          convert raster -> sibling .webp
//   node scripts/convert-images.mjs add <src> <name>    add a NEW image the right way
//   node scripts/convert-images.mjs og                  (re)generate the default OG card
//
// Convert NEVER deletes originals (keep-paths rule) and SKIPS decorative chrome
// (logos, favicons, screenshots) so only real content diagrams become WebP.
import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd());
const DENY = /logo|favicon|cropped-|logotype|screenshot|screen-shot|background-gray|home-page|resource-library|header_/i;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function convertOne(file) {
  const ext = path.extname(file).toLowerCase();
  if (![".png", ".jpg", ".jpeg"].includes(ext)) return { file, skipped: "not-raster" };
  if (DENY.test(path.basename(file))) return { file, skipped: "denylist" };
  const out = file.slice(0, -ext.length) + ".webp";
  try { await fs.access(out); return { file, skipped: "webp-exists" }; } catch { /* create it */ }
  const meta = await sharp(file).metadata();
  await sharp(file).webp(ext === ".png" ? { lossless: true } : { quality: 82 }).toFile(out);
  return { file, out, width: meta.width, height: meta.height };
}

async function walk(dir, acc = []) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

async function cmdConvert(target) {
  const stat = await fs.stat(target);
  const files = stat.isDirectory() ? await walk(target) : [target];
  let made = 0;
  for (const f of files) {
    const r = await convertOne(f);
    if (r.out) { made++; console.log(`OK  ${path.relative(ROOT, f)} -> ${path.basename(r.out)} (${r.width}x${r.height})`); }
    else console.log(`--  skip ${path.relative(ROOT, f)} [${r.skipped}]`);
  }
  console.log(`\n${made} converted.`);
}

async function cmdAdd(source, name) {
  if (!source || !name) { console.error("usage: add <source-file> <kebab-keyword-name (no ext)>"); process.exit(1); }
  if (!KEBAB.test(name)) { console.error(`name must be kebab-case + keyword-rich, e.g. mycobacterium-tuberculosis-lung-cavities-microbiome-signature\n  got: ${name}`); process.exit(1); }
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dir = path.join(ROOT, "public", "wp-content", "uploads", yyyy, mm);
  await fs.mkdir(dir, { recursive: true });
  const out = path.join(dir, `${name}.webp`);
  const meta = await sharp(source).metadata();
  await sharp(source).webp({ quality: 85 }).toFile(out);
  const url = `/wp-content/uploads/${yyyy}/${mm}/${name}.webp`;
  console.log(`OK  created ${path.relative(ROOT, out)}  (${meta.width}x${meta.height})`);
  console.log(`    url:  ${url}`);
  console.log(`    next: set this as meta.hero_image (hero) or reference it in content; then add its`);
  console.log(`          alt + caption to the image_meta table. See docs/IMAGE-CONVENTIONS.md.`);
}

async function cmdOg() {
  const W = 1200, H = 630;
  const icon = await sharp(path.join(ROOT, "src/app/icon.png"))
    .resize(300, 300, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <rect width="${W}" height="14" y="${H - 14}" fill="#cc3333"/>
      <text x="500" y="298" font-family="Georgia, 'Times New Roman', serif" font-size="78" font-weight="700" fill="#cc3333">Microbiome</text>
      <text x="500" y="384" font-family="Georgia, 'Times New Roman', serif" font-size="78" font-weight="700" fill="#cc3333">Signatures</text>
      <text x="503" y="446" font-family="Arial, sans-serif" font-size="30" fill="#6b6b6b">Research-grounded microbiome medicine</text>
    </svg>`
  );
  await sharp({ create: { width: W, height: H, channels: 4, background: "#ffffff" } })
    .composite([{ input: icon, left: 140, top: 165 }, { input: svg, left: 0, top: 0 }])
    .webp({ quality: 90 })
    .toFile(path.join(ROOT, "public/og-default.webp"));
  console.log("OK  public/og-default.webp (1200x630)");
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === "add") await cmdAdd(rest[0], rest[1]);
else if (cmd === "og") await cmdOg();
else if (cmd) await cmdConvert(cmd);
else { console.error("usage: convert-images.mjs <file|dir> | add <src> <kebab-name> | og"); process.exit(1); }
