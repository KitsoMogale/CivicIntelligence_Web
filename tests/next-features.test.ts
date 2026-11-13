import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { initialExploration, normalizeExploration } from "../lib/exploration";
import { reduceCanvas } from "../lib/canvas-reducer";
import { defaultLayers, layerById } from "../lib/canvas";
import { networkSchema, traceNetwork } from "../lib/network";
import { municipalGeography } from "../lib/geography";
import { entities, relationships, regions, getSources } from "../lib/knowledge";
import {
  provincialMetrics,
  metricById,
  metricColor,
  metricExtent,
} from "../lib/statistics";
import { geographySvg, renderReport } from "../lib/report";
import { knowledgeSnapshot } from "../lib/snapshot";
import { visibleEntityIds } from "../lib/visibility";
import assets from "../data/geography-assets.json";

test("old nine-layer investigations migrate without losing style or order", () => {
  const layers = defaultLayers()
    .filter((l) => l.id !== "municipalities")
    .reverse()
    .map((l, zIndex) => ({ ...l, zIndex, opacity: 0.4 }));
  const next = normalizeExploration({ ...initialExploration, layers });
  assert.equal(next.layers.length, 10);
  assert.deepEqual(
    next.layers.filter((l) => l.id !== "municipalities").map((l) => l.id),
    layers.map((l) => l.id),
  );
  assert.equal(layerById(next.layers, "cities").opacity, 0.4);
  assert.equal(layerById(next.layers, "municipalities").visible, false);
});
test("split context preserves camera, synchronized selection and saved panel ratio", () => {
  const next = reduceCanvas(initialExploration, [
    { type: "FOCUS_REGION", payload: { entityId: "za-gauteng" } },
    { type: "SET_LAYOUT", payload: { layout: "split" } },
  ]);
  assert.equal(next.mode, "relationships");
  const foreign = reduceCanvas(next, [
    { type: "SELECT_COUNTRY", payload: { countryCode: "BW" } },
  ]);
  assert.equal(foreign.layout, "split");
  assert.equal(foreign.mode, "compare");
  assert.equal(next.selectedEntity, "za-gauteng");
  assert.deepEqual(
    normalizeExploration({ ...next, splitRatio: 65 }).camera,
    next.camera,
  );
  assert.equal(
    normalizeExploration({ ...next, splitRatio: 65 }).splitRatio,
    65,
  );
  assert.throws(() => normalizeExploration({ ...next, splitRatio: 90 }));
});
const ownership = networkSchema.parse({
  startId: "za-exxaro-resources",
  targetId: "za-thungela-resources",
  depth: 2,
});
test("shortest documented paths preserve source direction, dates and evidence", () => {
  const result = traceNetwork(ownership, "ZA");
  assert.equal(result.found, true);
  assert.deepEqual(result.nodeIds, [
    "za-exxaro-resources",
    "za-mafube-mine",
    "za-thungela-resources",
  ]);
  assert.equal(result.path.length, 2);
  assert.equal(result.path[1].reverse, true);
  assert.ok(
    result.path.every(
      (p) => p.relationship.asOf && getSources(p.relationship.sourceIds).length,
    ),
  );
  assert.equal(traceNetwork({ ...ownership, depth: 1 }, "ZA").found, false);
  assert.equal(
    traceNetwork({ ...ownership, direction: "outgoing" }, "ZA").found,
    false,
  );
  assert.equal(
    traceNetwork(ownership, "ZA", ["2020-01-01", "2020-12-31"]).found,
    false,
  );
  assert.throws(() => traceNetwork(ownership, "BW"));
  assert.equal(
    traceNetwork({ ...ownership, relationshipType: "SUPPLIES" }, "ZA").found,
    false,
  );
});
test("network neighborhoods terminate cycles and cap broad directory queries", () => {
  const result = traceNetwork(
    networkSchema.parse({
      startId: "za-government",
      depth: 6,
      includeDirectory: true,
    }),
    "ZA",
  );
  assert.equal(result.truncated, true);
  assert.ok(
    result.nodeIds.length <= 150 && result.relationshipIds.length <= 200,
  );
  assert.equal(new Set(result.nodeIds).size, result.nodeIds.length);
  for (const id of result.relationshipIds) {
    const r = relationships.find((r) => r.id === id)!;
    assert.ok(
      result.nodeIds.includes(r.source) && result.nodeIds.includes(r.target),
    );
  }
  const state = reduceCanvas(
    {
      ...initialExploration,
      region: "za-gauteng",
      filters: {
        query: "old filter",
        entityType: "City",
        relationshipType: "",
      },
    },
    [{ type: "TRACE_NETWORK", payload: ownership }],
  );
  assert.equal(state.region, null);
  assert.equal(state.filters.query, "");
  assert.deepEqual(state.camera.center, state.country.center);
  assert.deepEqual(
    knowledgeSnapshot(state)
      .relationships.map((r) => r.id)
      .sort(),
    traceNetwork(ownership, "ZA").relationshipIds.sort(),
  );
  assert.deepEqual(
    visibleEntityIds({
      countryCode: "ZA",
      domain: state.domain,
      mode: state.mode,
      expanded: state.expanded,
      canvas: state,
    }),
    traceNetwork(ownership, "ZA").nodeIds,
  );
  assert.equal(
    reduceCanvas(state, [
      { type: "SELECT_COUNTRY", payload: { countryCode: "BW" } },
    ]).networkTrace,
    null,
  );
});
test("municipal geometry joins 257 directory identities and carries historical provenance", () => {
  assert.equal(municipalGeography.length, 257);
  assert.equal(new Set(municipalGeography.map((m) => m.entityId)).size, 257);
  for (const m of municipalGeography) {
    assert.ok(entities.some((e) => e.id === m.entityId));
    assert.ok(regions.some((r) => r.id === m.region));
    assert.equal(m.boundaryVintage, "2020");
    assert.ok(m.bounds.every(Number.isFinite));
  }
  for (const asset of assets) {
    const bytes = fs.readFileSync(
      new URL("../public/data/" + asset.file, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      asset.sha256,
    );
  }
  const next = reduceCanvas(initialExploration, [
    { type: "FOCUS_REGION", payload: { entityId: "za-municipality-cpt" } },
  ]);
  assert.equal(layerById(next.layers, "municipalities").visible, true);
  assert.ok(next.camera.zoom > 4.5);
  assert.equal(next.region, "za-municipality-cpt");
  const metro = reduceCanvas(
    { ...initialExploration, municipalityLevel: "district" },
    [{ type: "FOCUS_REGION", payload: { entityId: "za-municipality-cpt" } }],
  );
  assert.equal(
    metro.municipalityLevel,
    "district",
    "Metros retain the chosen level because they occur in both files",
  );
});
test("provincial metrics retain their denominators and finite, negative or missing values", () => {
  assert.equal(provincialMetrics.length, 6);
  for (const metric of provincialMetrics) {
    assert.equal(metric.observations.length, 9);
    assert.ok(
      metric.denominator &&
        metric.periodLabel &&
        getSources(metric.sourceIds).length,
    );
    assert.equal(metricColor(metric, null), "#596460");
    assert.ok(metricExtent(metric).every(Number.isFinite));
  }
  const education = metricById("za-no-schooling-2022")!;
  assert.match(education.denominator, /20/);
  for (const o of education.observations)
    assert.ok(
      Math.abs(o.value! - (100 * o.numerator!) / o.denominator!) < 0.051,
    );
  const synthetic = {
    ...education,
    observations: [
      { regionId: "a", value: -2 },
      { regionId: "b", value: 0 },
      { regionId: "c", value: null },
    ],
  };
  assert.deepEqual(metricExtent(synthetic), [-2, 0]);
  assert.notEqual(metricColor(synthetic, -2), metricColor(synthetic, 0));
});
test("statistical reports preserve the selected measure and do not label it Census population", () => {
  const state = reduceCanvas(initialExploration, [
    {
      type: "SET_STATISTIC",
      payload: { metric: "za-unemployment-2026-q3", year: 2022 },
    },
    {
      type: "SET_LAYER_VISIBILITY",
      payload: { id: "statistics", visible: true },
    },
  ]);
  const data = knowledgeSnapshot(state),
    geo = JSON.parse(
      fs.readFileSync(
        new URL("../public/data/za-provinces.geojson", import.meta.url),
        "utf8",
      ),
    );
  assert.equal(data.provincialMetric?.observations.length, 9);
  const foreign = reduceCanvas(state, [
    { type: "SELECT_COUNTRY", payload: { countryCode: "BW" } },
  ]);
  assert.equal(knowledgeSnapshot(foreign).provincialMetric, null);
  const svg = geographySvg(geo, "population", 2022, "za-unemployment-2026-q3");
  assert.match(svg, /2026/);
  assert.doesNotMatch(svg, /Census 2022 population/);
  const html = renderReport(data, "Employment evidence", "", {
    geography: geo,
    overlay: "population",
    metricId: "za-unemployment-2026-q3",
  });
  assert.match(html, /Denominator:/);
  assert.match(html, /no municipal estimates/);
  assert.ok(
    data.provincialMetric!.sourceIds.every((id) =>
      html.includes("[" + id + "]"),
    ),
  );
});
