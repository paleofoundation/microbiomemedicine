---
name: build-microbiome-signature
description: Generate/publish a Microbiome Signature condition page (the radial Relative-Abundance chart, the per-organism detail panel, and the linked research-feed study pages) from a CSV set in the microbiomemedicine rebuild (~/microbiomemedicine). Use when the user wants to build, generate, or publish a microbiome signature page for a condition, or add a new condition's signature from dropped CSVs.
---

# Build a Microbiome Signature page from CSVs

The repo generates a condition's Microbiome Signature + its research-feed study pages from CSVs via `_generator/`. This preserves the exact data model of the original WordPress "Database" CSV-upload flow (Signatures → Sidebar → Studies → Experiments). Validated to reproduce the live endometriosis signature exactly (0 score mismatches).

## Inputs — `_generator/samples/<slug>/`
- `signatures.csv` — raw observations (`Abundance in Group 1` + `MetaPhlAn taxon names`) → net score per taxon + the taxonomy→level map.
- `sidebar.csv` — per-taxon `overview, metallome, estrobolome, body site, link` (the filled `export_998` template) → organism detail panel + `has_info`.
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
5. **Verify render**: open `/conditions/<slug>` → click "Microbiome Signature" → modal chart + level switcher; click a red "info" dot → organism panel (Overview/Metallome/Estrobolome/Body site); check the Studies list links to `/research-feeds/…`.

## Key facts
- Condition `meta.signature = { levels (chart), organisms (panel, served by /api/organism), studies:[{title,url:/research-feeds/<slug>}] }`.
- Migrated pages render verbatim WP HTML; NEW generated pages render via the React templates from `meta`. **Never write `wp_render` rows for generated pages.**
- Research-feed `content_html` is a 4-section summary (What/Who/Findings/Implications) mechanically seeded from the abstract — refine with an LLM for production quality.
- The CSV layer is isolated in `_generator/lib/` (`csv.mjs`, `signature.mjs`, `feeds.mjs`); a future repo-folder/PDF-ingested source can replace it without touching page-build logic.
