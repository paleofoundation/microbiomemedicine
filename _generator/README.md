# Microbiome Signature page generator

Builds a **Microbiome Signature** condition page (the radial Relative-Abundance chart,
the per-organism detail panel, the Location/Sample-Site/Species block, and the linked
signature studies) from a set of CSVs — the same CSVs that were dropped into the old
WordPress page's Database tab.

This is the code-based replacement for the WP "Database" upload UI (Signatures CSV →
Download Sidebar template → Sidebar Import CSV → Studies CSV → Experiments CSV).

## Inputs (per condition, in `_generator/samples/<slug>/`)

| File | WP slot | Required | Purpose |
|------|---------|----------|---------|
| `signatures.csv` | Signatures CSV | yes | raw observations: each row is a study/experiment + taxa that were **increased**/**decreased**, as MetaPhlAn lineages. Gives (a) the **taxonomy→level** map and (b) the **net score** per taxon. |
| `sidebar.csv` | Sidebar Import CSV | yes | one row per taxon (`[score] Name`) + `overview, metallome, estrobolome, body site, link` — the **organism detail** text shown when a dot is clicked. |
| `studies.csv` | Studies CSV | yes | the studies behind the signature → research-feed study pages + the modal "Studies" list. |
| `experiments.csv` | Experiments CSV | yes | per-study experiments: `Location of subjects`, `Host species`, `Body site` (+ groups/stats) → the **Location / Sample Site / Species** block + experiment detail tables. |

> `export_998.csv` (the downloaded "Sidebar template") is an *intermediate* — it's the
> aggregated taxon+score list before you fill in the detail columns. The generator can
> emit it (`--emit-template`) so the human can fill the detail columns, exactly like the
> WP "Download CSV template" button.

## Pipeline

```
signatures.csv ─┬─► aggregate net score per (level, taxon)   [+1 increased / −1 decreased, deduped per row]
                └─► taxonomy map: taxon → level (from k__/p__/c__/o__/f__/g__/s__ prefixes)

sidebar.csv ──────► organism details (overview/metallome/estrobolome/body-site/link), has_info=true when overview present

studies.csv ──────► studies[] (pmid, doi, url, authors, title, journal, year, abstract)

experiments.csv ──► per study: {location, species, body_site, groups...}; union → signature-level Location/Sample Site/Species
```

### Output (written to Supabase `content_items` for the condition)

```jsonc
meta.signature = {
  levels: { Kingdom:[{name,value,has_info}], Phylum:[…], Class:[…], Order:[…],
            Family:[…], Genus:[…], Species:[…] },          // the radial chart, per level
  organisms: { "Streptococcus": { overview, metallome, estrobolome, bodySite, link }, … },
  studies:   [{ title, url }],                              // modal "Studies" list (research-feed links)
}
meta.feed = { location:[…], sample_site:[…], species:[…] }  // the Location/Sample Site/Species block
```

Render path: `MicrobiomeSignature.tsx` reads `meta.signature.levels` (chart) + `organisms`
(detail panel, served via `/api/organism`) + `studies` (modal list); the research-feed
template renders `meta.feed`. New pages use the React templates (not verbatim WP HTML).

## Run

```bash
# from repo root, with .env.local loaded
node _generator/build-signature.mjs --slug endometriosis --title "Endometriosis"
# add --emit-template to write export_998-style sidebar template for the human to fill
# add --dry-run to print the computed data without writing to Supabase
```

## Status
- [x] CSV parsing (`lib/csv.mjs`) + aggregation + level mapping (`lib/signature.mjs`)
- [x] data-model assembly (`build-signature.mjs`)
- [x] verified: aggregation reproduces the live endometriosis signature exactly (0 score mismatches; Kingdom 3 / Phylum 2 / Class 3 / Order 9 / Family 18 / Genus 29 / Species 8)
- [x] Supabase write (condition `meta.signature`) — `--dry-run` to preview, omit to write (needs `SUPABASE_SERVICE_ROLE_KEY`)
- [x] research-feed study-page generation (`lib/feeds.mjs`) — one page per study, reuse-by-title (no duplicates), Location/Sample-Site/Species from experiments, condition Studies linked to `/research-feeds/<slug>`
- [x] render path for new (non-verbatim) pages: `/api/organism` builds detail from `meta.signature.organisms`; `ArticleView` prefers `meta.signature.studies` — verified end-to-end on a test condition
- [x] Claude Code skill: `.claude/skills/build-microbiome-signature/`

## Future (per owner)
- Replace the CSV inputs with repo-folder / PDF-ingested sources (the `lib/` parsers are the only swap point).
- LLM-author the research-feed `content_html` 4-section summaries (currently mechanically seeded from the abstract).
- `--sample <dir>` lets the sample folder differ from the condition slug (used in testing).
