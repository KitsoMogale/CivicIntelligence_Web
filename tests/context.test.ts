import { test } from "node:test";
import assert from "node:assert/strict";
import { visibleEntityIds } from "../lib/visibility";
test("AI context excludes collapsed nodes and includes newly expanded descendants", () => {
  const base = {
    countryCode: "ZA",
    domain: "government" as const,
    mode: "hierarchy" as const,
    expanded: ["za-government"],
  };
  assert.ok(!visibleEntityIds(base).includes("za-parliament"));
  assert.ok(
    visibleEntityIds({
      ...base,
      expanded: [...base.expanded, "za-national"],
    }).includes("za-parliament"),
  );
  assert.ok(
    !visibleEntityIds({
      ...base,
      expanded: [...base.expanded, "za-national"],
    }).includes("za-assembly"),
  );
});
test("visibility follows the active renderer and country coverage", () => {
  assert.deepEqual(
    visibleEntityIds({
      countryCode: "BW",
      domain: "government",
      mode: "geographic",
      expanded: [],
    }),
    [],
  );
  assert.deepEqual(
    visibleEntityIds({
      countryCode: "ZA",
      domain: "society",
      mode: "data",
      expanded: [],
    }),
    [],
  );
  const flow = visibleEntityIds({
    countryCode: "ZA",
    domain: "infrastructure",
    mode: "flow",
    expanded: [],
  });
  assert.equal(flow.length, 4);
  assert.ok(!flow.includes("za-electricity"));
});
