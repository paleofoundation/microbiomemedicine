import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CANONICAL_HOST,
  SITE_ORIGIN,
  canonicalPath,
  canonicalUrl,
  decideCanonical,
  isNoindexPath,
  isPreviewHost,
  shouldForceApex,
} from "./seoIndexing.ts";

test("canonicalPath strips trailing slashes except root", () => {
  assert.equal(canonicalPath("/"), "/");
  assert.equal(canonicalPath("/conditions/endometriosis/"), "/conditions/endometriosis");
  assert.equal(canonicalPath("conditions/endometriosis/"), "/conditions/endometriosis");
});

test("canonicalUrl is apex https with no extra slash", () => {
  assert.equal(canonicalUrl("/"), SITE_ORIGIN);
  assert.equal(canonicalUrl("/conditions/endometriosis/"), `${SITE_ORIGIN}/conditions/endometriosis`);
});

test("www and production aliases force apex; preview and localhost do not", () => {
  assert.equal(shouldForceApex("www.microbiomemedicine.com"), true);
  assert.equal(shouldForceApex("microbiomemedicine.vercel.app"), true);
  assert.equal(shouldForceApex(CANONICAL_HOST), false);
  assert.equal(shouldForceApex("localhost"), false);
  assert.equal(shouldForceApex("127.0.0.1:3000"), false);
  assert.equal(isPreviewHost("microbiomemedicine-git-seo-karen-pendergrass-projects.vercel.app"), true);
  assert.equal(isPreviewHost("microbiomemedicine.vercel.app"), false);
});

test("www + trailing slash is one hop to apex no-slash", () => {
  const d = decideCanonical(
    "www.microbiomemedicine.com",
    "/conditions/endometriosis/",
    "",
    "https://www.microbiomemedicine.com"
  );
  assert.equal(d.redirect, `${SITE_ORIGIN}/conditions/endometriosis`);
  assert.equal(d.status, 308);
});

test("apex without slash does not redirect", () => {
  const d = decideCanonical(CANONICAL_HOST, "/conditions/endometriosis", "", SITE_ORIGIN);
  assert.equal(d.redirect, null);
});

test("WordPress /?s= becomes /search?q=", () => {
  const d = decideCanonical(CANONICAL_HOST, "/", "?s=endometriosis", SITE_ORIGIN);
  assert.equal(d.redirect, `${SITE_ORIGIN}/search?q=endometriosis`);
  assert.equal(d.status, 301);
});

test("www /?s= is one hop to apex /search?q=", () => {
  const d = decideCanonical("www.microbiomemedicine.com", "/", "?s=zinc", "https://www.microbiomemedicine.com");
  assert.equal(d.redirect, `${SITE_ORIGIN}/search?q=zinc`);
  assert.equal(d.status, 301);
});

test("bare DOI paths redirect to search", () => {
  const d = decideCanonical(CANONICAL_HOST, "/10.1177/2042018810367984", "", SITE_ORIGIN);
  assert.equal(d.redirect, `${SITE_ORIGIN}/search?q=10.1177%2F2042018810367984`);
  assert.equal(d.status, 301);
});

test("noindex paths cover private, search, demo, and leftover WP slugs", () => {
  assert.equal(isNoindexPath("/search"), true);
  assert.equal(isNoindexPath("/search/"), true);
  assert.equal(isNoindexPath("/dashboard/subscription"), true);
  assert.equal(isNoindexPath("/research-feed-demo"), true);
  assert.equal(isNoindexPath("/taxa/acinetobacter"), true);
  assert.equal(isNoindexPath("/checkout"), true);
  assert.equal(isNoindexPath("/conditions/endometriosis"), false);
  assert.equal(isNoindexPath("/"), false);
});
