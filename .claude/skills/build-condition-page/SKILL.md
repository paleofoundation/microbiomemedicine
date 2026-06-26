---
name: build-condition-page
description: Author and publish a full condition page (Overview → Causal Chain → Metallomic Signature → Nutritional Immunity → Microbiome Signature → Ecosystem Story → Achilles' Heels → Interventions/STOPs → Diagnosis → Research Gaps → FAQs, with inline citations + References + Studies) for the microbiomemedicine rebuild (~/microbiomemedicine), in Karen Pendergrass's "Microbiome Signature Triangulation" framework. Use when building/expanding a condition page beyond just its signature chart.
---

# Build a condition page in Karen's framework

This builds the **prose** of a condition page (the signature chart itself comes from
[[build-microbiome-signature]]). It encodes Karen Pendergrass's reasoning system —
see `_framework/karens-brain/master-spec.md` (the Master Reference Specification) and
`Framework_Extraction_Analysis.md` / `Raw_Thoughts_and_Transcripts.md`. Read those first.

## The framework in one line
**Signature → Functional Patterns → Ecosystem Story → Vulnerabilities → Interventions → Triangulation → Validate/Reject → Iterate.** Disease is a constraint-based ecological network of microbes + **metals** + host defenses + exposures, not a single cause. Analyze the **metallome first**; treat **nutritional immunity** as an interpretive lens (a "low" metal in active disease is often host defense, not deficiency — so supplementing it can be a **STOP**); target pathogen **Achilles' heels**; validate every intervention with the **Triangle Test**.

### Triangle Test (every intervention I targeting disease D via feature f)
1. **I→f** — does I move the feature in the predicted direction? 2. **I→D** — does I improve the disease clinically? 3. **f→D** — is f causally linked to D? Classify: **Validated** (all 3, no contradictions, safe) · **Promising** (2 of 3) · **In Progress** (logic sound, evidence incomplete) · **STOP** (counterproductive — feeds pathogen / overrides host defense; give a mechanistic reason + a SWAP) · **Model Failure** (contradiction → revise the model). Be honest: classify by the *actual* evidence, never the desired answer.

## Page structure (Master Spec, Part 6, Mode 3)
Section ids the template/TOC expect: `h-overview`, `h-causal-chain`, `h-metallomic-signature`, `h-nutritional-immunity`, `h-microbiome-signature`, `h-ecosystem-story`, `h-vulnerabilities`, `h-interventions`, `h-stops`, `h-in-progress`, `h-research-gaps`, `h-diagnosis`, `h-faqs`, then `h-references` + `h-studies`. Each ~400–500 words.

## Procedure
1. **Build the signature first** ([[build-microbiome-signature]]): the CSVs → `meta.signature` (chart + organism metallome panels + studies). The condition page references the chart; the "Microbiome Signature" hero button + sidebar entry appear automatically when `meta.signature.levels` exists (see `src/components/ArticleView.tsx`).
2. **Author the sections** with parallel grounded subagents (one per section/pair). Each agent: writes ~500 words in Karen's framework, grounds every claim with **web search**, returns `{id, title, html, refs}` where `html` carries inline `{{cite:KEY}}` markers and `refs:[{key, citation, url}]`. **Never fabricate a citation/DOI/PMID/URL** — real, web-verified links only (PubMed/PMC, WHO/CDC). Prefer human studies + meta-analyses; state evidence class honestly.
3. **Assemble** (`_generator/pages/<slug>/assemble.mjs` is the reference impl): concatenate sections in order; globally renumber citations (dedupe by canonical PMC/PMID/DOI → `[n]`), replacing each marker with `<sup><a class="rgbc-reference" href="#ref-n">[n]</a></sup>`; append `<h2 id="h-references">` numbered `<ol>` (citation + working URL) and `<h2 id="h-studies">` linking to `/research-feeds/<slug>` (the signature's study pages). Verify: 0 leftover `{{cite` markers, every marker resolved.
4. **Publish**: upsert the condition row with `content_html`, `excerpt_html`, and `meta` (`did_you_know`, `authors`); run from the repo so `@supabase/supabase-js` resolves; needs `SUPABASE_SERVICE_ROLE_KEY`. Then run `node _generator/build-signature.mjs --slug <slug> --title "<T>"` to attach `meta.signature` (merges) and create the research-feed pages.
5. **Verify render**: `/conditions/<slug>` → inline `[n]` citations, References list, Studies links resolve, signature modal + organism panels work, left TOC shows all sections + "Microbiome Signature".

## Notes
- `ArticleView` auto-injects a 3-item "Quick answer" FAQ accordion into `#h-faqs` (from Overview/Diagnosis/Interventions) + builds FAQ JSON-LD; keep the detailed `<h3>` Q&As after it.
- `content_items.id` has no sequence default — the generator assigns ids above the current max for new feeds.
- Worked example: **Tuberculosis** (`_generator/pages/tuberculosis/`) — inverts two endometriosis findings (iron supplementation = STOP because functional anemia is host defense; HBOT contraindicated because Mtb is an obligate aerobe restricted by granuloma hypoxia — the oxygen primitive cutting the opposite way from anaerobe-dominated disease).
- Inline citation class `rgbc-reference` is CSS-only (the tooltip JS targets `.rgbc-tooltip[title^="."]`, not references) — safe.
