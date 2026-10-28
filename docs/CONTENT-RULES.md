# Content authoring rules — microbiomemedicine

Rules every content page (conditions, microbes/taxa, interventions, definitions, STOPs)
must follow. They optimize for LLM/AI answer extraction (LLMO / GEO) and human
scannability, within the site's fixed design. See also `DESIGN.md` and the memories
referenced at the bottom.

## 1. Internal linking — the highlighted-word rule

- A **highlighted (blue inline-linked) word links ONLY to an internal microbiomemedicine
  page** that covers that concept or entity. The blue in-content link style is reserved for
  internal entity pages.
- **Never** use the blue inline-link style to point at an external source. External sources
  are cited with a superscript `[n]` citation (the `rgbc-reference` style), never as an
  inline blue link.
- First mention of any entity on a page links to its page. If a concept deserves
  highlighting but has **no page yet, create the page** (`/definition/…`, `/metals/…`,
  `/interventions/…`, `/microbes/…`, etc.). Authoring the missing entity page is part of the
  skill — do not substitute an external link.
- Prefer letting `autolinkEntities` link the first mention automatically; only hard-code an
  internal link when you are authoring the canonical first mention.
- Example violation (fixed on the A. baumannii page): "ESKAPE" and "nutritional immunity"
  were blue-linked to DOIs. Correct handling: link "nutritional immunity" to
  `/definition/nutritional-immunity/`; keep "ESKAPE" as plain text plus a `[n]` citation
  until `/definition/eskape/` is created.

## 2. No em dashes

- Do not use em dashes (—) in copy unless highly warranted. Use periods, commas, colons, or
  parentheses. Splitting an em-dash clause into two sentences also satisfies Rule 3. En
  dashes in numeric ranges (50–100) are fine; middle dots (·) and `w = A·D·S·C·R` notation
  are fine.

## 3. LLMO content structure (AI answer extraction)

**Front-load the answer.** The first sentence under any heading is a direct, unambiguous
answer to it. Keep that opening answer to **~50–60 words (300–400 characters)**, jargon-light,
so a retrieval chunk captures the whole answer together with the heading.

**Section + paragraph limits.**
- Keep total text under any single heading under ~1,500 characters (~200–300 words); if
  longer, break it with an H3/H4.
- **One idea per paragraph**, 1–3 sentences. Do not pack a whole topic into one dense block.
- **Sentences under ~20 words (~120 characters).** Long multi-clause sentences cause LLM
  parsing / vector-mapping failures and dilute a passage's saliency.

**Headings.**
- Keep headings under ~10 words.
- Use question-based headings where you want to capture conversational queries (every FAQ
  entry is a question).

**Semantic anchors (adapted to this site).**
- The site has a NO-BOLD rule, so never bold entities. Signal importance with the internal
  entity links (Rule 1), `<em>`, serif headings, and canonical tables instead.
- Hard data over fluff: lead with verifiable numbers, names, and mechanisms. Avoid filler
  ("As we all know…", "In today's landscape…").
- Put each citation `[n]` directly in the text block that makes the claim.
- **Inline citation format (user requirement, 2026-10-02):** always use bracketed,
  superscripted numbers. If the sentence has a period, put it before the entire citation
  cluster with no intervening space: `Sentence.<sup>[1]</sup><sup>[2]</sup>`, never
  `Sentence<sup>[1]</sup><sup>[2]</sup>.`. Apply this to all page content, FAQs, excerpts,
  study summaries, and signature panels. Keep existing source numbers, citation order,
  and link destinations intact; do not renumber or invent missing links. Scientific
  exponents and ionic charges are not citation markers.

## 4. Prose + tables only; no lists; no bold

- Body content is prose and canonical tables only — never bulleted or numbered lists (the
  only allowed list is the `rgbc-references` bibliography; native FAQ `<details>` are fine).
- No bold anywhere (the theme forces normal weight); use color, serif, and links for emphasis.

---

Related memories: `internal-linking-rule`, `no-em-dashes`, `content-formatting-no-lists`,
`author-display-rule`, `taxon-page-pattern`.
