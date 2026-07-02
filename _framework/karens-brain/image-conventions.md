# Image conventions (memory mirror)

Condensed, durable mirror of `docs/IMAGE-CONVENTIONS.md` so `[[image-conventions]]`
resolves to a repo file (same file-based-memory pattern as `[[karens-brain-framework]]`).
Full detail + tooling commands live in the docs file; this is the rule in one screen.

**The rule:** every image must be indexable by Google Images and legible to LLMs, with no
per-page hand-tuning. Format is rarely the bottleneck — the semantic envelope is.

- **Format tiering:** SVG for logos/icons/diagrams/charts; WebP for photos/renders/raster.
  Never add a new PNG/JPG as content art; never rasterize an existing SVG. Legacy files are
  grandfathered (we never rename/re-host existing images).
- **Filename:** kebab-case, keyword-rich, subject-first
  (`mycobacterium-tuberculosis-lung-cavities-microbiome-signature.webp`, not `tb.png`).
  New uploads go under `public/wp-content/uploads/<yyyy>/<mm>/`.
- **Alt:** one sentence ≤125 chars, medically precise, subject-first, AI-vision-generated
  from the pixels + page context. Decorative images (avatars, UI icons) keep `alt=""`.
- **Caption:** subtle visible `<figcaption>` on substantive in-body content figures ONLY —
  never the hero, never decorative. Caption text still flows to `alt` + `ImageObject` even
  when not shown.
- **Placement:** a page-representative icon/emblem/logo/badge — including a **STOP caution
  graphic** — goes in the left sidebar hero area (`<img class="img-autosize
  research-hero__left-image">` inside `<div class="research-hero__left">`), never dropped
  into the article body as a lead figure. In-body `wp-block-image` figures are reserved for
  explanatory diagrams tied to a passage. One hero-left icon per page.

**Mechanics (automatic, don't hand-edit markup):**
- `normalizeImages()` in `src/lib/textRules.ts` (via `applyTextRules`, the same chokepoint
  as citations) classifies each `<img>` (`src/lib/imageClassify.ts`), adds
  lazy/decoding/dimensions (hero gets `fetchpriority`), injects the AI `alt`, and wraps
  captioned content figures. Idempotent; only adds, never reorders (wp_render stays exact).
- Per-image alt/caption/dims live in the Supabase `image_meta` table keyed by `normSrc`,
  loaded by `getImageMeta()` (`src/lib/imageMeta.ts`).
- `buildJsonLd()` (`src/lib/seo.ts`) emits the hero `ImageObject`; `sitemap.ts` emits the
  `<image:image>` extension. Both fire automatically from `meta.hero_image` + `image_meta`.

**Shared meta contract:** hero = `content_items.meta.hero_image` (root-relative) or
`item.featured_image_url`; per-image text = `image_meta` row `{ src, kind, alt, caption,
width, height }`.

**Tooling (sharp, devDep):** `npm run img:convert -- add <src> <kebab-name>` (new image),
`npm run img:convert -- <dir>` (raster→webp), `npm run img:og` (social card),
`npm run img:lint` (warn-only gate). See [[design-truth-fixed-components]] for the broader
"replicate canonical components exactly" rule this sits under.
