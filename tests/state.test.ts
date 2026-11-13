import { test } from "node:test";
import assert from "node:assert/strict";
const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  },
});
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { localStorage: globalThis.localStorage },
});
test("navigation preserves context, expands ancestors and isolates countries", async () => {
  const { useExplorer } = await import("../lib/store");
  const { countries } = await import("../lib/knowledge");
  useExplorer.getState().reset();
  useExplorer.getState().selectDomain("government");
  useExplorer.getState().openEntity("za-assembly");
  assert.ok(useExplorer.getState().expanded.includes("za-parliament"));
  assert.equal(useExplorer.getState().selectedEntity, "za-assembly");
  useExplorer.getState().back();
  assert.equal(useExplorer.getState().selectedEntity, null);
  useExplorer.getState().forward();
  assert.equal(useExplorer.getState().selectedEntity, "za-assembly");
  useExplorer.getState().selectCountry(countries.find((c) => c.code === "BW")!);
  assert.equal(useExplorer.getState().selectedEntity, null);
  assert.equal(useExplorer.getState().mode, "geographic");
  assert.throws(() =>
    useExplorer.getState().applyActions([
      { type: "SELECT_COUNTRY", payload: { countryCode: "ZA" } },
      { type: "OPEN_ENTITY", payload: { entityId: "unknown" } },
    ]),
  );
  assert.equal(useExplorer.getState().country.code, "BW");
  assert.equal(
    JSON.parse(memory.get("civic-exploration-v1")!).state.country.code,
    "BW",
  );
});

test("visualization shortcuts preserve the matching knowledge domain", async () => {
  const { useExplorer } = await import("../lib/store");
  useExplorer.getState().reset();
  useExplorer.getState().setMode("flow");
  assert.equal(useExplorer.getState().domain, "infrastructure");
  useExplorer.getState().setMode("data");
  assert.equal(useExplorer.getState().domain, "society");
});

test("a compound canvas action is one undo step and invalid batches leave no partial changes", async () => {
  const { useExplorer } = await import("../lib/store");
  useExplorer.getState().reset();
  const before = JSON.stringify(useExplorer.getState().layers),
    past = useExplorer.getState().past.length;
  useExplorer.getState().applyActions([
    { type: "SET_LAYER_VISIBILITY", payload: { id: "cities", visible: false } },
    { type: "SET_LAYER_OPACITY", payload: { id: "mining", opacity: 0.3 } },
    { type: "SET_LAYOUT", payload: { layout: "overlay" } },
  ]);
  assert.equal(useExplorer.getState().past.length, past + 1);
  useExplorer.getState().back();
  assert.equal(JSON.stringify(useExplorer.getState().layers), before);
  assert.equal(useExplorer.getState().layout, "single");
  useExplorer.getState().forward();
  assert.equal(useExplorer.getState().layout, "overlay");
  const saved = memory.get("civic-exploration-v1");
  assert.throws(() =>
    useExplorer.getState().applyActions([
      {
        type: "SET_LAYER_VISIBILITY",
        payload: { id: "cities", visible: true },
      },
      {
        type: "FLY_TO",
        payload: { center: [500, 10], zoom: 5, bearing: 0, pitch: 0 },
      },
    ]),
  );
  assert.equal(memory.get("civic-exploration-v1"), saved);
});

test("map gestures are reversible and saved camera survives renderer changes and expansion", async () => {
  const { useExplorer } = await import("../lib/store");
  useExplorer.getState().reset();
  const initial = structuredClone(useExplorer.getState().camera),
    camera = {
      center: [29, -26] as [number, number],
      zoom: 7,
      bearing: 30,
      pitch: 20,
    };
  useExplorer.getState().recordCamera(camera);
  useExplorer.getState().back();
  assert.deepEqual(useExplorer.getState().camera, initial);
  useExplorer.getState().forward();
  assert.deepEqual(useExplorer.getState().camera, camera);
  const count = useExplorer.getState().past.length;
  useExplorer.getState().recordCamera({ ...camera });
  assert.equal(
    useExplorer.getState().past.length,
    count,
    "Identical camera does not add history",
  );
  useExplorer.getState().setMode("relationships");
  useExplorer.getState().toggleNode("za-national");
  useExplorer.getState().back();
  assert.deepEqual(useExplorer.getState().camera, camera);
  assert.deepEqual(
    JSON.parse(memory.get("civic-exploration-v1")!).state.camera,
    camera,
  );
});
