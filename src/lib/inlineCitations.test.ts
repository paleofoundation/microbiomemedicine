import { test } from "node:test";
import assert from "node:assert/strict";
import { formatInlineCitations, formatCitationText } from "./inlineCitations.ts";

const sup = (body: string) => `<sup class="inline-citation">${body}</sup>`;

test("period precedes a linked superscript while destination and attributes are preserved", () => {
  const anchor = '<a href="#signature-ms-Akkermansia-ref-3" aria-label="Reference 3">[3]</a>';
  assert.equal(formatInlineCitations(`Finding<sup>${anchor}</sup>.`), `Finding.${sup(anchor)}`);
});

test("the entire citation cluster follows the period in its original order", () => {
  assert.equal(formatInlineCitations('Finding <sup>[3]</sup> <sup>[1]</sup> &nbsp;.'), `Finding.${sup('[3]')}${sup('[1]')}`);
  assert.equal(formatInlineCitations('Finding<sup>[3], [1]</sup>.'), `Finding.${sup('[3]')},${sup('[1]')}`);
});

test("bare bracketed markers, ranges and lists receive superscripts", () => {
  assert.equal(formatInlineCitations('<p>Finding [3]. Another [1, 4–6].</p>'), `<p>Finding.${sup('[3]')} Another.${sup('[1, 4–6]')}</p>`);
});

test("reversed nesting and duplicated brackets are repaired without nested anchors or superscripts", () => {
  const input = 'Finding[<a id="ref-3-back" class="rgbc-reference" href="#ref-3"><sup>[[3]]</sup></a>].';
  assert.equal(formatInlineCitations(input), `Finding.${sup('<a id="ref-3-back" class="rgbc-reference" href="#ref-3">[3]</a>')}`);
});

test("multiple links in one superscript keep distinct numbers and destinations", () => {
  const a = '<a href="#one">[1]</a>', b = '<a href="#two">[2]</a>';
  assert.equal(formatInlineCitations(`Finding<sup>${a}${b}</sup>.`), `Finding.${sup(a)}${sup(b)}`);
});

test("nested legacy superscripts and citation formatting flatten once and stay stable", () => {
  for (const input of [
    'Finding<sup><sup><a href="#ref-1">[1]</a></sup></sup>.',
    'Finding<sup><sub><sup><a href="#ref-1">[1]</a></sup></sub></sup>.',
    'Finding<sup><strong><a href="#ref-1">[1]</a></strong></sup>.',
  ]) {
    const result = `Finding.${sup('<a href="#ref-1">[1]</a>')}`;
    assert.equal(formatInlineCitations(input), result);
    assert.equal(formatInlineCitations(result), result);
  }
});

test("unclosed legacy superscripts stop at their table cell or paragraph boundary", () => {
  const input = '<td>Partners.<sup><a href="#ref-7">[7]</a><sup><a href="#ref-9">[9]</a></sup></td><td>Other text.</td>';
  const result = `<td>Partners.${sup('<a href="#ref-7">[7]</a>')}${sup('<a href="#ref-9">[9]</a>')}</td><td>Other text.</td>`;
  assert.equal(formatInlineCitations(input), result);
  assert.equal(formatInlineCitations(result), result);
});

test("malformed citation wrappers never superscript the following prose or grow on rerender", () => {
  const input = '<p>Finding.<sup><a href="#empty"></a><sup><a href="#a">[5]</a></sup> Lead compounds. 10<sup>8</sup> units.<sup><a href="#b">[9]</a></sup> More prose.</p>';
  const result = `<p>Finding.<a href="#empty"></a>${sup('<a href="#a">[5]</a>')} Lead compounds. 10<sup>8</sup> units.${sup('<a href="#b">[9]</a>')} More prose.</p>`;
  assert.equal(formatInlineCitations(input), result);
  assert.equal(formatInlineCitations(result), result);
});

test("empty legacy anchors preserve their attributes without blocking period placement", () => {
  const input = 'Finding<sup><a href="#ref">[2]</a><a id="empty"></a></sup>.';
  const result = `Finding.${sup('<a href="#ref">[2]</a>')}<a id="empty"></a>`;
  assert.equal(formatInlineCitations(input), result);
  assert.equal(formatInlineCitations(result), result);
});

test("explicit legacy numeric-citation mode handles groups while preserving paragraph bibliographies", () => {
  const refs = '<p><strong>References</strong></p><p>[1] Author. Paper.</p><p>[2] Another paper.</p>';
  const input = `Finding.<sup>1</sup> More<sup>4 5</sup>. Another.<sup>,32 </sup>${refs}`;
  const result = `Finding.${sup('[1]')} More.${sup('[4, 5]')} Another.${sup('[32]')}${refs}`;
  assert.equal(formatInlineCitations(input, { numericSuperscripts: true }), result);
  assert.equal(formatInlineCitations(result, { numericSuperscripts: true }), result);
});

test("legacy reference paragraphs separated by annotations keep their baseline numbering", () => {
  const refs = '<p><br><strong>References</strong></p><p>[1] Author. Paper.</p><p>Annotation.</p><p> [2] Another paper.</p>';
  const input = `Finding [1].${refs}<h2>Next section</h2><p>[2] explains this.</p>`;
  assert.equal(formatInlineCitations(input), `Finding.${sup('[1]')}${refs}<h2>Next section</h2><p>${sup('[2]')} explains this.</p>`);
});

test("periods after closing inline formatting tags move before the citation", () => {
  assert.equal(formatInlineCitations('<em>Finding<sup>[2]</sup></em>.'), `<em>Finding.${sup('[2]')}</em>`);
});

test("already-correct punctuation is stable and duplicated terminal periods collapse", () => {
  const correct = `Finding.${sup('[3]')} Next sentence.`;
  assert.equal(formatInlineCitations(correct), correct);
  assert.equal(formatInlineCitations('Finding. <sup>[3]</sup>.'), `Finding.${sup('[3]')}`);
  assert.equal(formatInlineCitations(formatInlineCitations('Finding<sup>[3]</sup>.')), `Finding.${sup('[3]')}`);
});

test("periods do not get invented or move across a paragraph boundary", () => {
  assert.equal(formatInlineCitations('<p>Finding [3]</p><p>. Note</p>'), `<p>Finding${sup('[3]')}</p><p>. Note</p>`);
});

test("scientific superscripts, ordinary numeric links and DOI text stay unchanged", () => {
  const input = 'Hg<sup>0</sup>, 10<sup>8</sup>, Cd<sup>2+</sup>. <a href="/page/2">2</a>. 10.1000/example.';
  assert.equal(formatInlineCitations(input), input);
});

test("bibliographies, code, diagrams, comments and attributes are untouched", () => {
  const input = '<ol class="rgbc-references"><li>[1] Paper. <a href="https://doi.org/10.1000/ex">DOI</a>.</li></ol><code>a[3].</code><pre>[3].</pre><svg><text>[3]</text></svg><script>const a="[3].";</script><!-- [3]. --><p data-value="[3].">Text</p>';
  assert.equal(formatInlineCitations(input), input);
});

test("unresolved placeholders retain their authored identity", () => {
  assert.equal(formatInlineCitations('Text<sup>[ref]</sup>. Other<sup>[x]</sup>.'), 'Text<sup>[ref]</sup>. Other<sup>[x]</sup>.');
});

test("plain-text snippet rendering escapes markup before adding citation markup", () => {
  assert.equal(formatCitationText('<img src=x onerror=alert(1)> & finding [3].'), `&lt;img src=x onerror=alert(1)&gt; &amp; finding.${sup('[3]')}`);
});
