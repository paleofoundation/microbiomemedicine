import assert from "node:assert/strict";
import { test } from "node:test";
import { autoConnections, resolveConnections } from "./connections.ts";

test("autoConnections emit no trailing slash", () => {
  const html = `<p>See <a href="/conditions/endometriosis/">endometriosis</a> and <a href="/metals/zinc">zinc</a>.</p>`;
  const cons = autoConnections(html);
  assert.deepEqual(
    cons.map((c) => c.href).sort(),
    ["/conditions/endometriosis", "/metals/zinc"]
  );
});

test("resolveConnections strips override trailing slashes", () => {
  const cons = resolveConnections(
    [{ label: "Endometriosis", href: "/conditions/endometriosis/" }],
    ""
  );
  assert.equal(cons[0]?.href, "/conditions/endometriosis");
});
