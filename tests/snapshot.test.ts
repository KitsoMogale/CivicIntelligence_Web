import { test } from "node:test";
import assert from "node:assert/strict";
import { knowledgeSnapshot } from "../lib/snapshot";
import { countries } from "../lib/knowledge";
test("country exports never include another country's knowledge", () => {
  const snapshot = knowledgeSnapshot({
    country: countries.find((c) => c.code === "BW")!,
    domain: "government",
    mode: "geographic",
    selectedEntity: null,
  });
  assert.deepEqual(snapshot.entities, []);
  assert.deepEqual(snapshot.relationships, []);
  assert.deepEqual(snapshot.datasets, []);
  assert.deepEqual(snapshot.sources, []);
});
test("exports include every referenced entity and the historical chart data", () => {
  const snapshot = knowledgeSnapshot({
    country: countries[0],
    domain: "government",
    mode: "hierarchy",
    selectedEntity: "za-parliament",
  });
  const ids = new Set(snapshot.entities.map((e) => e.id));
  snapshot.relationships.forEach((r) => {
    assert.ok(ids.has(r.source));
    assert.ok(ids.has(r.target));
  });
  const chart = knowledgeSnapshot({
    country: countries[0],
    domain: "society",
    mode: "data",
    selectedEntity: null,
  });
  assert.equal(chart.datasets[0].points.length, 9);
  assert.ok(chart.sources.some((s) => s.id === "census"));
});
