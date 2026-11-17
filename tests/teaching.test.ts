import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { teachingContract } from "../lib/teaching-contract";
import {
  emptyTeachingDocument,
  newTeachingComponent,
  reduceTeaching,
  teachingCommandSchema,
  teachingDocumentSchema,
} from "../lib/teaching";
import { useTeaching } from "../lib/teaching-store";
test("a follow-up can update one subject without rebuilding unrelated visuals", () => {
  const a = newTeachingComponent("flow"),
    b = newTeachingComponent("map", 1);
  const first = reduceTeaching(emptyTeachingDocument, [
    { type: "upsert_component", component: a },
    { type: "upsert_component", component: b },
  ]);
  const next = reduceTeaching(first, [
    {
      type: "upsert_component",
      component: { ...a, text: "New explanation of irrigation" },
    },
  ]);
  assert.deepEqual(next.components[1], b);
  assert.equal(next.components[1], first.components[1]);
  const panned = reduceTeaching(next, [
    { type: "set_canvas_viewport", viewport: { x: 80, y: 50, zoom: 0.7 } },
  ]);
  assert.equal(panned.components, next.components);
  assert.equal(first.components[0].text, "");
  assert.equal(next.components[0].text, "New explanation of irrigation");
});
test("invalid commands and dangling links fail an entire batch", () => {
  const c = newTeachingComponent("flow");
  assert.throws(() =>
    reduceTeaching(emptyTeachingDocument, [
      { type: "upsert_component", component: c },
      {
        type: "connect_components",
        connection: { id: "bad", source: c.id, target: "missing", label: "" },
      },
    ]),
  );
  assert.throws(() =>
    reduceTeaching(emptyTeachingDocument, [
      { type: "execute_code", code: "alert(1)" },
    ]),
  );
  assert.equal(emptyTeachingDocument.components.length, 0);
});
test("editing a visual preserves a selected element while that element exists", () => {
  const c = newTeachingComponent("flow");
  c.nodes = [{ id: "step", label: "Selected step", detail: "" }];
  const doc = reduceTeaching(emptyTeachingDocument, [
    { type: "upsert_component", component: c },
    { type: "select_canvas", componentId: c.id, elementId: "step" },
  ]);
  const updated = reduceTeaching(doc, [
    { type: "upsert_component", component: { ...c, collapsed: ["step"] } },
  ]);
  assert.equal(updated.selectedElement, "step");
  const removed = reduceTeaching(updated, [
    { type: "upsert_component", component: { ...c, nodes: [] } },
  ]);
  assert.equal(removed.selectedElement, null);
});
test("location evidence, numeric bounds and element references are checked", () => {
  const map = newTeachingComponent("map");
  map.markers = [
    {
      id: "site",
      label: "Facility",
      detail: "",
      longitude: 23,
      latitude: -25,
      precision: "approximate",
      sourceUrl: "https://example.org/site",
    },
  ];
  assert.throws(
    () =>
      reduceTeaching(emptyTeachingDocument, [
        { type: "upsert_component", component: map },
      ]),
    /source/,
  );
  map.sources = [
    {
      title: "Published location",
      url: "https://example.org/site",
      date: null,
    },
  ];
  const doc = reduceTeaching(emptyTeachingDocument, [
    { type: "upsert_component", component: map },
  ]);
  assert.throws(() =>
    reduceTeaching(doc, [
      { type: "focus_map", componentId: map.id, center: [999, 0], zoom: 5 },
    ]),
  );
  assert.throws(() =>
    reduceTeaching(doc, [
      { type: "highlight_elements", componentId: map.id, ids: ["unknown"] },
    ]),
  );
});
test("stale AI changes are rejected and a batch is one undo step", () => {
  useTeaching.setState({
    document: structuredClone(emptyTeachingDocument),
    revision: 0,
    past: [],
    future: [],
  });
  const s = useTeaching.getState(),
    c = newTeachingComponent("annotation");
  s.apply([{ type: "upsert_component", component: c }]);
  assert.throws(
    () => s.apply([{ type: "remove_component", id: c.id }], 0),
    /changed/,
  );
  assert.equal(useTeaching.getState().document.components.length, 1);
  s.undo();
  assert.equal(useTeaching.getState().document.components.length, 0);
  s.redo();
  assert.equal(useTeaching.getState().document.components.length, 1);
});
test("FastAPI receives the same generated contract as the browser", () => {
  const contract = JSON.parse(
    readFileSync("backend/canvas-contract.json", "utf8"),
  );
  assert.deepEqual(contract, teachingContract());
});
