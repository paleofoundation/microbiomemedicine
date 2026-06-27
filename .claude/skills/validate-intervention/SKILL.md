---
name: validate-intervention
description: Discover and validate a microbiome-targeted intervention (MBTI) for a condition using Karen's Microbiome Signature Triangulation Method, assign its MBTI Status (Validated / Promising Candidate / Validation In Progress / STOP / Model Failure), and build the required pages. Use when adding, validating, or classifying any intervention for a condition on microbiomemedicine, or building the Interventions section of a condition page.
---

# Validate an intervention (the Microbiome Signature Triangulation Method)

**This is the thing microbiomemedicine does that others do not: interventions are discovered from the signature and validated by triangulation, *before* waiting for RCTs.** Authoritative source: `_framework/karens-brain/master-spec.md` ("Karen's Brain" Master Reference Spec v1.0). See also [[karens-brain-framework]]. Canonical worked example: endometriosis → low-nickel diet.

**Epistemic stance (capture this, not just the steps — a pipeline that misses the mindset is "superficially similar but fundamentally different"):** constraint-based ecosystem-level causal inference; mechanism over correlation; triangulation across *independent* evidence streams; **anomaly-driven** — the single most distinctive move: find the data point that *shouldn't* be there and explain it (the lone decreased taxon that led to the mouthwash→breast-cancer insight); and self-falsifying (contradiction = the model is wrong).

## Part A — Discovery pipeline (Signature → Intervention)
1. **Signature** — list enriched *and* depleted taxa.
2. **Patterns, metals first** — read the *metallomic signature* before the taxa; the metal pattern is causal (it selects which taxa persist). Endo: tissue nickel (also zinc, iron, cadmium, lead) elevated.
3. **Anomaly check** — flag any taxon/metabolite/marker shifted in a direction the metal pattern does *not* explain; treat that anomaly as a clue to a hidden exposure or constraint and prioritise explaining it (this is often where the real hypothesis comes from).
4. **Ecosystem story** — reconstruct how the state became *self-reinforcing*: what disturbance started it, which taxa gained advantage, what feedback loops (hypoxia, pH shift, biofilm, immune suppression) stabilise it, why the depleted taxa can't recover. The signature is a causal network, not a list. (This is the story the Break Condition later tests for coherence.)
5. **Achilles' heel** — the shared dependency in the load-bearing taxa (endo: a nickel-hungry pathogen set running nickel-dependent virulence enzymes — urease, [NiFe]-hydrogenase, glyoxalase — for pH manipulation, local hypoxia, neutrophil evasion).
6. **Intervention** — target the dependency, not the organism name (endo: lower nickel → low-nickel diet, DMG chelation).

(The nine knowledge primitives — metals as selective pressure, nutritional immunity as interpretive constraint, mismetallation, metal-dependency Achilles' heels, two-sided ecological engineering, interkingdom functional shielding, estrobolome, siderophore competition, oxygen state — are the reusable generators behind steps 2–6. Full list in master-spec Part 3.)

## Part B — The Triangle Test (validation)
State a hypothesis: **"Intervention I will improve condition D."** Then test three edges + coherence:
- **I → f (mechanism/target):** does I move the load-bearing feature in the predicted direction? *Endo: lowering nickel disables nickel-dependent virulence; DMG, which only chelates nickel, reduces the enriched pathogens.*
- **f → D (mechanism→disease):** is the feature causally tied to the condition? *Nickel drives the endo pathogen set and their virulence.*
- **I → D (clinical, IN the condition):** is there evidence I improves D *tested in the condition itself*? *Endo: multiple clinical studies of a low-nickel diet show benefit.*
- **Coherence / convergence:** does the model also explain otherwise-confusing literature? *Citrus / naringenin protective; brassica (a nickel hyperaccumulator) a risk — both fall out of the nickel model.*

Confidence comes from convergence across **three independent streams — microbiology/mechanism, clinical outcome, and ecological plausibility**. Convergence only counts when the streams don't share the same confounder; if two edges share a bias, downgrade and flag it. When the streams genuinely converge, the model is **self-validating**: it confirms the signature, the interventions, AND the mechanisms at once.

## Part C — The Break Condition (self-falsification)
If the model predicts "I helps D because it reduces f," but credible evidence shows **I worsens D** (or consistently fails), the intervention is **not** simply discarded — **the model is wrong** (the taxa, the ecosystem story, or a causal link). Scrap and rebuild until every relationship is coherent. *Endo: if reducing nickel made endometriosis worse, something in the taxa or the model is off.*

## Part D — MBTI Status (THE decision rule — the crux)
The master-spec phrases this as 3-of-3 edges (Validated) vs 2-of-3 (Promising); **operationally the decisive missing edge is almost always I→D tested in the condition.** Mechanism + prediction alone is *not* Validated.

| Status | Rule | Example to remember |
|---|---|---|
| **Validated** | All three edges supported and **the I→D edge is a real study of I IN the condition (human RCT/cohort or a relevant animal model) that worked**; coherent with the model; safety reviewed. | **HBOT for endo is VALIDATED** — animal-model study, the only intervention to reach *complete remission* (predicted from the anaerobe load). Also low-nickel diet, and PFE (each has its own validation page). |
| **Promising Candidate** | Two of three edges supported, no contradictions, gap identified. Canonically I→f AND f→D are both solid but the **in-condition I→D study is missing**. Fast-track into research. | **DMG is Promising, not Validated** — it chelates nickel (I→f solid) and the model predicts benefit (f→D), but no one has studied DMG in endometriosis. "If they gave DMG in an endo model and it worked, it would be validated." |
| **Validation In Progress** | Mechanistic logic coherent but **fewer than two edges firmly supported** — even I→f / f→D are incomplete or only preliminary. | A candidate whose mechanism is plausible but not yet demonstrated. |
| **STOP** | Evidence shows the intervention is **counterproductive *despite conventional wisdom / standard practice supporting it*** — feeds pathogens, overrides host defense, or worsens the ecology. Publish as a STOP with a **SWAP**. | Iron + zinc supplementation in endo: the low serum levels are host *defense* (functional anemia, elevated lactoferrin/calprotectin), so the "obvious" supplementation feeds the pathogens. |
| **Model Failure** | Contradiction the model can't accommodate. **Do not publish** — return to pipeline step 1 or 4 (the ecosystem story) and revise. | — |

The one-line test: *both supporting edges present but no in-condition I→D study → Promising; a real in-condition study (human or animal) that worked → Validated; weaker than two edges → In Progress.* Animal-model evidence in the condition counts toward Validated (HBOT). Evidence weighting: RCT > quasi-experimental > observational > open-label/animal > in-vitro (in-vitro supports, never standalone). **Status is context-dependent:** HBOT is **Validated** for endo (anaerobe-driven) but a **STOP** for TB (Mtb is an obligate aerobe; oxygenation feeds it).

## Part E — What must be created in the build (the Interventions section)
**On the condition page** ([[build-condition-page]] owns the authoritative heading tree — defer to it for levels):
- `Interventions` (h2): intro linking `/our-validation-method/` + MAIN TABLE with columns **Intervention | Classification | MBTI Status**. Intervention cell → `/interventions/<slug>/`; Classification cell → `/definition/<slug>/`; **MBTI Status cell of a Validated row links to that intervention's validation page.**
- `STOPs` (h3 under Interventions per build-condition-page): the STOP + a `<details>` "STOPs | SWAPs" table.
- A `Validation In Progress` `<details>` accordion (Intervention | Classification | Notes).
- An **identified research gaps** output for the condition (per master-spec Mode 3) — the Promising Candidates / open edges that should be fast-tracked.

**Per VALIDATED intervention — TWO pages (Karen's explicit rule):**
1. **Intervention page** — what the intervention *is*. `content_items.type='intervention'`, route `/interventions/<slug>`.
2. **Validation page** — *how it was validated* (the triangle, written out). Currently `type='post'`, route `/<slug>`. Canonical body (from the live low-nickel and PFE pages):
   - `Overview`
   - `<Intervention> as an MBTI` / `Microbial Modulation` — the mechanism (I→f), with pathogen → metal-dependency / effect table(s).
   - `Validation of the <Condition> Microbiome Signature` — tie the targeted taxa back to the established signature (f→D).
   - `Dual Validation of MBTI and Microbiome Signature` — the convergence argument. State the **full triple convergence**: the model simultaneously confirms (1) the microbiome signature, (2) the intervention, and (3) the underlying mechanisms — not merely that I modulates the taxa and improves D.
   - `Conclusion` (optional).
   - `References` — `<ol class="rgbc-references">` (DOI link, authors, (Journal. Year)) + per-ref hover tooltip "Read Review" → `/research-feeds/<slug>/`.

**Build-order rule:** whenever an intervention is classified (or reclassified) as **Validated**, author its validation page FIRST, then wire the MBTI Status hyperlink — never leave a Validated row linking to a page that doesn't exist.

Shared chrome (both page types render via `ArticleView`): "✓ Evidence based" badge, Researched-by + ORCID, Last Updated, Page Snapshot box (N References [+ Identified MMAs if a signature]). `/our-validation-method/` is the public explainer every validation page operationalizes.

## Research-feed entries (how to add + wire a study)
A research-feed page = `content_items` row `type='research-feed'`, route `/research-feeds/<slug>`. To add one OFF the signature generator (e.g. an extra evidence paper for an intervention): direct insert with an explicit `id` (= max(id)+1; the column has no sequence default), `content_html` = the four `<h3 class="wp-block-heading">` sections (What Was Studied? / Who Was Studied? / What Were the Key Findings? / What Are the Implications?) + `<p class="wp-block-paragraph">`, and `meta.feed = { paper_url (DOI), category, conditions:[{label,href:/conditions/<slug>/}] }` + `meta.authors`. **Do NOT create a `wp_render` row** for a new feed — its absence is what makes `ResearchFeedView` render the themed hero + your `content_html`. Verify each citation via the PubMed MCP first.
To **surface a study on an intervention/validation page**, the page (if it renders from `wp_render`) needs: a `<li class="rgbc-references__item">` in the `<ol class="rgbc-references">`, and the inline `<a class="rgbc-reference rgbc-tooltip js-rgbc-scroll-link" ... data-review-link="/research-feeds/<slug>/" ...><sup>[n]</sup></a>` marker (the `data-review-link` is what powers the tooltip "Read Review" button and the page's studies list). Optionally clone a `<div class="research-feed__item accordion__item">` card under the `Research Feed` h2. (Worked example: the metformin/endo page got the Cheng 2022 rat-model feed + In-Condition Efficacy evidence this way.)
*Future (not yet built): research-feed papers will carry evidence scores/grades.*

## Hard rules
- **Validated requires a real I→D study in the condition.** Never mark a mechanism-only candidate Validated (that is Promising). When unsure, downgrade.
- **Author the validation page before wiring its Status link** (no dangling Validated links).
- **Never fabricate** a citation, DOI, PMID, finding, or efficacy. Every claim cited; verify via the PubMed MCP (see [[medical-content-citation-workflow]]).
- Lead with the **anomaly** and the **ecosystem story** — they are the method's reasoning core, not decoration.
- Column header is **"MBTI Status"** (endo canonical), not "Status".
- No em-dashes, no ampersands, no bold (site-wide rules; see [[design-truth-fixed-components]]).
- A contradiction is a model-failure signal, not noise — surface it.

## Known gaps to fix when touching interventions
- **TB** condition page: header says "Status" (→ "MBTI Status"); MBTI Status cells are not linked to validation pages; no validation pages exist yet for TB's interventions.
- **Endo:** HBOT MBTI Status is now **Validated** (fixed 2026-06; animal-model complete remission), linked to its validation page `/hbot-candidate-for-microbiome-targeted-intervention-endometriosis/`. That validation page's slug/title still say "candidate" — optional follow-up to re-slug/retitle it (with a redirect) to read as Validated.
