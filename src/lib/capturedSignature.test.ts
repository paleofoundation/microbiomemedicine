import { test } from "node:test";
import assert from "node:assert/strict";
import { extractCapturedSignature, removeCapturedSignatureModal } from "./capturedSignature.ts";

const captured = '<button data-modal-id="research-diagram-modal">Open map</button><div id="research-diagram-modal" class="modal"><div data-slide-name="Species"><svg class="info-icon"><path /></svg><div><svg data-items="[{&quot;name&quot;:&quot;A &#946;&quot;,&quot;value&quot;:-4,&quot;has_info&quot;:true}]"></svg></div></div><div data-slide-name="Genus"><svg data-items=\'[{"name":"B","value":3}]\'></svg></div></div><footer>Keep me</footer>';

test("captured levels use their actual names and preserve values without inventing commentary", () => {
  assert.deepEqual(extractCapturedSignature(captured), {
    Species: [{ name: "A β", value: -4, has_info: false }],
    Genus: [{ name: "B", value: 3, has_info: false }],
  });
});

test("remove only the balanced legacy modal, preserving trigger and following content", () => {
  assert.equal(removeCapturedSignatureModal(captured), '<button data-modal-id="research-diagram-modal">Open map</button><footer>Keep me</footer>');
});

test("generic triggers and malformed captures never manufacture signatures or consume content", () => {
  const html = '<div data-modal-id="research-diagram-modal">No chart</div>';
  assert.equal(extractCapturedSignature(html), null);
  assert.equal(removeCapturedSignatureModal(html), html);
  const malformed = '<div id="research-diagram-modal"><div>Unclosed';
  assert.equal(removeCapturedSignatureModal(malformed), malformed);
});

test("invalid levels are ignored without dropping valid levels", () => {
  const html = captured.replace('data-slide-name="Species"', 'data-slide-name="Not a level"');
  assert.deepEqual(Object.keys(extractCapturedSignature(html)!), ["Genus"]);
});
