import assert from "node:assert/strict";
import { test } from "node:test";
import { asciiSlug, decodeSlug, slugsEquivalent, slugLookupVariants } from "./slugs.ts";

test("unicode minus and hyphen variants become ASCII hyphens", () => {
  assert.equal(
    asciiSlug("ginger-essential-oil-and-citral-ameliorates-atherosclerosis-in-apoe−-−-mice-by-modulating-trimethylamine-n-oxide-and-gut-microbiota"),
    "ginger-essential-oil-and-citral-ameliorates-atherosclerosis-in-apoe-mice-by-modulating-trimethylamine-n-oxide-and-gut-microbiota"
  );
  assert.equal(
    asciiSlug("metal‐regulated-antibiotic-resistance-and-its-implications-for-antibiotic-therapy"),
    "metal-regulated-antibiotic-resistance-and-its-implications-for-antibiotic-therapy"
  );
  assert.equal(
    asciiSlug("gut-microbiota-in-early-pediatric-multiple-sclerosis-a-case−control-study"),
    "gut-microbiota-in-early-pediatric-multiple-sclerosis-a-case-control-study"
  );
});

test("percent-encoded slugs decode then ASCII-normalize", () => {
  const encoded =
    "ginger-essential-oil-and-citral-ameliorates-atherosclerosis-in-apoe%e2%88%92-%e2%88%92-mice-by-modulating-trimethylamine-n-oxide-and-gut-microbiota";
  assert.equal(
    asciiSlug(encoded),
    "ginger-essential-oil-and-citral-ameliorates-atherosclerosis-in-apoe-mice-by-modulating-trimethylamine-n-oxide-and-gut-microbiota"
  );
  assert.ok(slugLookupVariants(encoded).includes(decodeSlug(encoded)));
});

test("Greek letters become ASCII names", () => {
  assert.equal(asciiSlug("β-glucuronidase"), "beta-glucuronidase");
  assert.equal(asciiSlug("%ce%b2-glucuronidase"), "beta-glucuronidase");
  assert.equal(asciiSlug("tnf-α"), "tnf-alpha");
  assert.equal(asciiSlug("nf-κb"), "nf-kappab");
  assert.equal(asciiSlug("apoe-ε4-carrier-status"), "apoe-epsilon4-carrier-status");
  assert.ok(slugsEquivalent("β-glucuronidase", "beta-glucuronidase"));
});

test("daggers and other symbols are stripped", () => {
  assert.equal(
    asciiSlug("urine-metallomics-signature-as-an-indicator-of-pancreatic-cancer†"),
    "urine-metallomics-signature-as-an-indicator-of-pancreatic-cancer"
  );
});
