---
name: build-condition-page
description: Author and publish a condition page for the microbiomemedicine rebuild (~/microbiomemedicine) in the canonical "endometriosis gold-standard" structure (Overview→Primer, Interventions tables, STOPs/SWAPs, Research Feed, Update History, rgbc-references citations). Use when building or upgrading any condition page so it matches the established template.
---

# Build a condition page (endometriosis gold-standard template)

**The endometriosis page (`content_items` id 998, slug `endometriosis`) is the canonical template — every condition page must match its structure, markup, and density.** Dump it to study any detail: `select content_html from content_items where slug='endometriosis'`. It renders via `src/components/ArticleView.tsx` (a `content_html` page, NOT `wp_render`) — the same path generated pages use. Reasoning is Karen's framework — see [[karens-brain-framework]] and `_framework/karens-brain/master-spec.md`.

## Canonical structure (exact heading tree)
```
Overview (h2)              ← 1–2 concise paras; cause + the metallome/microbiome lens
  Associated Conditions (h3)
  Causes (h3)              ← prose + a <details> accordion table (theories / determinants)
  Diagnosis (h3)
  Primer (h3)             ← 1 intro para, then h4 subsections:
    Nutritional Immunity (h4)
    Metallomic Signature (h4)  ← prose + <details> accordion "Metal | Findings" table
    Microbiome Signature (h4)  ← refers to the interactive chart
    <disease-specific mechanism> (h4)   ← endo: "Estrogen Metabolism"; TB: "Oxygen, Redox & the Granuloma"
Interventions (h2)        ← intro (link /our-validation-method/) + MAIN TABLE (Intervention | Classification | Status: Validated / Promising Candidate / Validation In Progress)
  STOPs (h3)              ← define STOP + <details> "STOPs | SWAPs" table
  (Validation In Progress lives in a <details> accordion table under Interventions: Intervention | Classification | Notes)
FAQs (h2)                 ← heading only; ArticleView injects quick-answers + JSON-LD
Research Feed (h2)        ← accordion study cards (collapsed: excerpt + Open/Link/Email; expanded: 4-section summary + graphs)
Update History (h2)       ← mbio-card entries
References (h2)           ← <ol class="rgbc-references">
```
**Density principle:** sections are *concise prose + rich tables/accordions*, not 500-word essays. The depth lives in the accordion tables (theories, Metal|Findings) and the three intervention tables.

**Formatting rule (sitewide): PROSE and TABLES only — never lists.** No bulleted (`<ul>`) or numbered (`<ol>`, or manually numbered `<h5>1. …</h5>` sequences) lists in body content. Directive/narrative content → prose; structured/comparative content → a canonical `wp-block-table`. The only permitted list is the `<ol class="rgbc-references">` bibliography. See [[content-formatting-no-lists]].

## Markup conventions (copy endo exactly)
- Headings: `<h2|h3|h4 class="wp-block-heading" id="h-...">`. Paragraphs: `<p class="wp-block-paragraph">`.
- **Citations** (inline): `<sup><a class="rgbc-reference rgbc-tooltip js-rgbc-scroll-link" href="#ref-KEY" id="ref-KEY-back" data-title="AUTHORS" data-link="URL" data-link-name="TITLE" data-date="JOURNAL. YEAR" data-review-link="/research-feeds/..." target="_blank" title=".wiki-ref-KEY">[n]</a></sup>`. Number `[n]` is assigned in first-appearance order; reused sources keep their number.
- **References**: `<ol class="rgbc-references"><li class="rgbc-references__item" id="ref-KEY"><a class="rgbc-references__link" href="URL" target="_blank">TITLE</a> AUTHORS <span>(DATE)</span></li>…</ol>` (anchors match the inline `href`).
- **Citation tooltips** (so hover works like endo): append one hidden block per ref — `<div class="tooltip wiki-ref-KEY"><div class="tooltip__header">…</div><div class="tooltip__content">…</div></div>`. `Tooltips.tsx` shows `.tooltip.wiki-*` on hover of `.rgbc-tooltip[title^="."]`.
- **Accordions**: `<details class="wp-block-details"><summary><span style="color:#1c43ad;">Question?</span></summary><figure class="wp-block-table"><table class="has-fixed-layout">…</table></figure></details>`.
- **Metal names** in the Metal|Findings table: `<mark style="background-color:rgba(0,0,0,0)" class="has-inline-color has-vivid-red-color">Iron</mark>`.
- **Cross-links**: link key terms to existing `/definition/`, `/metals/`, `/microbes/`, `/interventions/`, `/supplement/`, `/conditions/` pages (verify they resolve).
- **Research Feed cards**: `<div class="research-feed accordion">` › per study `<div class="research-feed__item accordion__item">` with `.research-feed__header-wrap.accordion__header` (±toggle icons + `.research-feed__title`), `.research-feed__sub-header` (year / category), `.research-feed__excerpt` (italic, shown collapsed), `.research-feed__content.accordion__content` (the 4-section summary — use **h4** not h3 so the TOC stays clean — + a `.research-feed__graphs` Location/Sample-Site/Species block), and `.research-feed__footer > div` with `.btn` Open/Link/Email actions. The toggle is wired by **`ContentAccordions`** (mounted in ArticleView for `content_html` pages; WpInteractivity is NOT mounted there). Author the per-study 4-section summaries (What Was Studied? / Who Was Studied? / What Were the Key Findings? / What Are the Implications?) with grounded subagents and write them to the `/research-feeds/<slug>` pages too.

## Procedure
1. Build the signature first ([[build-microbiome-signature]]) so `meta.signature` exists (hero "Microbiome Signature" button + chart appear automatically).
2. Research/verify each section (parallel grounded subagents are ideal; **never fabricate a citation/URL** — web-verify every link).
3. Author with a deterministic builder: `_generator/pages/<slug>/build.mjs` (worked example = `_generator/pages/tuberculosis/build.mjs`) holds a `refs` map, a `cite()` engine (assigns numbers + emits the rgbc-reference markup), the section HTML, the three intervention tables, the `rgbc-references` list, and the tooltip blocks. Run with `--publish` (from repo root, `.env.local` loaded → needs `SUPABASE_SERVICE_ROLE_KEY`) to update the condition row's `content_html` + `meta` (`did_you_know`, `authors`). Create the condition row first if missing.
4. Create the research-feed study pages with `node _generator/build-signature.mjs --slug <slug> --title "<T>"` (also writes `meta.signature`; assigns ids above the current max).
5. **Verify render** at `/conditions/<slug>`: heading tree (6 h2 / ~5 h3 / 4 h4), 5 tables, accordions open, `rgbc-references` populated, inline `[n]` citations resolve, research-feed cards link out, signature modal works, left TOC mirrors endo. Compare side-by-side with `/conditions/endometriosis`.

## Notes
- **Left sidebar order (locked rule):** top-level sections MUST be Overview, Microbiome Signature, Interventions, FAQs, Research Feed, Update History, References (skip any the page lacks). Migrated pages are auto-corrected by `reorderConditionSidebar()` in `WpRender.tsx`; author generated pages' sections in this order. See [[condition-page-sidebar-order]].
- Worked example **Tuberculosis** inverts two endo findings: iron supplementation = STOP (functional anemia is host defense); HBOT contraindicated (Mtb is an obligate aerobe restricted by granuloma hypoxia).
- The Interventions tables ARE the long-pending "Interventions feature" (#13) in the gold-standard form.
- `content_items.id` has no sequence default — the generator assigns ids above the current max for new feeds.

## Images (SEO + LLMO conventions)
Any image you add or reference must follow [[image-conventions]] (`docs/IMAGE-CONVENTIONS.md`):
- **Format:** SVG for diagrams/icons; WebP for raster/photographic art (never a new PNG/JPG as content art). Add new images with `npm run img:convert -- add <src> <kebab-keyword-name>`.
- **Hero:** set `content_items.meta.hero_image` to the root-relative path, then add an `image_meta` row `{ src, kind:'hero', alt, caption, width, height }` — `alt` ≤125 chars + medically precise; `caption` one authoritative sentence.
- **In-body diagrams:** reference them normally — `normalizeImages()` (`src/lib/textRules.ts`, via `applyTextRules`) auto-adds lazy-loading + dimensions + the `alt`, and wraps captioned content figures in `<figure class="rgbc-figure">`+`<figcaption>`. Do not hand-write figure markup.
- **Decorative** images (icons/avatars) keep an empty `alt=""`.
- Before publish run `npm run img:lint`. `ImageObject` schema + image-sitemap entries are emitted automatically from `meta.hero_image` + `image_meta`.
