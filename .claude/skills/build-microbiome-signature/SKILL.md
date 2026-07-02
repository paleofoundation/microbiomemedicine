---
name: build-microbiome-signature
description: Generate/publish a Microbiome Signature condition page (the radial Relative-Abundance chart, the per-organism detail panel, and the linked research-feed study pages) from a CSV set in the microbiomemedicine rebuild (~/microbiomemedicine). Use when the user wants to build, generate, or publish a microbiome signature page for a condition, or add a new condition's signature from dropped CSVs.
---

# Build a Microbiome Signature page from CSVs

The repo generates a condition's Microbiome Signature + its research-feed study pages from CSVs via `_generator/`. This preserves the exact data model of the original WordPress "Database" CSV-upload flow (Signatures → Sidebar → Studies → Experiments). Validated to reproduce the live endometriosis signature exactly (0 score mismatches).

**Formatting rule (sitewide): PROSE and TABLES only — never lists.** No bulleted/numbered lists (or numbered `<h5>1. …` heading sequences) in body content; use prose for narrative and a canonical `wp-block-table` for structured content. Only the `<ol class="rgbc-references">` bibliography is a list. See [[content-formatting-no-lists]].

## Inputs — `_generator/samples/<slug>/`
- `signatures.csv` — raw observations (`Abundance in Group 1` + `MetaPhlAn taxon names`) → net score per taxon + the taxonomy→level map.
- `sidebar.csv` — per-taxon detail panels + `has_info`. Column 1 is `[score] Taxon`; the remaining columns are the **lens columns = the condition's primer sections** (endo → `overview, metallome, estrobolome, body site, link`; TB → `overview, nutritional immunity, metallomic signature, oxygen ecology, body site, references, link`). `parseSidebar` maps headers generically (nutritional immunity→nutritionalImmunity, metallomic signature→metallomicSignature, oxygen ecology→oxygenEcology, body site→bodySite; plus overview/metallome/estrobolome/references/link). See **Per-organism detail panels** below for how to author them.
- `studies.csv` — studies (Title/DOI/URL/Authors/Year/Abstract) → research-feed study pages + the modal Studies list.
- `experiments.csv` — per-study `Location of subjects`, `Host species`, `Body site` → the Location/Sample Site/Species block.

## Procedure
1. Confirm the 4 CSVs exist in `_generator/samples/<slug>/`.
2. **Dry-run** (validate before writing):
   `set -a; . ./.env.local; set +a` then
   `node _generator/build-signature.mjs --slug <slug> --title "<Title>" --dry-run`
   Check: level counts look right, `aggregation vs sidebar score mismatches: 0`, and the `research-feed pages: N new / M reused` split (existing pages are matched by title and reused, never duplicated).
3. Ensure the **condition row exists** (`content_items` type=condition, slug=`<slug>`, status=publish, with authored prose in `content_html` — Overview/Causes/etc.). The generator only ADDS `meta.signature`; it does not author prose. Create the row first if missing.
4. **Write**: `node _generator/build-signature.mjs --slug <slug> --title "<Title>"`.
   Needs a writable key — set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (the anon key is read-only; alternatively add a temporary `content_items` write policy and DROP it after). Writes `meta.signature` on the condition and INSERTs only NEW research-feed pages.
5. **Verify render**: open `/conditions/<slug>` → click "Microbiome Signature" → modal chart + level switcher; click a solid "info" dot → organism panel renders the condition's lens sections (Overview → lenses → Body site → References) then the page-level Studies list (linking to `/research-feeds/…`).

## Per-organism detail panels (the modal sidebar) — the authoring method

Karen's rules, treated as truth. A panel ties **one taxon** to the condition through each lens, always anchored to whether that taxon is **enriched or depleted**.

1. **Which taxa get a panel:** the **strongest enriched and strongest depleted** taxa at the chart's default level (Genus). Not every taxon — the standouts. `has_info` becomes true automatically once a taxon has an `overview`.
2. **Lens set = the condition's primer sections** (the h4s under Primer on the condition page). Endo → Metallome, Estrobolome. TB → Nutritional Immunity, Metallomic Signature, Oxygen Ecology. Always preceded by Overview and followed by Body site.
3. **What each lens answers, for that taxon (tie to its direction):**
   - **Overview** — what the species/genus is, why it matters here, and that it is enriched/depleted in this signature.
   - **Nutritional Immunity** — how the taxon acquires/competes for host-restricted metals (siderophores, heme uptake, Feo/TonB, Fur/Zur, ZnuABC…) and how it fares against host metal-withholding.
   - **Metallomic Signature** — how the taxon relates to the **patient-level** metallome (the host metal findings on the condition page), e.g. iron/heme-scavenging anaerobes favored by an iron-rich, hypoxic, hemorrhagic cavitary niche. (Do NOT put the microbe's own metal-resistance machinery on the *condition page* table — that is the patient findings; the per-organism mechanism lives here and on the microbe page.)
   - **Estrobolome** (endo) — β-glucuronidase / estrogen-reactivation potential.
   - **Oxygen Ecology** (TB) — the taxon's O₂ class (obligate anaerobe / aerobe / microaerophile / facultative / capnophile) and how it fits the condition's oxygen landscape (granuloma hypoxia, necrotic cavities, the oral-anaerobe pneumotype).
4. **≤650 characters (with spaces) per section** — universal. `/api/organism` hard-caps each section (tag-safe) as a backstop, but author to fit.
5. **Every claim needs an inline citation** (`<sup>[n]</sup>`) listed in a per-panel **References** column; `/api/organism` renders References **below Body site, above the page Studies**.
6. **Thin or absent data → SKIP the section. Never fabricate** a fact, citation, PMID, or DOI. A panel with only Overview + one lens is fine.
7. No em-dashes, no ampersands, no bold (site-wide rules).

Workflow that scales this: read each taxon's already-researched seed, restructure into the lens set, tie to direction, add real citations, then run an **adversarial citation-verification pass** that prunes anything unverifiable before publishing.

## Key facts
- Condition `meta.signature = { levels (chart), organisms (panel, served by /api/organism), studies:[{title,url:/research-feeds/<slug>}] }`.
- Migrated pages render verbatim WP HTML; NEW generated pages render via the React templates from `meta`. **Never write `wp_render` rows for generated pages.**
- Research-feed `content_html` is a 4-section summary (What/Who/Findings/Implications) mechanically seeded from the abstract — refine with an LLM for production quality.
- The CSV layer is isolated in `_generator/lib/` (`csv.mjs`, `signature.mjs`, `feeds.mjs`); a future repo-folder/PDF-ingested source can replace it without touching page-build logic.

## Images (SEO + LLMO conventions)
Follow [[image-conventions]] (`docs/IMAGE-CONVENTIONS.md`) for the signature hero + any diagrams:
- **Format:** SVG for the signature chart/diagrams; WebP for raster art (never new PNG/JPG content). Add raster with `npm run img:convert -- add <src> <kebab-keyword-name>`.
- **Hero:** set `meta.hero_image` (root-relative) and add an `image_meta` row `{ src, kind:'hero', alt, caption, width, height }` (alt ≤125 chars, medically precise).
- In-body images get lazy-loading, dimensions, `alt`, and captions automatically via `normalizeImages()` in `src/lib/textRules.ts`; decorative icons keep empty `alt=""`. `ImageObject` + image-sitemap are automatic. Run `npm run img:lint` before publish.
