# Microbiome Medicine — Evidence Grading, Detection Aperture & Ingestion Architecture

**Final design.** Replaces the unweighted ±1 vote in `_generator/lib/signature.mjs` with a detection-aware, methodology-weighted evidence model, an inter-kingdom hypothesis layer walled off from the vote, and a gap-aware ingestion pipeline in front of the CSVs.
Author: Karen Pendergrass (ORCID displayed per platform norm). Anchored to BugSigDB (Geistlinger 2023), STORMS (Mirzayi 2021), GRADE, Newcastle-Ottawa, the low-biomass contamination literature (Salter 2014 / Eisenhofer 2019 / de Goffau), and compositional-data methods (Gloor 2017; ALDEx2 / ANCOM-BC).

## Executive summary

The current model casts one ±1 vote per taxon per signature row and cannot tell three different things apart: a taxon looked-for-and-found-differential, a taxon looked-for-and-null, and a taxon that no instrument in the corpus could ever have seen. In the flagship endometriosis corpus that third case is the whole story: 42 of 44 experiments are 16S, every signature token is bacterial, and *Candida albicans* scores a silent zero — not because it was ruled out, but because 16S is a bacterial/archaeal marker gene that physically cannot amplify fungi. This design fixes that by splitting one number into two things that must never be confused: **how trustworthy a differential-abundance call is** (an evidence weight) and **whether the organism was even in the instrument's view** (a detection-coverage layer). The weight rewards methodological rigor, replication across *genuinely distinct* cohorts, and contamination control — but, per the science review, it does **not** reward shotgun with a bacterial-vote bonus (shotgun's real advantage is that it can see other kingdoms, which lives entirely in the coverage layer). Detection-blind taxa are pulled out of the numeric chart and surfaced in a Detection-Gap panel; an inter-kingdom layer may raise *Candida* as an explicitly **unsigned, falsifiable hypothesis** — never a directional finding, never on the same axis as measured taxa. Everything a clinician sees is an ordinal certainty tier plus an always-visible aperture qualifier, with a click-through rubric that reconstructs the grade from named CSV columns. **Three corrections from review are load-bearing and are folded in below: the taxonomy parser must handle this corpus's double-`k__` lineage convention (the current regex double-counts kingdom), coverage and prediction must be computed per body-site niche rather than pooled, and the *Candida* prediction cannot fire on this corpus because urogenital *Lactobacillus* is net increased, not decreased.**

---

## 1. Corrections adopted from review (read this first)

The three skeptics surfaced defects that change the build. This section is the authoritative list of what changed and why; the rest of the document reflects these decisions.

| # | Concern (source) | Verdict | Change made |
|---|---|---|---|
| C1 | Shotgun over-rewarded via `A=1.30` for *bacterial* votes; worse at low biomass (science #1) | **Valid — changed** | Aperture no longer feeds the bacterial vote weight. `A` (method-reliability) is **capped at 1.00** for the bacterial differential-abundance call; shotgun's breadth advantage lives **only** in the coverage layer. A low-biomass shotgun penalty and a low-coverage classifier-confidence penalty are added. |
| C2 | Compositional non-independence; LEfSe/LDA rewarded as rigor (science #2, clinical #7) | **Valid — changed** | `conf` is explicitly relabeled an **ordinal cross-study consistency heuristic, not a statistical confidence.** LDA reward removed. A new compositional-validity sub-signal reads the existing `Statistical test` column (ANCOM-BC/ALDEx2 = rigor floor; LEfSe = neutral; raw t-test on proportions = penalized). The prediction trigger must survive a single-dominant-taxon compositional caveat. |
| C3 | Replication bonus double-counts overlapping cohorts; `k_indep` keyed on `Study` (science #3, clinical #8) | **Valid — changed** | Replication credit is **disabled until a curated `Cohort ID` exists.** Until then, matching `(Body site, n0, n1)` across studies is treated as **one** suspected-shared cohort (conservative floor), not independent replicates. |
| C4 | Prediction is architecturally but not epistemically walled; asserts direction from contested evidence (science #4, clinical #10) | **Valid — changed** | Predictions are **unsigned** ("fungi were not assayable here; ITS/shotgun needed"), not directional, until backed by measured cross-kingdom co-occurrence. The prediction is **gated on the grader's own within-niche net direction + agreement**, and does not fire when that direction is contested or below Moderate. Predicted taxa move to a **separate panel**, off the radial axis entirely. |
| C5 | Coverage denominator pooled over all experiments, not the niche (science #5, clinical #9) | **Valid — changed** | `coverage_frac` is computed **per (condition, body-site class, taxon)**. The `conditional` weight (formerly a bare 0.25) is defined from a documented fungal-recovery/host-read basis, not a constant. |
| B1 | `D` sources `Study design` from `experiments.csv` where it is 0/44 filled (feasibility #1) | **Valid — changed** | `D` reads `study["Study design"]` via an explicit join `experiments.Study === studies["Study page name"]`. Factor-source table corrected. Orphan-study fallback defined. |
| B2 | Signature→experiment join key `Experiment page name` is non-unique (feasibility #2) | **Valid — changed** | Join key is the **composite `Study + "||" + Experiment page name`** (resolves all signature rows; `Experiment 1` alone appears many times). |
| B5 | Overwriting `value` with a float breaks `parseSidebar` integer regex + curated `sidebar.csv` (feasibility #5) | **Valid — changed** | `value` stays the **signed integer net vote** (sidebar/template contract untouched). Tier/agreement/coverage ride as **separate fields**; spoke magnitude reads a new field, not `value`. |
| CL1 | Domain read from "the `k__` token" is undefined — every lineage has **two** `k__` tokens (clinical #1) | **Valid — changed (blocking)** | `domain(taxon)` parses **all** `k__` tokens against an explicit rank table; the current `signature.mjs` regex that matches both `k__` tokens and double-counts kingdom is fixed. Unit-tested against a real bacterial lineage, a synthetic `k__Eukaryota\|k__Fungi` *Candida* lineage, and the `p__Candidatus Saccharibacteria` false-friend. |
| CL10 | *Candida* prediction fires on "Lactobacillus decreased," but corpus is net **increased** even in the urogenital niche (clinical #10, science #4) | **Valid — changed (invalidating)** | Because urogenital *Lactobacillus* is net increased here, **the directional *Candida* prediction does not fire on this corpus.** What ships instead is the unsigned detection-gap statement ("fungi never assayed; ITS/18S/shotgun needed to settle *Candida*"). The directional hypothesis is reserved for a corpus/niche where the grader's own net direction supports it. |
| CL5 / CL6 | GRADE "High" is structurally unreachable at low biomass; flat `R=0.55` default taxes curation gaps as if quality defects (clinical #5, #6) | **Valid — changed** | New third `R` state **`unassessed = 0.80`** (curation gap) distinct from **`absent = 0.55`** (confirmed no controls). Feed cards show "contamination controls: not yet assessed." Tier ceiling is made **explicit** ("max achievable certainty here = Moderate, gated by contamination controls") rather than silently unreachable. |
| CL3 | Tier badge in the feed carries no aperture token → false settledness (clinical #3) | **Valid — changed** | Tier renders everywhere as a **split token** — "Moderate (bacteria only)" — so the aperture qualifier travels into the feed, search, and any export. |
| Sci #6 / CL12 | `conf` leaks into UI via spoke geometry and the hover tooltip (science #6, clinical #12) | **Valid — changed** | `conf` is removed from all UI surfaces including hover. Spoke magnitude is driven by **discrete agreement bins + tier**, not continuous `conf`. Hover shows "replicated in N distinct cohorts, X% directional agreement." A tuning-constant sensitivity analysis is a Phase-1 gate. |
| Sci #7 / CL7 | `R` is a flat knob carrying no taxon-level contamination signal; effect magnitude invisible (science #7, clinical #7) | **Partially valid — staged** | Taxon-aware `R` (cross-referencing the Salter/Eisenhofer kitome list) and effect-magnitude weighting are real improvements but need curated inputs; scheduled for Phase 4 with the reasoning noted. Coarse magnitude (LDA/effect where present) is surfaced as a pill now. |
| CL11 | No publication-bias / method-monoculture counter-signal (clinical #11) | **Valid — changed (light)** | Replication credit is down-weighted when all concordant cohorts share one aperture/pipeline; "all evidence is single-method (16S)" is shown as an explicit certainty limitation. |
| Sci #1 alt (shotgun ranked strictly above 16S as a *general* rule) | Where a skeptic **overreached** | **Kept, scoped** | We keep shotgun ranked above 16S **for coverage** (it genuinely can see fungi/archaea/viruses — that is not in dispute and is the platform's whole point). We reject only the claim that this should buy a **bacterial-vote** bonus. So `A_base` still ranks WMS highest *in the coverage matrix*; it no longer does so *in `w`*. |

Corpus facts re-verified for this document: **44 substantive experiments, 42 `16S` / 2 `WMS` (both fecal, high-biomass), zero `k__Fungi`/`k__Archaea`/viral tokens, every lineage carries two `k__` tokens, `p__Candidatus Saccharibacteria` present as a false-friend, `Study design` filled 0/44 on `experiments.csv` (lives on `studies.csv`), `Experiment page name` non-unique.** The endometriosis `signatures.csv` has 55 data rows; only two condition sample sets exist in-repo today (endometriosis, tuberculosis) — figures elsewhere describing "65 signatures / ~20 conditions" are corrected here.

---

## 2. The problem and the core insight

`aggregateSignatures()` maps every signature row to a net ±1 per taxon per lineage level, deduped per row. It is unweighted (an 800-subject shotgun study with controls and an n=3 mouse pilot with an uncorrected p-value vote identically) and it collapses two physically different zeros into one:

| Meaning of a `0` | Example in this corpus | Correct reading |
|---|---|---|
| **Evidence of absence** — assayed by a capable method, found not differential | a *Prevotella* that 16S looked for and did not flag | genuine null |
| **Absence of evidence** — never assayable by any method used | *Candida albicans* in a 42/44 16S corpus | detection artifact |

The core insight is one sentence: **a signature's trustworthiness is a function of detection capability, methodological rigor, and independent replication — not vote count — and "detection capability" must be kept strictly separate from "reliability of a bacterial call."** That separation (the fix for science concern #1) is the spine of the whole design.

Everything reads one derived object:

> **The `evidence` block.** A single deterministic object computed in the generator from columns already in `experiments.csv` + `studies.csv` (joined), rolled up Experiment → Study → (condition, body-site class). The grade (§3), the coverage/detection layer (§4), the ingestion diff (§5), and every clinician surface (§6) read this one object — so the badge, the chart, and the audit table can never disagree, and every number is click-through auditable to the CSV cell that produced it.

---

## 3. The evidence-grading model

### 3.1 Per-experiment weight `w`

`w` is the product of five bounded sub-scores. Multiplicative because these are **independent failure modes**: any one near zero should drag the experiment down.

```
w = A · D · S · C · R
```

| Symbol | Factor | Range | Sourced from (corrected) |
|---|---|---|---|
| `A` | Method **A**perture-reliability *for the bacterial call* | **0.45–1.00** | `Sequencing type`, `16S variable region`, `Body site` |
| `D` | Study **D**esign tier | 0.40–1.00 | **`studies["Study design"]` (joined)**, `Matched on`, `Confounders controlled for` |
| `S` | **S**tatistical rigor | 0.60–1.10 | `MHT correction`, `Significance threshold`, **`Statistical test`** |
| `C` | Sample-size **C**onfidence | 0.30–1.00 | `Group 0/1 sample size` |
| `R` | Contamination cont**R**ol | 0.55–1.00 | `Body site` + `Negative controls reported` (new column) |

The multipliers were checked against fill rates so no sub-score keys off an empty column (in this corpus `Confounders controlled for` is filled 2/44, `LDA Score above` blank 29/44, `MHT correction=false` 32/44). `w` is **not** normalized here — the spread is the point.

**`A` — method reliability for the bacterial vote (capped at 1.00, per science #1).** Aperture *breadth* (kingdoms visible) is removed from `w` entirely and moved to the coverage layer (§4). What remains in `A` is only reliability of a *bacterial differential-abundance* call:

| Method / region | `A_base` (bacterial-call reliability) |
|---|---|
| WMS (shotgun), adequate biomass | 1.00 |
| 16S, full-length (≥7 regions) | 1.00 |
| 16S, ≥3 regions | 0.90 |
| 16S, 2 regions | 0.80 |
| 16S, 1 region | 0.70 |
| 16S, region blank | 0.65 |
| qPCR / targeted (future) | 0.80 (high reliability for its single target) |
| culture (future) | 0.60 |

Two penalties then bite where the method is actually weak for bacterial composition:

```
lowBiomassShotgunPenalty = (seq==WMS && lowBiomass(body_site)) ? 0.80 : 1.00   # host-DNA swamping collapses bacterial depth (Salter/Eisenhofer)
classifierPenalty        = (seq==WMS && lowBiomass(body_site)) ? 0.90 : 1.00   # k-mer classifiers fabricate taxa at low coverage
A = A_base · lowBiomassShotgunPenalty · classifierPenalty
```

Net effect: **shotgun no longer out-votes a good 16S study on a bacterial call**, and a low-biomass shotgun study lands *below* a clean 2-region 16S study (`A ≈ 1.00·0.80·0.90 = 0.72`) — the inversion the science skeptic flagged is removed. Shotgun's genuine advantage reappears, undiluted, as coverage in §4. (Note: in this corpus both WMS rows are **fecal** (high-biomass), so neither penalty fires on them — the feasibility skeptic is right that the earlier "shotgun endometrium `A≈1.105`" example described a study that does not exist; there is no shotgun endometrium row.)

`LOW_BIOMASS = {endometrium, uterus, uterovesical pouch, ovary, peritoneal fluid, endometrioma, uterine cervix, cervical cavity, fallopian tube, posterior fornix}` matched case-insensitively on `Body site`; multi-site rows take the lowest-biomass member.

**`D` — study design (joined from `studies.csv`, per feasibility #1).**

```
D_base (from study["Study design"]): prospective cohort 1.00 · case-control 0.90 · cross-sectional 0.70 · laboratory experiment (=animal model) 0.55 · orphan/no-match 0.70 (fallback)
D = min(D_base · (1 + 0.10·has(e["Matched on"]) + 0.10·has(e["Confounders controlled for"])), 1.00)
```

`laboratory experiment` is the schema's value for an animal model; 0.55 discounts human-relevance without excluding it. Orphan experiments whose `Study` has no `studies.csv` match (e.g. `Study 501`-type rows) take `D_base=0.70` explicitly rather than silently.

**`S` — statistical rigor, now compositional-aware (per science #2, clinical #7).** The LDA/LEfSe reward is **removed**. A `Statistical test` sub-signal is added:

```
mht:  true → 1.00 ; false/blank → 0.80
thr:  (0,0.05] → 1.00 ; blank or literal "0" (=unreported) → 0.90 ; >0.05 → 0.85
comp: ANCOM-BC/ALDEx2/ANCOM/DESeq2(appropriate transform) → 1.10 ; LEfSe/Wilcoxon-on-CLR → 1.00 (neutral) ; raw t-test/Wilcoxon on proportions → 0.85 ; blank → 1.00
S = mht · thr · comp        (range ≈ 0.60–1.10)
```

`comp` is the single most decision-relevant methods fact for a microbiome paper (clinical #7) and costs no new column. LEfSe is neutral, never rewarded — it is compositionally naïve. `Significance threshold = "0"` is treated as *unreported*, not a real threshold (feasibility #8).

**`C` — sample-size confidence**, a saturating curve on the smaller arm (power is bounded by the smaller group):

```
n_eff = min(Group 0 size, Group 1 size)     C = 0.30 + 0.70 · n_eff/(n_eff + 25)     (blank/0 → 0.40)
```

| n_eff | 3 | 8 | 21 | 55 | 100 | 300 |
|---|---|---|---|---|---|---|
| C | 0.375 | 0.470 | 0.649 | 0.781 | 0.860 | 0.947 |

**`R` — contamination control, three states (per clinical #5/#6).** The key change: distinguish a **curation gap** from a **quality defect**.

```
if not lowBiomass(body_site): R = 1.00
else:  Negative controls reported == true  → R = 1.00
       Negative controls reported == false → R = 0.55   (confirmed no controls: quality defect)
       Negative controls reported == blank → R = 0.80   (UNASSESSED: curation gap, surfaced as such)
```

`unassessed = 0.80` (not `0.55`) means a competent-but-uncurated low-biomass study is not punished as if it were a bad one; the feed shows "contamination controls: not yet assessed" so the reader attributes the discount to missing metadata, not to the study. Taxon-aware `R` (kitome cross-reference) is Phase 4 (science #7).

### 3.2 Taxon roll-up: `w` → per-taxon certainty (computed per niche)

**Join first (feasibility #2).** Each signature row attaches to its experiment via the composite key `Study + "||" + Experiment page name`; each experiment attaches to its study via `experiments.Study === studies["Study page name"]`. Roll-up is stratified by **body-site class** (per science #5 / clinical #9), never pooled — pooled *Lactobacillus* is niche-confounded (gut vs urogenital behave oppositely).

**Step 1 — Collapse repeated measures, conservatively (per science #3 / clinical #8).** Until a curated `Cohort ID` exists, rows sharing `(Body site, n0, n1)` **across any Study** and the same direction collapse to **one** suspected-shared cohort weighted `max(w_i)` (no repetition bonus). This is the conservative floor: it cannot inflate replication. When `Cohort ID` is curated, distinct IDs separate and a bounded repetition bonus `max(w)·(1+0.05·(m−1))` capped at `1.15·max` applies within an ID.

**Step 2 — Directional agreement.**
```
W_up, W_down = Σ w by direction (within niche) ;  net = W_up − W_down ;  direction = sign(net)
agreement = |net| / (W_up + W_down)      # 1 = unanimous, 0.6 = 4-up/1-down
```

**Step 3 — Independent-replication bonus, gated on Cohort ID + method diversity (per science #3, clinical #8, clinical #11).**
```
k_indep = # distinct CURATED cohort IDs agreeing with direction     # if no Cohort ID curated: k_indep = # distinct (site,n0,n1) groups, min-floored to treat ties as shared
methodDiversity = distinct apertures among concordant cohorts / concordant cohorts   # monoculture → ~ (1/k), diverse → ~1
repl = 1 + 0.20 · log2(max(1, k_indep)) · (0.5 + 0.5·methodDiversity)   # single-method agreement earns half the bonus
```
Replication credit is **off** (`repl=1`) until `Cohort ID` exists — shipping a known population-overlap inflator is not acceptable.

**Step 4 — Two surfaces.** A continuous internal score for sorting only; a discrete tier for display.
```
raw = max(W_up,W_down) · agreement · repl
conf = 100·(1 − exp(−raw/2.5))      # INTERNAL ONLY — ordinal consistency heuristic, NOT statistical confidence, never shown (science #6, clinical #12)

tier = High     if conf≥70 and k_indep≥3 and agreement≥0.75 and R̄≥0.9 and methodDiversity>0.5
       Moderate if conf≥45 and k_indep≥2 and agreement≥0.60
       Low      if conf≥20 and k_indep≥1
       Very-Low otherwise
Downgrade one tier if aperture-blind for the taxon's own kingdom (§4) OR mean R̄ < 0.6.
```

Because `R̄≥0.9` requires curated controls, **`High` is unreachable at low-biomass sites until back-fill**; per clinical #5 this ceiling is made **explicit** in the UI ("max achievable certainty here = Moderate, gated by contamination controls"), not silently imposed.

**`conf` is defined as an ordinal cross-study consistency heuristic, not a probability** (science #2). It never drives a prediction and never appears in the UI — not on the chart, not on hover. Spoke magnitude reads discrete agreement bins (§6).

### 3.3 Worked example — endometriosis *Lactobacillus* (recomputed from the real rows)

The earlier draft's table was fabricated (feasibility #4, clinical #2). The **verified** 9 genus-level *Lactobacillus* signatures are **7 increased / 2 decreased**, across Feces, Vagina (posterior fornix), Mouth, Ovary, and Uterine cervix — **not** five "30/55 uterovesical" rows (the real 30/55 uterovesical experiment, PMID 29771400, carries no *Lactobacillus* signature at all). The two decreased votes are Feces (32681566, n≈6/6) and posterior fornix of vagina (34268384, n≈66/37); PMID 39431364 contributes an **ovary** 8/8 row and a **feces** 43/21 row; 32299442 contributes two identical uterovesical rows that the cohort rule now collapses to one.

Stratified by niche (the mandatory correction):

| Niche stratum | up / down (distinct cohorts after collapse) | net direction | agreement | tier |
|---|---|---|---|---|
| **Gut (feces)** | mixed, small n, uncorrected | weak up | < 0.6 | **Low** |
| **Urogenital (vagina/cervix/uterovesical)** | net **increased** (majority up) | up | contested | **Low**, `R̄` provisional |
| **Pooled (old model)** | 7 up / 2 down = **+5** | up | — | *reported as "increased," no caveat* |

The clinician now reads: *"Lactobacillus — direction varies by niche; urogenital evidence trends increased but is low-certainty and contamination-uncontrolled; gut evidence is weak and mixed. Low certainty (bacteria only)."* The old model reported **+5, "increased," no caveat.** The corrected message is more honest than either the old model or the draft's fabricated "peritoneal/contested" story: the point that survives is **niche confounding**, not a specific fabricated direction flip. This example ships as a **regression test** so it can never again drift from the CSV.

### 3.4 Drop-in shape for `signature.mjs`

```js
const LOW_BIOMASS = new Set(["endometrium","uterus","uterovesical pouch","ovary","peritoneal fluid",
  "endometrioma","uterine cervix","cervical cavity","fallopian tube","posterior fornix"]);
const has = v => { v=(v||"").trim().toLowerCase(); return v && !["n/a","none","-","false"].includes(v); };
const lowBiomass = s => (s||"").toLowerCase().split(",").some(x=>LOW_BIOMASS.has(x.trim()));
const COMP_GOOD = /ancom|aldex|deseq/i, COMP_NAIVE = /(t-?test|wilcoxon)(?!.*clr)/i;

// REQUIRES a joined study row: experiments.Study === studies["Study page name"]
function experimentWeight(e, study){
  const seq=(e["Sequencing type"]||"").toUpperCase();
  const regs=(e["16S variable region"]||"").split(",").filter(Boolean).length;
  let A = seq==="WMS" ? 1.00 : regs>=7?1.00:regs>=3?0.90:regs===2?0.80:regs===1?0.70:0.65; // capped at 1.00 for bacterial vote
  if(seq==="WMS" && lowBiomass(e["Body site"])) A *= 0.80 * 0.90;                             // host-swamp + classifier penalties
  const d=(study?.["Study design"]||"").toLowerCase();
  let D = d.includes("prospective")?1:d.includes("case-control")?0.9:d.includes("cross-sectional")?0.7:d.includes("laboratory")?0.55:0.7;
  D = Math.min(D*(1+0.10*has(e["Matched on"])+0.10*has(e["Confounders controlled for"])),1.0);
  const mht=/true/i.test(e["MHT correction"]||"")?1:0.8;
  const t=parseFloat(e["Significance threshold"]); const thr=(t>0&&t<=0.05)?1:(t>0.05?0.85:0.9); // "0"/blank -> 0.9 (unreported)
  const st=e["Statistical test"]||""; const comp=COMP_GOOD.test(st)?1.10:COMP_NAIVE.test(st)?0.85:1.00;
  const S=mht*thr*comp;
  const n=Math.min(+e["Group 0 sample size"]||0,+e["Group 1 sample size"]||0);
  const C = n ? 0.30+0.70*n/(n+25) : 0.40;
  let R=1.0; if(lowBiomass(e["Body site"])){ const nc=(e["Negative controls reported"]||"").trim().toLowerCase();
    R = nc==="true"?1.0 : nc==="false"?0.55 : 0.80; }   // blank = UNASSESSED (curation gap), not 0.55
  return A*D*S*C*R;
}
```

`buildLevels()` change (per feasibility #5): **`value` stays the signed integer net vote** so `emitTemplate` and `parseSidebar`'s `^\[(-?\d+)\]` regex and the hand-curated `sidebar.csv` are untouched. Each taxon carries new sibling fields `{tier, agreementBin, k_indep, direction, coverageState, apertureKingdoms}`; spoke magnitude reads `agreementBin`, not `value`.

---

## 4. Detection-aperture & inter-kingdom layer

This layer never touches the vote math. It makes "absence of evidence vs evidence of absence" computable, rendered, and actionable.

### 4.1 Domain parsing — fixed for the double-`k__` convention (clinical #1, blocking)

Every lineage in this corpus carries **two** `k__` tokens — e.g. `k__Bacteria|k__Bacillati|p__…` and `k__Bacteria|k__Pseudomonadati|p__…` — because NCBI-rank clades sit under the domain. The current regex at `signature.mjs:20` (`/^([kpcofgs])__(.+)$/`) matches **both** and double-counts Kingdom. `domain(taxon)` is redefined to parse **all** `k__` tokens against an explicit rank table, never first-token and never a name substring (the substring approach is exactly what would let `p__Candidatus Saccharibacteria`, a bacterium, mis-match *Candida albicans*, a fungus):

```
tokens = all k__ values in lineage
if tokens include "Bacteria"  → domain = Bacteria
if tokens include "Archaea"   → domain = Archaea
if tokens include "Eukaryota" → domain = read the NEXT k__ token: {Fungi, Metazoa, ...}  (a Candida lineage = k__Eukaryota|k__Fungi|p__Ascomycota…)
if tokens include "Viruses"/"Viroids" → domain = Viruses
else → UNKNOWN (fail-safe: never counted as coverage)
```

Ships with unit tests over (a) a real bacterial lineage from the corpus, (b) a synthetic `k__Eukaryota|k__Fungi|…|s__Candida_albicans`, and (c) the `p__Candidatus Saccharibacteria` false-friend, **before Phase 1**. The `signature.mjs:20` double-count is fixed in the same change (dedupe kingdom to the resolved domain).

### 4.2 Method → detectable-domain capability matrix

Static curated lookup keyed on `Sequencing type` (+ `16S variable region` for 16S). Cells are `full | partial | conditional | none`. **This is where shotgun's breadth lives** (the advantage removed from `w`):

| Method | Bacteria | Archaea | Fungi | Viruses | micro-Euk | max resolution |
|---|---|---|---|---|---|---|
| **16S** | full | partial¹ | **none** | none | none | Genus |
| **ITS** | none | none | **full** | none | partial | Species |
| **18S** | none | none | full | none | **full** | Genus–Species |
| **WMS** | full | full | conditional² | conditional³ | full | Species/strain |
| **virome** | none | none | none | **full** | none | vOTU |
| **qPCR** | target only | target | target | target | target | single taxon |
| **culture** | culturable | partial | culturable | none | partial | isolate |

¹ standard bacterial primers under-recover archaea. ² shotgun sees fungi but fungal read fraction is biomass-gated — the `conditional` weight is defined from a **documented fungal-recovery basis** (reported fungal-read fraction where available; else a literature default ~0.25 with the source cited), not a bare constant (science #5). ³ dsDNA libraries miss RNA viruses.

A `primer_blindspots` table handles the **16S V-region problem** — `(v_region, taxon_pattern) → downgrade` (e.g. V1–V2 under-amplifies *Bifidobacterium*), so those experiments don't count as capable coverage for that taxon while still counting for others.

### 4.3 Niche-stratified coverage denominator + three-state classifier (science #5, clinical #9)

Coverage is **per (condition, body-site class, taxon)** — the denominator is "experiments that assayed the relevant niche," not all experiments. This is essential: 17/44 endometriosis experiments are feces, so pooling would flag a legitimately-assayed endometrium taxon as blind (or count fecal shotgun as "coverage" for a uterine fungal question, which it is not).

```
capable(exp, taxon) = matrixWeight(MATRIX[seq_type][domain(taxon)]) · primerDowngrade  , only for exp in the taxon's niche
coverage_frac(condition, niche, taxon) = Σ_{exp∈niche} capable(exp,taxon) / |exp∈niche|
```

| State | Condition | Rendered as |
|---|---|---|
| **MEASURED** | `coverage_frac ≥ 0.5` **in its niche** | normal graded signature (net vote + tier) |
| **UNDER-POWERED** | `0 < coverage_frac < 0.5` in niche | shown, flagged "limited detection coverage (k of N capable at this site)" |
| **DETECTION-BLIND** | `coverage_frac < 0.05` in niche **and** no capable method at that site | removed from the numeric chart, emitted to the Detection-Gap panel — never a `0` |

**Candida (recomputed honestly, per feasibility #3).** Domain Fungi. Capable fungal methods anywhere in the corpus = 0 (both WMS rows are **fecal**, so they don't speak to the **urogenital** fungal question, and even fecal fungal coverage is `conditional`/biomass-gated). For the urogenital niche, fungal `coverage_frac = 0` → **DETECTION-BLIND**. The pipeline stops asserting "Candida is not part of the endometriosis signature" because no instrument that could see it was used there. The detection-blind *conclusion* holds; the earlier *arithmetic* (which invoked a nonexistent shotgun-endometrium row) is discarded.

### 4.4 Inter-kingdom hypotheses — unsigned, niche-gated, off the radial (science #4, clinical #4/#10)

Detection-blindness alone flags every fungus (not actionable). A prediction layer may promote a blind taxon to a **hypothesis** — but under the hard rework from review:

1. **Unsigned by default.** The default surfaced statement is directionless: *"Fungi were not assayable at this site; ITS/18S or shotgun is required to determine whether Candida is present."* A **directional** prior (e.g. *Lactobacillus↓ → Candida↑*) is only shown when **all** of the following hold in the taxon's own niche: (a) a named, PubMed-MCP-verified mechanistic prior exists for that niche; (b) the grader's **net within-niche direction** matches the prior's required direction; (c) that direction is **≥ Moderate** and **agreement ≥ 0.60**; (d) it survives the compositional caveat (a co-directional shift across many taxa driven by one dominant taxon is not counted as multiple independent permissive markers).

2. **On this corpus, the directional *Candida* prediction does not fire.** Urogenital *Lactobacillus* here is **net increased**, not decreased (clinical #10) — so condition (b) fails. What ships for endometriosis is the **unsigned** detection-gap statement only. This is the honest outcome: we do not manufacture "expected Candida bloom" from evidence the grader itself labels increased-and-contested. The directional hypothesis is reserved for a corpus/niche where the net direction genuinely supports it.

3. **Data-driven arm.** Where any shotgun/ITS data exists, SparCC/SPIEC-EASI (compositionally aware) can upgrade a prior to "prior + measured local co-occurrence." Where none exists (as here), this arm is empty and any prediction rests on mechanism alone, labeled as such.

4. **Five structural walls (unchanged) + epistemic gate (new).** Predictions live in a separate `predicted_taxa` store the vote code never reads; render in a **physically separate "Hypotheses (not measured)" panel**, off the radial axis entirely (clinical #4 — a dashed node adjacent to real spokes reads as a weak finding and is machine-scrapable as one); carry an explicit "hypothesis, not a finding" qualifier in ImageObject/alt-text/exports; require ≥1 named mechanistic pair; and **auto-retire on measurement** (a capable ITS/shotgun experiment flips the taxon to a real MEASURED/null state). Predictions generate no Update-History entry; first mention of *Candida albicans* links to its page; prose + table only.

---

## 5. Ingestion & update pipeline

A strict superset of the current generator. Nothing about `signatures.csv → aggregateSignatures → buildLevels → meta.signature` changes; ingestion is a **staging layer in front of the CSVs.** Approved changes append rows (`State=Complete`) and re-run `build-signature.mjs` unchanged. The existing Rgbcode Research Manager fetch engine (PubMed/NIH + SERP + Dropmark) is **preserved** and feeds the front.

```
Rgbcode fetch → candidate_papers → dedupe/match → LLM extraction (draft rows)
   → ingest_proposals (State=proposed) → PubMed-MCP citation verify (HARD GATE)
   → auto-grade + diff vs live meta.signature → REVIEW QUEUE (human)
   → approve → append rows to CSVs → build-signature.mjs (unchanged) → meta.signature regenerated
```

**1. Gap-aware discovery.** Band A = standard surveillance. Band B computes the corpus's *missing assay methods* from the live CSVs and queries exactly those gaps — the operationalized motivating case:

| Detected gap (from live CSVs) | Auto-generated Band-B terms |
|---|---|
| No `WMS` rows | `AND ("shotgun metagenom*" OR "whole metagenome")` |
| No `k__Fungi` taxa | `AND (ITS OR mycobiome OR fungal OR Candida OR "18S rRNA")` |
| No `k__Archaea` | `AND (archaea OR methanogen)` |
| No viral taxa | `AND (virome OR bacteriophage OR "viral metagenom*")` |
| 16S V-region skew | `AND (ITS OR shotgun OR "V1-V2" OR "full-length 16S")` |
| Low-biomass site, no contamination mention | `AND ("negative control" OR reagent OR decontam OR kitome)` |

Each hit is tagged `sequencing_hint` so gap-fillers outrank yet-another-16S confirmation.

**2. Dedupe & match, two-level.** PMID/DOI exact → DUPLICATE; Jaro-Winkler(title) ≥ 0.92 with |Δyear| ≤ 1 → LIKELY-DUPLICATE held for human confirm (the corpus already has PMID-less rows like `Study 501`). A re-analysis of an existing cohort attaches as a **new Experiment on an existing Study**; a genuinely independent paper mints a **new Study** — **and a curator sets `Cohort ID`**, which is what gates any replication credit (§3.2). Only distinct `Cohort ID`s raise reproducibility.

**3. Curation with hard gates.** LLM pre-fills `State=proposed` draft rows. Human-mandatory: (i) **PubMed-MCP citation verification is non-skippable** — subagents fabricate author names, so `Authors list / PMID / DOI / Journal / Year / Title` are overwritten from the canonical MCP record and a no-match **blocks** the proposal; pathogen+virulence+metal extraction is authored in the main loop (it trips the subagent AUP filter). (ii) Taxon lineage + direction confirmed. (iii) `Sequencing type` / `16S variable region` / **`Statistical test`** / `Body site` confirmed (they drive grade and coverage). State machine reuses `State`/`Reviewer`: `proposed → verified → published` (or `rejected`, kept for audit).

**4. Auto-grade + structured diff.** On `verified`, the experiment is graded and diffed against live `meta.signature`. Typed changes:

| `change_type` | Fires when |
|---|---|
| `NEW_TAXON` | taxon had no prior entry (e.g. *Candida*, previously undetectable) |
| `DIRECTION_FLIP` | merged evidence reverses increased↔decreased |
| `TIER_CHANGE` | taxon crosses a certainty boundary |
| `WEIGHT_ONLY` | confirmatory study raises weight without moving tier/direction |
| `DENOMINATOR` | corpus/niche gains its first fungal/archaeal/viral-capable assay — changes the meaning of every prior absence there |

**5. Update-History discipline (material only).** Material iff: a new taxon crosses ≥Moderate; a direction reversal; a tier change; first-ever new-kingdom coverage in a niche (a `DENOMINATOR` event); or a safety/status change. The *n*th confirmatory 16S study at the same tier is **non-material** — its `WEIGHT_ONLY` increment accrues silently. Predicate: `material = changes.some(c => c.material) || denominator_change != null`.

**6. Governance.** Nothing auto-publishes. Approval serializes the change set to `_generator/samples/<slug>/_proposals/<pmid>.json` (a reviewable text diff), rows append to the CSVs, and the existing command re-runs:

```bash
node _generator/build-signature.mjs --slug endometriosis --title "Endometriosis" --dry-run --out /tmp/endo.json   # preview
node _generator/build-signature.mjs --slug endometriosis --title "Endometriosis"                                  # publish
```

**Ingestion trace (the payoff):** a 2024 ITS mycobiome paper reporting *Candida albicans* enriched in urogenital cases → Band B (fungal gap) surfaces it → new Study + curated `Cohort ID` → LLM draft, PubMed-MCP verifies the citation, curator confirms `s__Candida_albicans` / increased / assay=ITS / niche=urogenital → graded → diff emits `NEW_TAXON Candida` + `DENOMINATOR Fungi (urogenital): not-assayed → assayed` → **material on two counts** → on publish, `aggregateSignatures()` now sees the `k__…|k__Fungi` lineage, `buildLevels()` adds a Fungi node, the **unsigned detection-gap statement retires**, and Update-History records the first fungal finding. Absence-of-evidence becomes a measurement.

---

## 6. Clinician-facing surface

Design law: **prose + canonical tables only**; canonical components only (grey pill = `.research-hero__center-tag`; badge = `.breadcrumb__item .badge`; the chart's existing 4-color legend). Red (`#cc3333`) stays reserved for existing modal chrome — a low grade is **never** danger-red. Everything reads the one `evidence` block.

**Per-paper evidence pills** (in `.research-hero__center-tags`, beside Favorite / Download PDF). Text carries the value (accessible, not color-dependent):

```
[ ⌖ 16S V3–V4 ]  [ ◲ Case-control ]  [ n 214 ]  [ Σ ANCOM-BC ]  [ ✓ MHT-corrected ]  [ ⚑ Low-biomass · controls not assessed ]
```

The Aperture pill tooltip is the paper-level fix: *"16S rRNA detects bacteria and archaea only. Fungi, viruses, and strain-level calls are outside this method's aperture."* A missing column renders as `⌖ Method not reported` — itself information. The `Σ` statistical-test pill (per clinical #7) surfaces compositional validity. A **weakest-link tier badge** precedes each feed title, rendered everywhere as a **split token** — `Moderate (bacteria only)` (per clinical #3) — so the aperture qualifier travels into the feed, search results, and exports; its tooltip names the limiting facet and the "association, not causation" qualifier (per clinical #5). A canonical filter/sort bar (Method · Evidence tier · Strongest-first) reflects state in the URL.

**On the radial chart (`MicrobiomeSignature.tsx`), additive SVG only — the four-color grammar untouched:**

- **Agreement ring** — an outer arc whose completeness encodes **discrete agreement bins** (not continuous `conf`, per science #6 / clinical #12): a taxon concordant across many distinct cohorts draws a near-closed ring; a lone study draws a short arc. One `<circle>` per node.
- **Coverage line** in the modal header: `Coverage (urogenital): Bacteria ● Archaea ◐ · Fungi ○ Viruses ○ — 95% 16S`. The single most important element for the motivating case: the chart states on its face that fungi were never in view, so "no Candida entry" cannot be misread as "no Candida." Coverage is shown **per niche**.
- **Hypotheses live in a separate panel below the radial** (per clinical #4), never on the axis — labeled "Hypotheses (not measured)," each row carrying the word *predicted*/*not measured* adjacent even in truncated/mobile views. For endometriosis this panel currently shows only the **unsigned** *"Fungi not assayable here — ITS/18S/shotgun needed to settle Candida"* row (no direction, per clinical #10).

**Condition-level "Evidence & Coverage" section** (after Microbiome Signature in the fixed sidebar): a plain-language prose lead labeled **association certainty (observational)**, not bare GRADE (per clinical #5), plus two tables — an **Evidence profile** (studies/experiments, method mix, per-niche kingdom coverage, design floor, reproducibility, and a **split verdict**: "Moderate bacterial / Very-low trans-kingdom," with the explicit ceiling "max achievable here = Moderate, gated by contamination controls") and a **Known blind spots** table (Fungi/Candida → *16S is a bacterial marker gene* → *ITS/18S/shotgun would close it*). A "**all evidence is single-method (16S)**" limitation line appears when method diversity is low (per clinical #11).

**Guardrails.** No fused 0–100 score anywhere, including hover (per science #6 / clinical #12) — hover shows "replicated in N distinct cohorts, X% directional agreement." The "did-not-look ≠ looked-and-absent" invariant is enforced in three orthogonal places: visually (solid = measured, empty dot = not-assayable kingdom, separate panel = hypothesis), in the data model (never-in-aperture vs assayed-and-null), and in prose (the pipeline never emits "X is not part of the signature" for a taxon whose kingdom failed the aperture check; it emits "X was outside the detection window"). Reusable caveat template: *"Detected by: 16S rRNA (bacteria, archaea). Cannot detect: fungi, viruses. So Candida's absence here means 'not measured,' not 'not present.'"*

**Auditability.** Every pill/tier/word links to a **Rubric panel** naming each facet, the CSV column and value used, and its contribution, ending in the weakest-link tier. Generated from the same `evidence` block that drew the badge, so the two can never disagree; a blank `MHT correction` shows as a blank cell, not a silent bump. The recomputed *Lactobacillus* example (§3.3) is wired as a regression test so the rubric can never drift from the CSV.

---

## 7. Consolidated data-model delta

### New column on `experiments.csv`

| Column | Values | Required? | Why / default |
|---|---|---|---|
| **`Negative controls reported`** | `true / false / blank` | **Required (ship first)** | STORMS §4 / Eisenhofer 2019; drives `R`. Blank → `R=0.80` **unassessed** (curation gap, surfaced), `false` → `0.55`, `true` → `1.00`. Back-fill only the ~10–12 low-biomass endo experiments; feces/vaginal-high-biomass rows get `R=1.00` and need nothing. |
| `Cohort ID` | free text / blank | **Required for replication credit (Phase 3)** | Distinguishes replication from cohort reuse; **replication bonus is off until this exists** (science #3 / clinical #8). Curated at ingestion. |
| `DNA extraction kit` | free text | v2 | Kit predicts the kitome; enables taxon-aware `R`. |
| `Decontam applied` | enum | v2 | Stronger than merely having controls. |
| `Effect size + CI` (on `signatures.csv`) | free text/num | v2 | Per-taxon log-fold-change + CI to weight magnitude, not just direction (clinical #7). |

**Value-set extension (no schema change):** `Sequencing type` gains `ITS · 18S · virome · qPCR · culture`. Unknown methods default to `none` in the capability matrix (fail-safe). `Statistical test` is now **read** by `S` (it already exists and is populated).

### New static/curated reference tables (CSVs beside `samples/<condition>/`)

| Table | Purpose |
|---|---|
| `method_domain_capability` | `(sequencing_type, domain) → full/partial/conditional/none`, `conditional_weight_basis`, max_resolution, caveat |
| `primer_blindspots` | `(v_region, taxon_pattern) → downgrade`, with citation |
| `interkingdom_relationship` | `source_taxon, source_direction, target_taxon, target_expected_dir, relationship_type, niche, mechanism, citation_refs, strength` — PubMed-MCP-verified, one `(source,target,niche)` row at a time (feasibility #7) |

### New Supabase tables (ingestion staging)

| Table | Purpose |
|---|---|
| `candidate_papers` | raw discovery hits (pmid, doi, condition_slug, source, sequencing_hint, match_status) |
| `ingest_proposals` | one row per change set (proposed rows jsonb, grade, diff, citation_verified, State, Reviewer) |
| `predicted_taxa` | **walled** hypothesis namespace (taxon, domain, expected_dir *(null unless niche-gated)*, matched_pair_ids, niche, detection_status, evidence_class='HYPOTHESIS') |
| `research_action` | auto-generated study proposals (condition, gap, target, proposed_study_json, literature_query, status) |

### Derived, computed

`taxon_coverage(condition, body_site_class, taxon, domain, coverage_frac, state)` and the per-Experiment/Study/(condition,niche) `evidence` block — emitted by the generator, cached in the page pipeline.

### New generator modules

`lib/coverage.mjs` (`experiments.csv` + capability matrix → niche-stratified `taxon_coverage`; does not modify vote math). `lib/predict.mjs` (niche-stratified directions + `interkingdom_relationship` → `predicted_taxa` + `research_action`; emits unsigned unless the epistemic gate passes). `computeEvidence()` lives beside `aggregateSignatures()`. `buildLevels()` gains exactly one read of `taxon_coverage.state` (badge MEASURED/UNDER-POWERED, exclude DETECTION-BLIND) and writes the new sibling fields — **`value` stays a signed integer** (feasibility #5). Predictions are drawn by a separate component that never touches chart data.

---

## 8. Phased rollout (ordered by clinical value)

| Phase | Ships | Clinical value | Data-model cost |
|---|---|---|---|
| **1 — Weighted grade + niche-stratified detection coverage (highest value)** | Fix `domain()` double-`k__` parser + unit tests (**blocking gate**); join `experiments.csv`+`studies.csv` (composite key); `experimentWeight()` with aperture decoupled from the bacterial vote; niche-stratified taxon roll-up (replication **off**, no `Cohort ID` yet); `method_domain_capability` + niche `taxon_coverage` three-state classifier; coverage line + split-token tier badge + methods pills (incl. `Statistical test`) + Rubric panel; add `Negative controls reported` (blank → `unassessed 0.80`); tuning-constant **sensitivity analysis** as a gate. | The *Lactobacillus* "+5 increased" → "niche-confounded, Low, bacteria-only" correction and the "Fungi ○ blind — Candida's absence is not evidence of absence" per-niche coverage strip both go live. Flips the two motivating clinical messages, honestly. | 1 new column (blank-safe), 2 static tables; no replication credit and no prediction yet. |
| **2 — Detection-Gap panel + unsigned hypotheses** | Separate "Hypotheses (not measured)" panel off the radial; unsigned detection-gap rows; `primer_blindspots`; `interkingdom_relationship` seeded but **directional prediction gated** on within-niche net direction + agreement (does not fire for endo *Candida*). | *Candida* surfaces as an explicit "expected-but-unmeasured, direction undetermined here" gap with the exact study that would settle it — never as a directional near-finding. | 1 curated table + walled store. |
| **3 — Cohort ID + replication + gap-aware ingestion + auto-diff** | `Cohort ID` column + curation; enable method-diversity-weighted replication bonus; `candidate_papers` + `ingest_proposals`; Band-B gap queries; PubMed-MCP hard gate; auto-grade + typed diff; material-change predicate; `_proposals/*.json` review branch. | Distinct-cohort replication finally raises certainty (without phantom inflation); new ITS/shotgun papers flow in graded, deduped, diffed; the *Candida* gap retires the day a capable paper lands. | `Cohort ID` column; Supabase staging tables. |
| **4 — Refinements (v2)** | Taxon-aware `R` (Salter/Eisenhofer kitome list); `DNA extraction kit` + `Decontam applied` + `Effect size + CI`; SparCC/SPIEC-EASI co-occurrence arm (enables **directional** predictions where measured); magnitude-weighted display. | Sharper `R` at low biomass, data-confirmed inter-kingdom edges, magnitude visible. | 3 optional columns, back-filled incrementally. |

The old unweighted integer score remains computable throughout (it is still `value`), so annotations layer on top without disturbing the verified aggregation the chart depends on.

---

## 9. Decisions for Karen

| # | Decision | Recommendation |
|---|---|---|
| 1 | **Cohort ID timing.** Review makes `Cohort ID` a hard prerequisite for *any* replication credit. Ship Phase 1 with replication **off** (conservative), add `Cohort ID` in Phase 3? | **Yes.** Shipping a known population-overlap inflator is not acceptable; "off" is the correct default until curated. |
| 2 | **Tuning constants** — `τ=2.5`, `k=25`, the shotgun low-biomass `0.80·0.90`, `R` states, tier cutoffs. | Ship as a **config file** + run a **sensitivity analysis** (tier assignments stable to ±factor perturbations) as a Phase-1 gate, per science #6. |
| 3 | **Score visibility.** Keep `conf` fully internal — **not even on hover** (review found the old hover spec self-contradictory). Hover shows agreement % + distinct-cohort count only. | **Yes** — a printed 35.9 invites false ranking and screenshots. |
| 4 | **Prediction posture.** Ship **unsigned** detection-gap statements now; enable **directional** priors only where the grader's own within-niche net direction supports them (so *not* endo *Candida* today). | **Yes.** This is the epistemic fix; the directional *Candida* story returns the moment a corpus/niche actually shows *Lactobacillus↓*. |
| 5 | **Back-fill labor.** `Negative controls reported` needs a one-time Methods scan of the ~10–12 low-biomass endo experiments to lift them off `unassessed 0.80`. Who curates, and on what cadence? | The only manual back-fill Phase 1 needs; feces/high-biomass rows need none. Treat as a **launch task**, not a blocker (unassessed is a safe, honestly-labeled default). |
| 6 | **Certainty vocabulary.** Use "**association certainty (observational)**" with High/Moderate/Low/Very-Low, the "association ≠ causation" qualifier **on the badge tooltip** (not only prose), and an **explicit ceiling** ("max achievable here = Moderate") at low-biomass sites. | **Yes** — GRADE wording is the lingua franca but must not read as causal certainty, and the ceiling must be visible, per clinical #5. |
| 7 | **`conditional` fungal weight.** Define the shotgun fungal-coverage weight from a documented fungal-recovery/host-read basis vs a literature default constant. | Recommend a **documented basis where the paper reports it**, falling back to a cited literature default — never a bare unexplained 0.25. |

---

**Primary files (absolute):**
- `/Users/karenpendergrass/microbiomemedicine/_generator/lib/signature.mjs` — fix the double-`k__` regex at line 20; add `experimentWeight` / `taxonConfidence` / `gradeTier` / `computeEvidence` / `domain()`; **keep `value` as signed integer**; add sibling tier/coverage/agreement fields.
- `/Users/karenpendergrass/microbiomemedicine/_generator/build-signature.mjs` — join `experiments.csv`+`studies.csv` (composite key `Study||Experiment page name` for signatures; `experiments.Study === studies["Study page name"]` for design); unchanged regeneration entrypoint.
- `/Users/karenpendergrass/microbiomemedicine/_generator/lib/feeds.mjs` — `buildResearchFeeds` reused for new study pages.
- New modules: `lib/coverage.mjs`, `lib/predict.mjs`.
- New static CSVs beside `samples/<condition>/`: `method_domain_capability.csv`, `primer_blindspots.csv`, `interkingdom_relationship.csv`.
- New Supabase tables: `candidate_papers`, `ingest_proposals`, `predicted_taxa`, `research_action`.
- New `experiments.csv` columns: `Negative controls reported` (Phase 1), `Cohort ID` (Phase 3); three optional in v2.
- Frontend (unchanged component vocabulary): `src/components/MicrobiomeSignature.tsx` (agreement rings, per-niche coverage line, **separate** hypotheses panel), `StudyActions.tsx` / `ResearchFeedView.tsx` (pills incl. `Statistical test`, split-token tier badge), `ArchiveView.tsx` (filter/sort bar), `WpRender.tsx` (Evidence & Coverage sidebar order), plus a Rubric modal.
- Regression test: the §3.3 *Lactobacillus* worked example, pinned to the real `signatures.csv` rows.

---

## 10. Follow-up decisions (2026-07-02): re-derive capability + grade placement

### 10.1 Can we add a study and derive a new signature read? — Yes for derivation, no for intelligent ingestion.

The **derive-a-new-read mechanism already exists and works today.** `_generator/build-signature.mjs` reads the three CSVs, calls `aggregateSignatures()` → `buildLevels()`, and writes `meta.signature` to the condition's `content_items` row; it also auto-generates/reuses the research-feed study pages. A live `--dry-run` on endometriosis (2026-07-02) recomputed all 7 taxonomic levels from 55 signature rows and reconciled 17 research-feed pages against Supabase (1,939 slugs known). So the loop **edit CSVs → re-run → new signature read + new study pages** is real and proven.

What is missing is everything *around* that loop — and it is exactly the Phase-3 ingestion pipeline in §5. The table below is the honest gap analysis.

| Step | Exists today? | Where it lives |
|---|---|---|
| Aggregate signature rows → net scores → chart data | **Yes** | `aggregateSignatures` / `buildLevels` |
| Re-derive a full signature read from edited CSVs | **Yes** | `build-signature.mjs` (dry-run proven) |
| Auto-create/reuse research-feed study pages for new studies | **Yes** | `buildResearchFeeds` in `feeds.mjs` |
| **Discover** new papers not in the CSV | No | Rgbcode fetch engine exists but is not wired to the CSVs (§5 Band A/B) |
| **Dedupe/match** a new paper vs the corpus (PMID/DOI) | No | §5 step 2 |
| **Grade** the new experiment on ingest | No | §3 (`computeEvidence`) — unbuilt |
| **Curate** a new taxon into the chart (sidebar detail) | Manual | `emit-template` → human fills `sidebar.csv` → re-run |
| **Diff / review queue / material-change gate** | No | §5 steps 4–6 |

Two nuances that matter for "derive a new read":
1. Re-running is a **full rebuild from the CSV set**, not an incremental "add one study" call. The CSVs are the source of truth; you append rows and regenerate.
2. Adding a study **automatically updates the net score of taxa already curated in `sidebar.csv`**, but a **genuinely new taxon** (e.g. the first *Candida* row) only appears on the radial chart after the human fills its `sidebar.csv` detail row (`emit-template` step). Grading + ingestion (Phases 1 and 3) automate the grade and the review queue around this, but the sidebar curation of a brand-new taxon stays a human sign-off by design.

**Decision recorded:** build the intelligent layer as specified in §5, on top of the existing (working) derivation core. No rewrite of the generator is needed — ingestion is a staging layer in front of the CSVs, and the final publish step is the same `build-signature.mjs` that already runs.

### 10.2 Grade placement — locked to two surfaces (both confirmed against the live components)

**Surface A — research-feed paper (the study page).** Confirmed target: `ResearchFeedView.tsx`, the `research-hero__center-tags` container (currently holding only `<FavoriteStudyButton>`, line ~153). The per-paper evidence pills from §6 render here, beside Favorite, with the split-token tier badge (`Moderate (bacteria only)`) preceding the title. Data source: `buildResearchFeeds` (`feeds.mjs`) computes the per-study `evidence` block from that study's `experiments.csv` row(s) and writes it to the research-feed page `meta.evidence`; the view reads `meta.evidence`. The archive/list cards (`ArchiveView.tsx`) carry the tier badge + method chip so the feed is sortable/filterable by evidence tier and method.

**Surface B — the signature modal's own right sidebar (Karen's specific request).** Confirmed target: `MicrobiomeSignature.tsx`, the right panel at `flex: 1 1 300px` / `background:#fafafa` (line ~189) that today shows the selected organism's detail HTML + the "Studies" `<details>` list. Three additions, top to bottom, so the grade reads at the point of decision without a second click:

| Position in the modal right sidebar | What shows | Source field |
|---|---|---|
| Top of panel (always visible, above organism detail) | Condition **Evidence & Coverage** micro-summary: split verdict ("Moderate bacterial / Very-low trans-kingdom"), the per-niche coverage strip (`Bacteria ● · Fungi ○ — 95% 16S`), and the "association, not causation" qualifier | condition-level `meta.signature.evidence` |
| Under the selected organism's name (when a dot is clicked) | that taxon's **certainty tier + coverage state** (Measured / Under-powered) + "replicated in N distinct cohorts, X% agreement" | per-taxon sibling fields on `levels[L][i]` (`tier`, `coverageState`, `agreementBin`, `k_indep`) |
| Inside the existing "Studies" `<details>` list | each study line gains its **method + tier pill** (same vocabulary as Surface A) so the modal's study list and the research feed agree | per-study `evidence` on `studies[]` |

Plus the additive on-chart cues from §6 (agreement ring per node; the unsigned "Hypotheses (not measured)" row for Candida in a panel below the radial). The modal's four-color legend and `#cc3333` chrome are untouched; grade pills use the canonical grey-pill affordance, never danger-red.

**Wiring note:** all three additions read the **same `evidence` block** the generator already emits — the modal receives `levels`, `organisms`, and `studies` as props today (`MicrobiomeSignature({ slug, title, levels, studies })`), so Surface B needs (a) the generator to attach `evidence` sibling fields to `levels`/`studies` and a condition-level `evidence` summary to `meta.signature`, and (b) the component to render three read-only blocks. No new data round-trip; the `/api/organism` detail fetch is unchanged.

---

## 11. Worked evidence + two follow-ups (2026-07-02): inter-kingdom curation, the *Fusobacterium* gap, and the all-taxa index

Karen supplied two real papers and flagged that *Fusobacterium nucleatum* is missing from the endometriosis page. All citations below were verified against PubMed; Gazvani 2013 is **not** MEDLINE-indexed (a grade signal in itself).

### 11.1 Inter-kingdom evidence, curated and graded (seed for `interkingdom_relationship`)

The two papers describe **different niches** and must be entered as such — collapsing them is the exact niche-confounding error §3.2 guards against.

| Source → target | Direction | Niche | Evidence type | Grade | Citation |
|---|---|---|---|---|---|
| Gut fungi (incl. *Candida*) → endometriotic lesions | depletion is **protective** | gut | antifungal-depletion **mouse (causal)** | Moderate–strong | Talwar 2025, PMID 40626932 |
| *Candida* ↔ *Enterorhabdus* | negative in health, **lost** in disease | gut | ITS2+16S SparCC, 1 cohort (n=18/31) | Moderate | Talwar 2025 |
| *Saccharomyces* ↔ *Bacteroides* / Ruminococcaceae | negative (partners **reduced** in endo) | gut | ITS2+16S SparCC | Moderate | Talwar 2025 |
| *Saccharomyces* → *Actinomyces* / Erysipelatoclostridium | positive (partners **increased** in endo) | gut | ITS2+16S SparCC | Moderate | Talwar 2025 |
| *Candida albicans* → endometrial-cell proliferation | disease-stimulatory, estrogen-dependent | endometrium (tissue) | in-vitro, **n=1 endo** | **Very-low** | Gazvani 2013 (non-indexed) |
| *Fusobacterium nucleatum* → TAGLN⁺ myofibroblasts → lesions | disease-promoting; antibiotic reverses | endometrium (tissue) | human cohort (64% vs <10%) + causal mouse + intervention | **Strong** | Muraoka 2023, PMID 37315109 |

Two scientific honesty points that the grading model must enforce and that a naïve reading would get wrong:

1. **These papers do NOT support "*Candida* increased in the endometriosis signature."** Talwar reports *Candida* abundance is **not** significantly changed; the endo signal is **interaction rewiring** (lost protective *Candida*–*Enterorhabdus* edge) plus a **whole-compartment causal effect** (antifungal depletion protects mice). So the correct inter-kingdom entry for *Candida* is a niche-tagged, interaction/causal statement — **not** a directional abundance prediction. This is precisely why §4.4 keeps the *Candida* prediction **unsigned** on this corpus.
2. **The famous *Candida*↔*Lactobacillus* antagonism and *Candida*↔*Streptococcus* biofilm synergy are vaginal/oral-niche ecology and are NOT established by either supplied paper.** They are seeded in the CSV as `NEEDS-OWN-CITATION` placeholders and must not enter the graded model until backed by their own primary source in the correct niche. (Seed file: `scratchpad/interkingdom_relationship.seed.csv`.)

The load-bearing takeaway: the strongest *causal* fungal result (Talwar's mouse antifungal depletion) and the strongest *bacterial* pathogen result (Muraoka's *F. nucleatum*) both live in **study types the current differential-abundance corpus does not ingest** — which is the bridge to the next two items.

### 11.2 Why *Fusobacterium nucleatum* is missing — three distinct failure modes

Unlike *Candida* (a pure detection-aperture gap: 16S cannot see fungi), *Fusobacterium* is missing for **three overlapping reasons**, and each maps to a different part of this system. Verified against the corpus: `signatures.csv` contains one `g__Fusobacterium` (increased) row plus Fusobacteriaceae/Leptotrichiaceae/*Sneathia*/*Cetobacterium*; `sidebar.csv` contains **zero** Fusobacterium.

| # | Failure mode | Evidence | Fixed by |
|---|---|---|---|
| 1 | **Curation gap** — genus *Fusobacterium* IS in `signatures.csv` (increased) but was never promoted into `sidebar.csv`, so it never reaches the radial chart | `grep`: 1 `g__Fusobacterium` in signatures, 0 in sidebar | **The all-taxa index (§11.3)** — surfaces the full observed set, not just the curated sidebar, and flags "in signatures, not in any sidebar" as a QA state |
| 2 | **Resolution gap** — 16S (esp. V3–V4) rarely resolves to species, so even the present genus row is not `s__Fusobacterium nucleatum` | corpus is 42/44 16S; region skew V3–V4 | detection-aperture within-bacteria resolution note (§4.2 `primer_blindspots`); flagged as "genus-only, species not resolvable by method" |
| 3 | **Study-type gap** — the definitive *F. nucleatum* finding (Muraoka 2023) is a targeted qPCR/IHC + causal-mouse + antibiotic-intervention study, **not** a differential-abundance survey, so it is outside the BugSigDB-style corpus entirely | Muraoka 2023 is cohort+mechanism+intervention | **Ingestion Band-B discovery (§5)** actively hunts mechanistic/interventional papers; the grade's **Study-design axis** ranks this human-cohort+causal evidence **above** a cross-sectional 16S survey |

So *Fusobacterium* is the case that proves one page can't be the whole answer: it needs the all-taxa index (to stop hiding curated-out taxa), the resolution note (to say "genus seen, species unresolvable here"), and graded ingestion of non-survey studies (to bring in Muraoka as **Strong** evidence). A clinician looking at the endometriosis page today sees neither the genus that *is* in the data nor the landmark species finding — the system has to fix both silences.

### 11.3 The all-taxa index — a taxon-centric surface (recommended: build it)

Karen's instinct is right and the data already exists: `aggregateSignatures()` computes a net score for **every** taxon in `signatures.csv`, not just the curated sidebar set — the generator throws the long tail away at display time (`buildLevels` keeps only sidebar taxa). An all-taxa page is a **read of data we already compute**, plus the grade/coverage layer.

**Route & shape.** A global index at `/taxa` (list) + `/taxa/[slug]` (per-taxon page), taxon-centric — the transpose of the condition-centric signature pages, mirroring how BugSigDB lets you browse by taxon.

| Surface | Contents |
|---|---|
| `/taxa` index | Every taxon observed across **all** conditions' `signatures.csv` (union), as a sortable/filterable canonical table: taxon (lineage + **domain badge**), # conditions it appears in, direction pattern (↑/↓/mixed), aggregate evidence tier, detection-coverage note, and a **curation-state** column (`on-chart` / `in-signatures-not-curated` / `predicted-unmeasured`). Filter by domain, condition, tier, method, and curation-state. The `in-signatures-not-curated` filter is the QA view that surfaces *Fusobacterium* immediately. |
| `/taxa/[slug]` page | Reverse index for one taxon: every condition + study where it was found, direction and grade per condition, the method-aperture context (which corpora could/couldn't detect it), its curated inter-kingdom relationships (§11.1), and — for never-assayable taxa — the unsigned "expected but unmeasured" note. This is where *Candida* gets a real page even though no 16S study could see it, and where *F. nucleatum* consolidates the genus-level survey rows **and** the Muraoka species-level finding. |

**Why it earns its place (three jobs, not one):** (a) **discovery** — a researcher asks "where does *Fusobacterium* show up across our conditions?" and gets an answer; (b) **QA** — the `in-signatures-not-curated` state is a standing worklist that would have caught the *Fusobacterium* omission automatically; (c) **honesty** — it is the natural home for detection-aperture context and inter-kingdom hypotheses, keeping "never looked" taxa visible without faking them onto a condition's radial chart.

**Build cost.** Low-to-moderate and mostly generator-side: a new `lib/taxa-index.mjs` unions the per-condition aggregations (reusing `aggregateSignatures` + the §3 `computeEvidence` + §4 coverage), writes a `taxa` dataset (or `content_items` of a new `type='taxon'`), and two React views reusing the canonical table + badge vocabulary. It depends on the §11.2/domain parser fix (so domain badges are correct) and reads the same `evidence` block as everything else. Sequonced after Phase 1 (needs the grade) and pairs naturally with Phase 2 (detection-gap/hypotheses).

**Platform conformance:** prose + canonical tables only; first mention of any taxon links to its `/taxa/[slug]`; the domain badge uses the canonical badge component; predicted/unmeasured taxa stay visually walled per §4.4.