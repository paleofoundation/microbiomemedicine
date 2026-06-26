**KAREN\'S BRAIN**

Master Reference Specification

Unified Framework for Microbiome Signature Analysis,

Intervention Discovery, and Validation

**Karen Pendergrass**

Founder, Microbiome Signatures • MicrobiomeMedicine.com

Version 1.0 • March 2026

Table of Contents

Part 1: Purpose and Scope

This document is the master specification for the reasoning system
informally called \"Karen\'s Brain.\" It serves two simultaneous
purposes: guiding the ongoing development of microbiomemedicine.com as a
structured knowledge platform, and providing the complete functional
specification for an application that can execute the same reasoning
process on new inputs.

The system described here is not a chatbot, a search engine, or a
recommendation tool. It is a codification of a specific method for
discovering and validating interventions for human disease through
microbiome and metallomic signature analysis. The method has been
developed and refined over 15 years of practice, beginning in 2010 with
the discovery that multiple seemingly unrelated diagnoses shared
overlapping microbiome signatures.

What This Document Contains

This specification is organized into seven parts. Part 1 establishes
purpose and scope. Part 2 defines the foundational mindset and epistemic
commitments that govern the reasoning. Part 3 codifies the knowledge
primitives, which are the reusable building blocks the system depends
on. Part 4 formalizes the reasoning pipeline as an executable sequence.
Part 5 specifies the validation logic including acceptance criteria and
rejection rules. Part 6 provides the application architecture for the
software system. Part 7 maps this specification to the existing
microbiomemedicine.com platform and identifies development priorities.

The Two Outputs This Serves

**For microbiomemedicine.com:** This document provides the explicit
logic behind every condition page, intervention validation, STOP
recommendation, and microbiome signature database entry. It makes the
editorial methodology inspectable so that clinicians, researchers, and
contributors can understand not just what is presented, but why, and can
apply the same reasoning to new conditions.

**For the application:** This document provides the algorithmic
specification that an AI system needs to take a microbiome signature as
input, reason through it using the same logic Karen applies, generate
intervention hypotheses, walk through validation, flag contradictions,
and produce outputs structured for clinical or research use.

Part 2: The Foundational Mindset

Before formalizing the pipeline or knowledge base, it is essential to
codify the epistemic stance that governs the reasoning. This is what
makes the system distinctive. Any implementation that captures the steps
but misses the mindset will produce superficially similar but
fundamentally different outputs.

Core Epistemic Commitments

Constraint-Based Ecosystem-Level Causal Inference

A disease condition is treated as the emergent outcome of interacting
subsystems: microbes, metals, diet and exposome, host defenses,
ecological state, and co-infections. No single variable is treated as
\"the cause.\" The goal is to reconstruct the system of constraints that
makes the disease state stable, and then to identify which constraints
can be broken to destabilize it.

Triangulation as Default Epistemic Standard

Confidence increases only when different approaches with different bias
structures converge on the same conclusion. A single study, a single
mechanism, or a single clinical outcome is never sufficient. The system
explicitly seeks independent lines of evidence and downgrades confidence
when convergence fails. This aligns with the formal concept of evidence
triangulation in aetiological epidemiology.

Causal Plausibility Filter

Statistical association is never treated as sufficient. Every proposed
relationship must answer the question: does this make mechanistic sense
in the full system? This applies Bradford Hill-style multi-viewpoint
reasoning without requiring all criteria to be met, but requiring that
no proposed relationship actively contradicts known mechanism.

Anti-Silo, Anomaly-Driven Reasoning

The system treats anomalies as the most informative data points. A taxon
that is decreased when it \"shouldn\'t\" be, a nutrient that is depleted
when supplementation makes it worse, a treatment that works for unknown
reasons: these are signals of hidden constraints or hidden exposures.
The system prioritizes explaining anomalies over confirming expected
patterns.

> *\"I was looking at it, and there was one taxa that showed as
> decreased, which I was like, that\'s very suspicious. Why would that
> one be decreased? Who targeted this one specific taxa? That doesn\'t
> make sense. And then I was like, this is mouthwash.\" --- Karen
> Pendergrass, describing breast cancer signature analysis*

Self-Falsification as a Feature

Any contradiction forces model revision or rejection. If the system
predicts that an intervention should help a condition (because it
reduces a key pathogen), but credible clinical evidence shows the
intervention worsens the condition or consistently fails, this is not
treated as noise. It is treated as evidence that the model is wrong. The
model is scrapped and rebuilt until every relationship is internally
coherent.

> *\"If anything breaks, it\'s wrong. You use clinical data from
> somewhere else to validate the model and if anything breaks, it\'s
> wrong.\"*

The Mindset in Table Form

  -----------------------------------------------------------------------
  **Feature**                    **How It Is Applied**
  ------------------------------ ----------------------------------------
  Systems thinking               Disease is treated as an ecosystem of
                                 microbes, metals, host defenses,
                                 exposures, and metabolites acting
                                 together

  Mechanism over correlation     Differential abundance alone is never
                                 sufficient; the search is for enzymatic
                                 systems, metal cofactors, metabolic
                                 roles, and virulence pathways

  Pattern recognition            Signatures are scanned for functional
                                 clusters and anomalies rather than
                                 isolated taxa

  Constraint targeting           Interventions exploit specific
                                 dependencies: metals, oxygen
                                 requirements, substrate needs,
                                 metabolite gaps

  Ecological repair              Missing functions must be restored while
                                 overrepresented taxa are suppressed;
                                 one-sided approaches fail

  Triangulation                  Evidence must converge from
                                 microbiology, clinical outcomes, and
                                 ecosystem logic independently

  Model falsification            If predictions fail or contradictions
                                 emerge, the model is wrong and must be
                                 revised, not patched
  -----------------------------------------------------------------------

Part 3: Knowledge Primitives

The reasoning system depends on a library of reusable conceptual
building blocks. These are the \"facts about how biological systems
work\" that get applied across conditions. They are not
condition-specific; they are the principles that generate
condition-specific predictions.

Primitive 1: Metals as Selective Pressures

Tissue metal patterns (iron, zinc, nickel, cadmium, lead, and others)
function as upstream drivers that select for organisms with metal
tolerance systems, efflux pumps, toxin-antitoxin stress systems, or
metal-dependent virulence enzymes. A metallomic signature is not merely
descriptive; it is causal. The metals create the environment that
determines which organisms thrive.

**Application rule:** When analyzing a condition, always identify the
metallomic signature first. The metal pattern constrains which taxa can
persist, which virulence factors will be expressed, and which
interventions will work. Metal-level analysis precedes taxon-level
analysis.

Primitive 2: Nutritional Immunity as Interpretive Constraint

Host biomarkers that appear to indicate deficiency (low serum iron, low
zinc) can actually represent active host defense, not nutritional lack.
The system explicitly checks whether elevated calprotectin, lactoferrin,
transferrin, hepcidin, or lipocalin-2 levels indicate that the host is
deliberately restricting pathogen access to metals. If so,
supplementation of those metals is likely counterproductive: it feeds
the pathogen rather than fixing a deficiency.

**Application rule:** Before recommending any metal supplementation,
check the nutritional immunity profile. If sequestration proteins are
elevated, the default recommendation should be to support the host
defense (e.g., lactoferrin for iron sequestration) rather than override
it with supplementation. This is the basis for STOPs.

Primitive 3: Mismetallation and Toxic Metal Entry

Toxic metals such as cadmium and lead can enter cells through calcium
channels, displacing correct cofactors like zinc or iron from enzymes.
This creates oxidative stress, hypoxia, and metabolic dysfunction. When
cadmium and lead are combined, they produce synergistic oxidative
effects. Mismetallation events can reorganize both cellular and
microbial ecosystems by changing which enzymes function and which
organisms gain competitive advantage.

**Application rule:** When a signature shows elevated toxic metals
alongside signs of oxidative stress and hypoxia, consider mismetallation
as an upstream event. This should trigger analysis of glutathione status
(the primary detoxification pathway for cadmium and lead) and assessment
of environmental exposure sources.

Primitive 4: Microbial Metal Dependencies as Achilles\' Heels

Many pathogens depend on specific metals for critical enzymes.
Nickel-dependent enzymes (urease, \[NiFe\]-hydrogenases, glyoxalase) are
particularly important because they enable immune evasion, pH
manipulation, local oxygen depletion, and persistence against
neutrophils. These dependencies create intervention leverage: restrict
the metal and you disable the virulence system.

**Application rule:** For each pathogenic taxon in a signature, identify
its critical metal cofactors and the enzymes that depend on them. Map
these dependencies to determine whether dietary metal restriction,
chelation, or competitive displacement could disable virulence without
requiring direct antimicrobial action.

Primitive 5: Two-Sided Ecological Engineering

Fixing a signature requires both suppression of overrepresented
opportunists and restoration of missing beneficial functions. Killing
pathogens without restoring the SCFA producers, colonocyte support
systems, and metabolite networks that were lost will leave the niche
open for recolonization. Restoration requires attention to site of
fermentation (proximal vs. distal colon), molecular weight of prebiotic
fibers, and the specific metabolites that depleted taxa were providing.

**Application rule:** Every intervention plan must include both sides:
pathogen suppression and beneficial function restoration. Prebiotic
selection should be guided by the location of depleted taxa (distal
colon species need high-molecular-weight fibers like guar gum, PHGG, gum
arabic, psyllium) and the metabolites those taxa produce (butyrate,
propionate, etc.).

Primitive 6: Interkingdom Relationships and Functional Shielding

Persistent infection states are often maintained by cross-kingdom
cooperation, particularly fungal-bacterial biofilms. Candida species can
physically and metabolically shield bacterial pathogens from immune
detection and antimicrobial agents. In these cases, the most effective
intervention may not target the headline bacterium at all, but rather
the shielding partner that enables its persistence.

**Application rule:** When a signature includes both fungal and
bacterial components in the same niche, always analyze the
co-aggregation relationships. If functional shielding is present,
prioritize antifungal or biofilm disruption strategies before or
alongside antibacterial approaches.

Primitive 7: Estrobolome and Hormone Recirculation

Microbial beta-glucuronidase activity can deconjugate estrogens in the
gut, increasing enterohepatic recirculation and systemic estrogen
levels. In estrogen-dependent conditions, beta-glucuronidase-positive
taxa in the signature are not incidental findings; they are mechanistic
contributors to disease progression. The estrobolome connects the
microbiome signature directly to endocrine pathology.

**Application rule:** For any estrogen-sensitive condition, identify
which taxa in the signature express beta-glucuronidase. These taxa move
from \"associated\" to \"mechanistically implicated\" and become
priority targets for intervention.

Primitive 8: Siderophore Competition and Iron Ecology

Pathogens produce siderophores to chelate and acquire iron from the
host, which is essential for their growth and biofilm formation.
Beneficial competitors like E. coli Nissle 1917 can outcompete pathogens
specifically because they have superior iron acquisition systems (more
sensitive siderophore receptors). This makes competitive exclusion a
viable intervention strategy in iron-dominated ecologies.

**Application rule:** When a signature is dominated by
siderophore-producing pathogens, consider probiotics with superior iron
acquisition as a competitive displacement strategy, rather than (or in
addition to) direct antimicrobial approaches.

Primitive 9: Oxygen State as Ecological Determinant

The balance between aerobic and anaerobic conditions in a tissue niche
determines which organisms can persist. Strict anaerobes, facultative
anaerobes switching to fermentative metabolism, and biofilms that create
local hypoxic pockets all contribute to lesion persistence. When a
signature shows heavy anaerobe dominance, oxygenation strategies
(including HBOT) become mechanistically rational interventions.

**Application rule:** Assess the oxygen tolerance profile of each taxon
in the signature. A signature dominated by obligate and facultative
anaerobes with active oxygen-consuming mechanisms (NiFe-hydrogenases,
Candida biofilms) identifies hypoxia as a system-level target.

Part 4: The Reasoning Pipeline

This section formalizes the sequential reasoning process as an
executable pipeline. Each step has defined inputs, operations, and
outputs. An app implementing this pipeline would execute these steps in
order, with the ability to loop back to earlier steps when
contradictions are found.

Pipeline Overview

> *Signature → Mechanism → Vulnerability → Intervention → External
> Validation → Model Revision*

Step 1: Observe and Structure the Signature

**Input:** Raw microbiome data, metallomic data, host biomarkers,
clinical presentation, and environmental/exposure history for a
condition.

**Operation:** Construct a structured signature S = { (feature_i,
direction_i, role_i) }, where each feature can be a taxon shift,
metabolite deficit, metallomic pattern, host nutritional immunity
marker, ecological state (hypoxia, pH shift), or exposure source.

**Output:** A structured, multi-layered signature organized by:
metallomic layer (which metals are elevated/depleted), taxonomic layer
(which taxa are enriched/depleted), functional layer (which enzymes,
virulence factors, and metabolic pathways are represented), host defense
layer (which nutritional immunity factors are active), and ecological
layer (oxygen state, pH, biofilm presence).

Critical principle: The signature is not a list of taxa. It is a causal
ecological network. Every element should connect to other elements
through known biological mechanisms.

Step 2: Identify Functional Patterns

**Input:** The structured signature from Step 1.

**Operation:** For each enriched taxon, map its metal dependencies,
virulence enzymes, metabolic outputs, ecological interactions (biofilm
formation, oxygen consumption, siderophore production), and host immune
interactions. For each depleted taxon, identify what functions are now
missing (SCFA production, colonocyte support, competitive exclusion, pH
regulation).

**Output:** A functional profile for the signature showing: what the
enriched organisms are doing (and what enables them to do it), what the
depleted organisms were doing (and what was lost), which metal cofactors
are load-bearing for the pathogenic ensemble, and which host defense
responses are active or overwhelmed.

Step 3: Reconstruct the Ecosystem Story

**Input:** The functional profile from Step 2.

**Operation:** Construct a plausible narrative of how the current state
emerged. What environmental pressures (metal exposure, dietary patterns,
antibiotic use, hormonal changes) created the initial disturbance? Which
taxa gained advantage first? What cascading effects (hypoxia, pH shift,
biofilm formation, immune suppression) stabilized the dysbiotic state?
Why are the depleted taxa unable to recover?

**Output:** An ecosystem reconstruction that explains the current state
as a stable (self-reinforcing) configuration, with identified feedback
loops and stabilizing mechanisms. This story must be internally
consistent: no element should contradict another.

Step 4: Identify Vulnerabilities (Achilles\' Heels)

**Input:** The ecosystem reconstruction from Step 3.

**Operation:** Scan the model for dependencies that can be exploited:
metal dependencies (nickel for glyoxalase, iron for siderophores),
oxygen sensitivity (obligate anaerobes vulnerable to oxygenation),
biofilm dependencies (fungal shielding that can be disrupted), substrate
requirements (specific nutrients that enable persistence), and
ecological co-dependencies (organism A depends on organism B\'s
metabolic output).

**Output:** A ranked list of intervention leverage points, prioritized
by: how many pathogenic taxa are affected (breadth), how critical the
dependency is for persistence (depth), and whether the dependency can be
targeted without harming beneficial taxa (specificity).

Step 5: Generate Intervention Hypotheses

**Input:** The vulnerability analysis from Step 4.

**Operation:** For each identified vulnerability, propose one or more
interventions. These can include dietary modifications (metal
restriction, prebiotic fibers), supplementation (lactoferrin, NAC,
specific prebiotics), pharmaceutical agents (metronidazole, metformin
for anti-biofilm effects), biophysical interventions (HBOT for
anaerobe-dominated signatures), microbial competition (probiotics with
superior competitive traits), and chelation strategies (DMG for nickel,
iron chelators).

For each proposed intervention, generate two testable predictions: (a)
this intervention should move specific signature features in the
predicted direction (target validation), and (b) this intervention
should improve clinical outcomes in the target condition (clinical
validation).

**Output:** A set of candidate interventions, each with explicit
predicted effects on the signature and predicted clinical outcomes.

Step 6: Triangulate Against External Evidence

**Input:** The intervention hypotheses from Step 5.

**Operation:** For each candidate intervention, search the literature
for independent evidence on three edges of the triangle:

1.  **I → f:** Does this intervention affect the target feature (taxon,
    metabolite, ecological state) in the predicted direction? Evidence
    classes: in vitro, animal model, human mechanistic, human
    intervention.

2.  **I → D:** Does this intervention improve clinical outcomes in the
    target condition? Evidence classes: RCT, quasi-experimental, cohort,
    open-label, case series.

3.  **f → D:** Is the feature causally connected to the condition (not
    just associated)? Evidence: mechanistic studies, Mendelian
    randomization, dose-response data, temporal precedence.

**Output:** An evidence-constraint matrix for each intervention showing
the strength and class of evidence on each triangle edge, identified
gaps, and any contradictions.

Step 7: Validate, Reject, or Flag for Further Investigation

**Input:** The evidence-constraint matrix from Step 6.

**Operation:** Apply the validation criteria (detailed in Part 5).
Classify each intervention as Validated (all three triangle edges
supported, no contradictions, system coherence maintained), Promising
Candidate (two of three edges supported, no contradictions, gaps
identified for further investigation), Validation In Progress
(mechanistic logic is sound, but clinical or target evidence is
incomplete), STOP (evidence shows the intervention is counterproductive
despite conventional wisdom supporting it), or Model Failure
(contradictions found that require revision of the signature, the causal
story, or the intervention hypothesis).

**Output:** A classified intervention list ready for publication (on the
website) or for presentation to a researcher or clinician (in the app).

Step 8: Iterate and Refine

If Step 7 produces Model Failure results, the pipeline loops back to
Step 1 or Step 3. The contradiction is treated as informative data: it
constrains the space of plausible models and forces revision. The
revised model must account for the contradiction while remaining
consistent with all other evidence that previously held.

This loop is what makes the system self-correcting. It is not a one-pass
analysis; it is an iterative convergence process.

Part 5: Validation Logic and Decision Criteria

This section specifies the formal criteria the system uses to classify
interventions. These criteria apply identically whether a human
researcher or an application is executing the pipeline.

The Triangle Test

The primary validation operator constructs and tests triangles of the
form:

> *Intervention (I) → Feature (f) → Condition (D), with independent
> verification of I → D*

An intervention passes the triangle test when: (1) there is credible
evidence I moves at least one load-bearing signature feature in the
predicted direction, (2) there is credible evidence I improves relevant
clinical endpoints in the condition, (3) the intervention\'s effects do
not violate the ecological/physiological model, and (4) the three edges
are directionally consistent.

The Break Condition

If the model predicts \"I should help D because it reduces f,\" but
credible clinical evidence shows I worsens D or fails with a consistent
negative signal, the response is not to discard I alone. It is to treat
the failure as evidence that something in the signature (S) or the
assumed causal link (f → D) is wrong. The model is rebuilt until the
full set of relationships is coherent.

This is the self-falsification mechanism. It prevents the system from
accumulating unfalsifiable \"just-so stories\" and forces genuine model
revision.

Classification Criteria

  ------------------------------------------------------------------------
  **Status**   **Criteria**                    **Action**
  ------------ ------------------------------- ---------------------------
  Validated    All three triangle edges        Publish on condition page
  MBTI         supported by credible evidence. as Validated. Include in
               No contradictions. System       intervention
               coherence maintained. Safety    recommendations.
               reviewed.                       

  Promising    Two of three edges supported.   Publish as Promising
  Candidate    No contradictions found. Clear  Candidate. Flag specific
               gap identified for further      evidence gaps. Monitor for
               investigation.                  new literature.

  Validation   Mechanistic logic is sound      List in pipeline. Specify
  In Progress  within the framework. Clinical  what evidence would
               or target evidence is           validate or falsify.
               incomplete or preliminary.      

  STOP         Evidence shows the intervention Publish as STOP with
               is counterproductive.           mechanistic explanation and
               Typically: conventional         SWAP recommendation.
               practice that feeds pathogens,  
               overrides host defense, or      
               worsens the ecological state.   

  Model        Contradictions found between    Do not publish. Return to
  Failure      predicted and observed effects. pipeline Step 1 or 3. Treat
               Model cannot accommodate the    contradiction as
               evidence without revision.      informative constraint.
  ------------------------------------------------------------------------

Evidence Strength Assessment

Each triangle edge is assessed on evidence class, which determines how
much weight it carries:

  -------------------------------------------------------------------------
  **Evidence Class**   **Description**                      **Weight**
  -------------------- ------------------------------------ ---------------
  Human RCT            Randomized controlled trial in the   Highest
                       target condition with relevant       
                       endpoints                            

  Human                Non-randomized intervention study,   High
  quasi-experimental   well-controlled cohort               

  Human observational  Cohort, case-control, or             Moderate
                       cross-sectional with credible design 

  Human open-label /   Uncontrolled, but with credible      Low-moderate
  case series          endpoints and adequate reporting     

  Animal model         In vivo experiment in a relevant     Moderate (for
                       disease model                        target
                                                            validation)

  In vitro /           Cell culture, biochemical assay, or  Supporting only
  mechanistic          molecular mechanism study            (never
                                                            standalone)
  -------------------------------------------------------------------------

Independence Check

Triangulation only strengthens inference when the combined evidence
streams have different, largely unrelated biases. Each triangle edge
should be labeled with its most likely bias class (confounding,
selection, measurement). If two edges share the same potential
confounder, their convergence is downgraded and the shared bias is
flagged for investigation.

Part 6: Application Architecture

This section provides the functional specification for the \"Karen\'s
Brain\" application. The system should be capable of three primary modes
of operation, each building on the same underlying reasoning engine.

Mode 1: Signature Analysis and Intervention Hypothesis Generation

**Input:** A microbiome signature (taxa with directionality), optionally
enriched with metallomic data, host biomarker data, and clinical
context.

**Process:** Execute pipeline Steps 1 through 5. Structure the
signature, identify functional patterns, reconstruct the ecosystem
story, identify vulnerabilities, and generate intervention hypotheses
with testable predictions.

**Output:** A structured analysis containing: the multi-layered
signature (metallomic, taxonomic, functional, host defense, ecological
layers), the ecosystem reconstruction narrative, ranked vulnerability
list, candidate interventions with predicted effects, and suggested
literature search queries for triangulation.

Mode 2: Intervention Validation Walkthrough

**Input:** A candidate intervention and the condition it targets, along
with any existing evidence the user provides.

**Process:** Execute pipeline Steps 6 and 7. Construct the triangle (I →
f → D), search for evidence on each edge, assess evidence strength and
independence, check for contradictions, and classify.

**Output:** An evidence-constraint matrix showing: evidence for each
triangle edge (with source, class, and strength), identified gaps,
independence assessment, any contradictions with explanations, and a
classification recommendation (Validated, Promising, In Progress, STOP,
or Model Failure).

Mode 3: New Condition Analysis

**Input:** A condition name, along with available microbiome literature,
metallomic data, clinical context, and known interventions.

**Process:** Execute the full pipeline (Steps 1 through 8). Build the
signature from literature. Construct the ecosystem model. Identify
vulnerabilities. Generate and triangulate interventions. Classify
results.

**Output:** A draft condition page structured identically to existing
microbiomemedicine.com condition pages: overview (with causal theory
assessment), metallomic signature, microbiome signature (with per-taxon
metallome and estrobolome panels), validated interventions, promising
candidates, validation-in-progress pipeline, STOPs, and identified
research gaps.

System Architecture Components

Knowledge Base

The application requires a structured knowledge base containing:

-   **Metal-organism dependency database:**

-   Which organisms depend on which metals for which enzymes, and the
    functional consequences of each dependency (immune evasion, pH
    manipulation, oxygen depletion, biofilm formation, etc.).

-   **Nutritional immunity reference:**

-   Host defense proteins (calprotectin, lactoferrin, transferrin,
    hepcidin, lipocalin-2, glutathione), what they sequester, and what
    their elevation or depletion means diagnostically.

-   **Virulence factor catalog:**

-   Enzymes and systems indexed by organism, metal cofactor, and
    functional effect (zinc-dependent metalloproteases,
    NiFe-hydrogenases, beta-glucuronidase, siderophores, glyoxalase,
    urease).

-   **Interkingdom interaction database:**

-   Known co-aggregation relationships, functional shielding pairs,
    mixed biofilm compositions, and their ecological consequences.

-   **Completed condition models:**

-   Existing signature analyses (endometriosis, breast cancer, BV, IBS,
    PCOS, etc.) as reference cases and training examples.

-   **Intervention evidence library:**

-   For each known intervention, the evidence on each triangle edge,
    indexed by condition, evidence class, and outcome direction.

Reasoning Engine

The reasoning engine implements the eight-step pipeline with the
following capabilities:

-   Pattern matching against the knowledge base to identify functional
    clusters in new signatures.

-   Anomaly detection to flag taxa or features that are unexpected given
    the metallomic context.

-   Ecosystem narrative generation that constructs plausible causal
    stories consistent with all signature elements.

-   Vulnerability ranking using breadth (how many taxa affected), depth
    (criticality of the dependency), and specificity (whether
    intervention harms beneficial taxa).

-   Triangle construction and evidence assessment for each candidate
    intervention.

-   Contradiction detection that flags when predicted and observed
    effects diverge.

-   Classification logic that applies the criteria from Part 5.

Output Formatter

The output formatter produces results in two formats:

**Website format:** Structured content matching the
microbiomemedicine.com page template, including interactive microbiome
signature visualization data, metallomic signature tables, intervention
tables with classification status, STOP recommendations with SWAP
suggestions, research feed entries, and FAQ generation.

**Clinical/research format:** Evidence-constraint matrices, prioritized
intervention lists, specific literature gaps, and suggested study
designs that would resolve open questions.

Data Flow Diagram

The following describes the data flow through the system:

> *User Input (signature data, condition, or intervention query) →
> Knowledge Base Lookup → Pipeline Execution (Steps 1-8) → Validation
> Logic → Classification → Output Formatting → Structured Result
> (website page or research report)*

At each pipeline step, the system draws on the knowledge base for
primitives, checks against completed condition models for analogies, and
applies the validation criteria from Part 5. The loop-back mechanism
(Step 8) feeds contradictions back into earlier steps for model
revision.

Interaction Model

The application should support both autonomous analysis (full pipeline
execution on a new input) and guided analysis (step-by-step walkthrough
where a researcher can inspect, challenge, and modify the system\'s
reasoning at each step). The guided mode is particularly important for
teaching the framework to new researchers and for quality-checking the
system\'s outputs.

Part 7: Website Mapping and Development Priorities

This section maps the specification above to the existing
microbiomemedicine.com platform and identifies priorities for
development.

Current Website Structure Mapped to This Specification

  --------------------------------------------------------------------------
  **Website Element**      **Specification Component**    **Status**
  ------------------------ ------------------------------ ------------------
  Condition pages          Pipeline Steps 1-3: Signature  Implemented for
  (Overview, Causes,       structuring and ecosystem      endometriosis, in
  Diagnosis, Primer)       reconstruction                 progress for other
                                                          conditions

  Microbiome Signature     Pipeline Step 2: Functional    Implemented. Not
  database (interactive    profiling. Each panel covers   visible to
  radial chart with        metallome, estrobolome, and    crawlers/AI tools
  per-taxon panels)        overview                       (JS-rendered)

  Metallomic Signature     Primitive 1 (Metals as         Implemented for
  tables                   Selective Pressures) and Part  endometriosis
                           4 Step 1 metallomic layer      

  Nutritional Immunity     Primitive 2 (Nutritional       Implemented for
  section                  Immunity as Interpretive       endometriosis
                           Constraint)                    

  Intervention tables      Pipeline Steps 5-7: Hypothesis Implemented. Some
  (Validated, Promising,   generation through             entries have
  In Progress)             classification                 placeholder
                                                          references

  STOP recommendations     Part 5 STOP classification +   Implemented for
  with SWAPs               Primitive 2                    iron and zinc
                                                          supplementation

  Our Validation Method    Part 5: Validation Logic       Exists but body
  page                     (entire section)               content is gated

  Concepts and Definitions Part 3: Knowledge Primitives   Partially
  pages                                                   implemented across
                                                          many pages

  Research Feed            Part 4 Step 6: Literature for  Implemented with
                           triangulation                  membership-gated
                                                          summaries
  --------------------------------------------------------------------------

Identified Development Priorities

Priority 1: Static/Structured Data Fallback for Microbiome Signature

The interactive radial chart with per-taxon panels (metallome,
estrobolome, overview) is the crown jewel of the condition pages.
However, it renders entirely in JavaScript, making it invisible to
search engines, AI tools, and any non-browser access. A static HTML
fallback, structured data markup (Schema.org MedicalCondition or
Dataset), or a noscript summary table should be added so the signature
content is indexable and discoverable.

Priority 2: Expose Validation Method Logic Publicly

The \"Our Validation Method\" page is the epistemological anchor of the
entire platform. Currently its body content appears gated. At minimum, a
summary of the triangle test, the break condition, and the
classification criteria should be publicly visible. This is the primary
differentiator: any visitor should be able to understand how the system
decides something is Validated vs. Promising vs. STOP without creating
an account.

Priority 3: Fill Reference Gaps in Intervention Pipeline

Several supplement entries in the Validation In Progress table have
placeholder \[x\] citations (catechins, curcumin, Uncaria tomentosa,
Calligonum comosum, Ceylon cinnamon, cotton undergarments). For a
platform positioning itself as evidence-based, incomplete citations
undermine trust. These should be completed or the entries should be
flagged as \"reference pending.\"

Priority 4: Add Internal Hierarchy to Validation Pipeline

The Validation In Progress table contains over 30 entries spanning drug
repurposing, supplements, behavioral interventions, microbiome
restoration, and chelation strategies. Sorting by evidence strength or
grouping by mechanism would help clinicians identify where to start.
Even adding a \"mechanistic confidence\" column (high/medium/low based
on how many pipeline steps have been completed) would sharpen utility.

Priority 5: Case Walkthrough Format

The anomaly-driven reasoning process (the \"why would this one taxon be
decreased\" logic that led to the breast cancer/mouthwash insight) is
the most powerful and least documented aspect of the framework. A case
walkthrough section on the site, showing the reasoning in action on a
real example from initial observation through model construction through
intervention prediction, would both teach the framework and demonstrate
its predictive power in a way that static tables cannot.

Priority 6: Causal Chain Visualization in Primer Section

The Primer section presents nutritional immunity, metallomic signature,
and estrogen metabolism as parallel subsections. In reality, they form a
causal chain: metals drive microbial selection, selected microbes
express beta-glucuronidase and siderophores, estrogen recirculation and
iron piracy follow, lesion persistence results. A flow diagram or
numbered sequence making this chain visible would help readers see how
the pieces lock together.

Alignment Between Website and App

The website and app are not separate products. They are two interfaces
to the same underlying knowledge system. Every condition page on the
website is a completed analysis that the app should be able to
reproduce. Every app output for a new condition should be publishable as
a new condition page. The knowledge base is shared. The reasoning
pipeline is identical. The validation criteria are the same. The only
difference is that the website presents finished work, while the app
executes the work in real time.

This means that building the app also improves the website: every new
condition analyzed by the app produces content for the site. And every
editorial decision made on the website refines the rules the app
follows. They are a single system with two access points.

Appendix: Quick Reference Card

This page summarizes the entire system on a single reference sheet for
working use.

The Pipeline in One Line

> *Signature → Functional Patterns → Ecosystem Story → Vulnerabilities →
> Interventions → Triangulation → Validate or Reject → Iterate*

The Nine Knowledge Primitives

1.  Metals as selective pressures (metallomic signatures drive microbial
    community structure)

2.  Nutritional immunity as interpretive constraint (deficiency markers
    may be host defense)

3.  Mismetallation and toxic metal entry (cadmium/lead through calcium
    channels)

4.  Microbial metal dependencies as Achilles\' heels (restrict the
    metal, disable the virulence)

5.  Two-sided ecological engineering (suppress pathogens AND restore
    missing functions)

6.  Interkingdom relationships and functional shielding (target the
    shield, not just the pathogen)

7.  Estrobolome and hormone recirculation (beta-glucuronidase taxa drive
    estrogen-dependent disease)

8.  Siderophore competition and iron ecology (competitive exclusion via
    superior iron acquisition)

9.  Oxygen state as ecological determinant (anaerobe dominance signals
    oxygenation as intervention)

The Triangle Test

For every candidate intervention I targeting condition D through feature
f:

-   Edge 1: Does I move f in the predicted direction? (target
    validation)

-   Edge 2: Does I improve D clinically? (clinical validation)

-   Edge 3: Is f causally connected to D? (mechanism validation)

-   All three edges must be directionally consistent with no
    contradictions.

The Break Condition

> *If prediction fails → the model is wrong, not just the intervention.
> Scrap and rebuild until coherent.*

Five Classification Outcomes

-   Validated: all edges supported, no contradictions, coherent, safe

-   Promising Candidate: two of three edges, no contradictions, gaps
    flagged

-   Validation In Progress: logic sound, evidence incomplete

-   STOP: intervention is counterproductive (feeds pathogen, overrides
    host defense)

-   Model Failure: contradictions found, model needs revision
