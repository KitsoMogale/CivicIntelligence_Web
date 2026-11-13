import { test } from "node:test";
import assert from "node:assert/strict";
import { initialExploration, normalizeExploration } from "../lib/exploration";
import {
  defaultLayers,
  layerById,
  legacyLayers,
  geographicScope,
} from "../lib/canvas";
import { reduceCanvas } from "../lib/canvas-reducer";
import { validateActions } from "../lib/actions";
import { canvasPlaces, canvasLinks, relationshipInTime } from "../lib/map-data";
import { knowledgeSnapshot } from "../lib/snapshot";
import { parseInvestigation } from "../lib/investigations";

test("legacy saved views migrate their exclusive marker and statistical settings", () => {
  const {
    layers,
    camera,
    density,
    layout,
    selectionIds,
    isolatedEntityIds,
    highlightedRelationshipIds,
    filters,
    timeRange,
    ...old
  } = initialExploration;
  const view = normalizeExploration({
    ...old,
    markerLayer: "mining",
    populationLayer: "change",
    provinceLayer: false,
  });
  assert.equal(layerById(view.layers, "mining").visible, true);
  assert.equal(layerById(view.layers, "cities").visible, false);
  assert.equal(layerById(view.layers, "provinces").visible, false);
  assert.equal(layerById(view.layers, "statistics").metric, "change");
  assert.deepEqual(view.camera.center, view.country.center);
  assert.equal(view.layout, "single");
});
test("layer changes compose independently, enforce opacity bounds and preserve unique ordering", () => {
  const next = reduceCanvas(initialExploration, [
    { type: "SET_LAYER_VISIBILITY", payload: { id: "cities", visible: false } },
    { type: "SET_LAYER_OPACITY", payload: { id: "mining", opacity: 0.35 } },
    {
      type: "REORDER_LAYERS",
      payload: {
        ids: defaultLayers()
          .map((l) => l.id)
          .reverse(),
      },
    },
  ]);
  assert.equal(layerById(next.layers, "cities").visible, false);
  assert.equal(layerById(next.layers, "infrastructure").visible, true);
  assert.equal(layerById(next.layers, "mining").opacity, 0.35);
  assert.equal(layerById(next.layers, "countries").zIndex, 9);
  assert.throws(() =>
    validateActions([
      { type: "SET_LAYER_OPACITY", payload: { id: "mining", opacity: 2 } },
    ]),
  );
  assert.throws(() =>
    validateActions([
      { type: "REORDER_LAYERS", payload: { ids: Array(9).fill("cities") } },
    ]),
  );
  assert.equal(
    layerById(initialExploration.layers, "cities").visible,
    true,
    "Reducer does not mutate its input",
  );
});
test("mode and overlay changes preserve selected entity, region, camera and shared filters", () => {
  const focused = reduceCanvas(initialExploration, [
    { type: "FOCUS_REGION", payload: { entityId: "za-gauteng" } },
    {
      type: "SET_FILTERS",
      payload: { query: "", entityType: "", relationshipType: "" },
    },
    { type: "SET_LAYOUT", payload: { layout: "overlay" } },
  ]);
  const next = reduceCanvas(focused, [
    { type: "SET_VISUALIZATION_MODE", payload: { mode: "relationships" } },
  ]);
  assert.equal(next.selectedEntity, "za-gauteng");
  assert.equal(next.region, "za-gauteng");
  assert.equal(next.layout, "overlay");
  assert.deepEqual(next.camera, focused.camera);
  const chart = reduceCanvas(next, [
    { type: "SET_VISUALIZATION_MODE", payload: { mode: "data" } },
    { type: "OPEN_ENTITY", payload: { entityId: "za-gauteng" } },
  ]);
  assert.equal(chart.domain, "society");
  assert.equal(chart.selectedEntity, "za-gauteng");
  assert.deepEqual(chart.camera, focused.camera);
});
test("density, scope, viewport and layer filters constrain markers without inventing positions", () => {
  const base = { ...initialExploration, density: "detailed" as const };
  const overview = canvasPlaces({ ...base, density: "overview" });
  assert.ok(overview.length <= 12);
  assert.equal(geographicScope(1.5), "World");
  assert.equal(
    canvasPlaces({ ...base, camera: { ...base.camera, zoom: 1.5 } }).length,
    0,
  );
  const mining = canvasPlaces({
    ...base,
    layers: legacyLayers({ markerLayer: "mining" }),
  });
  assert.ok(mining.length > 0);
  assert.ok(mining.every((p) => p.regional));
  const points = canvasPlaces(base, [0, 0, 1, 1]);
  assert.equal(points.length, 0);
  const filtered = reduceCanvas(base, [
    {
      type: "SET_LAYER_FILTERS",
      payload: {
        id: "cities",
        filters: { query: "Cape Town", entityType: "", relationshipType: "" },
      },
    },
  ]);
  const cities = canvasPlaces(filtered).filter((p) => p.entity.type === "City");
  assert.ok(cities.every((p) => p.entity.name.includes("Cape Town")));
});
test("date filters use reporting snapshots and exclude undated evidence", () => {
  const range: [string, string] = ["2025-01-01", "2025-12-31"];
  assert.equal(relationshipInTime({ asOf: "2025-12-31" }, range), true);
  assert.equal(relationshipInTime({ asOf: "2024-12-31" }, range), false);
  assert.equal(relationshipInTime({}, range), false);
  const links = canvasLinks({ ...initialExploration, timeRange: range });
  assert.ok(links.length > 0);
  assert.ok(links.every((r) => r.asOf || r.validFrom || r.validTo));
  assert.throws(() =>
    validateActions([
      {
        type: "SET_TIME_RANGE",
        payload: { range: ["2025-12-31", "2025-01-01"] },
      },
    ]),
  );
});
test("selection isolation and country changes cannot retain foreign entity state", () => {
  const selected = reduceCanvas(initialExploration, [
    {
      type: "SELECT_ENTITIES",
      payload: { ids: ["za-kusile-power-station", "za-duvha-power-station"] },
    },
    { type: "ISOLATE_ENTITIES", payload: { ids: ["za-duvha-power-station"] } },
  ]);
  assert.deepEqual(
    canvasPlaces(selected).map((p) => p.entity.id),
    ["za-duvha-power-station"],
  );
  const changed = reduceCanvas(selected, [
    { type: "SELECT_COUNTRY", payload: { countryCode: "BW" } },
  ]);
  assert.deepEqual(changed.selectionIds, []);
  assert.deepEqual(changed.isolatedEntityIds, []);
  assert.equal(changed.region, null);
  assert.equal(changed.camera.zoom, changed.country.zoom);
  assert.throws(() =>
    reduceCanvas(changed, [
      {
        type: "SELECT_ENTITIES",
        payload: { ids: ["za-kusile-power-station"] },
      },
    ]),
  );
});
test("saved investigations retain camera, layer styling and layout while snapshots omit undo internals", () => {
  const context = reduceCanvas(initialExploration, [
    {
      type: "FLY_TO",
      payload: { center: [28, -26], zoom: 8, bearing: 25, pitch: 30 },
    },
    { type: "SET_LAYER_OPACITY", payload: { id: "cities", opacity: 0.4 } },
    { type: "SET_LAYOUT", payload: { layout: "overlay" } },
  ]);
  const value = parseInvestigation({
    id: "canvas-save",
    title: "View",
    note: "",
    createdAt: "2026-11-13T10:00:00.000Z",
    updatedAt: "2026-11-13T10:00:00.000Z",
    context,
  });
  assert.deepEqual(value.context.camera, context.camera);
  assert.equal(value.context.layout, "overlay");
  assert.equal(layerById(value.context.layers, "cities").opacity, 0.4);
  const exported = knowledgeSnapshot({
    ...context,
    past: [context],
    future: [context],
  } as typeof context);
  assert.equal("past" in exported, false);
  assert.equal("future" in exported, false);
  assert.deepEqual(exported.camera, context.camera);
});
