import { test } from "node:test";
import assert from "node:assert/strict";
import { formatSignatureReferences } from "./signatureReferences.ts";

const wrap = (refs: string) => `<details open><summary>References</summary><ol class="rgbc-references">${refs}</ol></details>`;

test("each inline number links to its own scoped bibliography entry", () => {
  const html = '<p>First<sup>[2]</sup> then repeated<sup>[1]</sup><sup>[2]</sup>.</p>' + wrap('<li>First paper</li><li>Second paper</li>');
  const result = formatSignatureReferences(html, "ms-Dialister");
  assert.equal((result.match(/href="#signature-ms-Dialister-ref-2"/g) || []).length, 2);
  assert.match(result, /<li id="signature-ms-Dialister-ref-2" value="2" tabindex="-1">Second paper<\/li>/);
  assert.match(result, /<section class="signature-references"/);
});

test("verified metadata completes formerly blank references and links the DOI itself", () => {
  const result = formatSignatureReferences(wrap('<li><a href="https://pubmed.ncbi.nlm.nih.gov/28696139/">link</a></li>'), "ms");
  assert.match(result, /Shahi SK, Freedman SN, Mangalam AK/);
  assert.match(result, /Gut Microbes\. 2017;8\(6\):607-615/);
  assert.match(result, /href="https:\/\/doi.org\/10.1080\/19490976.2017.1349041"[^>]*>10.1080\/19490976.2017.1349041<\/a>/);
});

test("a paper without a verified DOI retains its PubMed identifier", () => {
  const result = formatSignatureReferences(wrap('<li><a href="https://pubmed.ncbi.nlm.nih.gov/28243279/">link</a></li>'), "ms");
  assert.match(result, />PMID: 28243279<\/a>/);
  assert.doesNotMatch(result, /doi.org/);
});

test("long migrated references and authored prose are never cut off", () => {
  const long = 'Complete scientific context. '.repeat(70);
  const result = formatSignatureReferences(`<details><summary>Overview</summary>${long}<sup>[1]</sup></details>` + wrap(`<li>${long}END</li>`), "legacy");
  assert.ok(result.includes(long));
  assert.match(result, /END<\/li>/);
  assert.match(result, /href="#signature-legacy-ref-1"/);
});

test("legacy DOI and PMC sources get descriptive labels; unresolved citations stay unresolved", () => {
  const result = formatSignatureReferences('<sup>[ref]</sup><sup>[9]</sup>' + wrap('<li>Paper <a href="https://doi.org/10.1000/example">link</a></li><li>Paper <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC123456/">link</a></li>'), "legacy");
  assert.match(result, />10.1000\/example<\/a>/);
  assert.match(result, />PMC123456<\/a>/);
  assert.match(result, /<sup>\[ref\]<\/sup><sup class="inline-citation">\[9\]<\/sup>/);
});

test("explicit bibliography numbering and linked superscripts are preserved", () => {
  const result = formatSignatureReferences('<sup><a href="#old">[7]</a></sup><ol class="rgbc-references" start="7"><li>Paper seven</li></ol>', "condition");
  assert.match(result, /href="#signature-condition-ref-7"/);
  assert.match(result, /value="7"/);
});

test("DOI-linked titles remain in the bibliography when the DOI becomes its own link", () => {
  const result = formatSignatureReferences(wrap('<li><a href="https://doi.org/10.1000/example">Full study title</a>. Authors. Journal. 2020.</li>'), "legacy");
  assert.match(result, /Full study title\. Authors\. Journal\. 2020\./);
  assert.match(result, />10.1000\/example<\/a>/);
});

test("signature citations follow sentence periods and still resolve to scoped references", () => {
  const result = formatSignatureReferences('Finding <a href="#old"><sup>[3]</sup></a>.' + wrap('<li>One.</li><li>Two.</li><li>Three.</li>'), "ms-Akkermansia");
  assert.match(result, /Finding\.<sup class="inline-citation"><a data-signature-reference href="#signature-ms-Akkermansia-ref-3" aria-label="Reference 3">\[3\]<\/a><\/sup>/);
  assert.match(result, /value="3" tabindex="-1">Three\.<\/li>/);
});

test("signature reference linking does not reinterpret scientific exponents as citations", () => {
  const result = formatSignatureReferences('10<sup>2</sup> cells.<sup>[1]</sup>' + wrap('<li>One.</li><li>Two.</li>'), "science");
  assert.match(result, /10<sup>2<\/sup> cells\./);
  assert.doesNotMatch(result, /href="#signature-science-ref-2"/);
});
