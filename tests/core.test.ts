import { test } from "node:test";
import assert from "node:assert/strict";
import { validateActions, chatRequestSchema } from "../lib/actions";
import { localGuide } from "../lib/guide";
import { entities, relationships, sources, datasets } from "../lib/knowledge";
const context = {
  country: "ZA",
  countryName: "South Africa",
  domain: "government" as const,
  mode: "geographic" as const,
  selectedEntity: null,
  visibleEntities: [],
  region: null,
};
test("unknown, executable and malformed actions are rejected", () => {
  for (const a of [
    [{ type: "EVAL", payload: { code: "alert(1)" } }],
    [{ type: "FIT_CANVAS", payload: { code: "alert(1)" } }],
    [{ type: "OPEN_ENTITY", payload: { entityId: "fake" } }],
    [{ type: "CREATE_CHART", payload: { datasetId: "fake" } }],
  ])
    assert.throws(() => validateActions(a));
});
test("country isolation and coverage constraints are enforced", () => {
  assert.throws(() =>
    validateActions(
      [{ type: "OPEN_ENTITY", payload: { entityId: "za-parliament" } }],
      "BW",
    ),
  );
  assert.throws(() =>
    validateActions(
      [{ type: "SET_VISUALIZATION_MODE", payload: { mode: "data" } }],
      "BW",
    ),
  );
  assert.equal(
    validateActions(
      [
        { type: "SELECT_COUNTRY", payload: { countryCode: "ZA" } },
        { type: "OPEN_ENTITY", payload: { entityId: "za-parliament" } },
      ],
      "BW",
    ).length,
    2,
  );
});
test("seed relationships, citations and dataset values are consistent", () => {
  const ids = new Set(entities.map((e) => e.id)),
    refs = new Set(sources.map((s) => s.id));
  assert.equal(ids.size, entities.length);
  for (const record of [...entities, ...relationships, ...datasets]) {
    assert.ok(record.sourceIds.length);
    record.sourceIds.forEach((id) => assert.ok(refs.has(id)));
  }
  relationships.forEach((r) => {
    assert.ok(ids.has(r.source));
    assert.ok(ids.has(r.target));
  });
  assert.equal(datasets[0].points.length, 9);
  assert.equal(
    datasets[0].points.reduce((sum, p) => sum + p.value, 0),
    62027503,
  );
  assert.ok(
    datasets[0].points.every((p) => Number.isInteger(p.value) && p.value > 0),
  );
});
test("electricity guide produces grounded flow and validated actions", () => {
  const reply = localGuide({
    message: "Show how electricity reaches homes",
    context,
    history: [],
  });
  assert.ok(
    reply.actions.some(
      (a) => a.type === "SET_VISUALIZATION_MODE" && a.payload.mode === "flow",
    ),
  );
  assert.ok(reply.sourceIds.includes("ntcsa"));
  assert.match(reply.message, /not company ownership/);
});
test("government guide preserves constitutional distinctions", () => {
  const reply = localGuide({
    message: "Explain the government structure",
    context,
    history: [],
  });
  assert.match(reply.message, /not a simple chain of command/);
  assert.ok(reply.sourceIds.includes("constitution"));
});
test("the local guide opens the sourced historical comparison view", () => {
  const reply = localGuide({
    message: "Compare South Africa and Botswana",
    context,
    history: [],
  });
  assert.match(reply.message, /2014–2024/);
  assert.ok(
    reply.actions.some(
      (action) =>
        action.type === "SET_VISUALIZATION_MODE" &&
        action.payload.mode === "compare",
    ),
  );
  assert.ok(reply.sourceIds.some((id) => id.startsWith("world-wdi-")));
});
test("oversized chat and missing context fail validation", () => {
  assert.equal(
    chatRequestSchema.safeParse({
      message: "x".repeat(2001),
      context,
      history: [],
    }).success,
    false,
  );
  assert.equal(chatRequestSchema.safeParse({ message: "hi" }).success, false);
});
test("foreign country guidance uses its own reviewed profile and keeps unsupported details absent", () => {
  const reply = localGuide({
    message: "show government",
    context: { ...context, country: "BW", countryName: "Botswana" },
    history: [],
  });
  assert.ok(reply.sourceIds.length > 0);
  assert.ok(
    reply.actions.every(
      (a) => a.type !== "OPEN_ENTITY" || a.payload.entityId.startsWith("bw-"),
    ),
  );
  assert.doesNotMatch(reply.message, /only for South Africa/);
});

test("the guide can navigate to a world-map country without inventing knowledge", () => {
  const reply = localGuide({ message: "Explore France", context, history: [] });
  assert.ok(
    reply.actions.some(
      (a) => a.type === "SELECT_COUNTRY" && a.payload.countryCode === "FR",
    ),
  );
  assert.ok(reply.sourceIds.length > 0);
  assert.match(reply.message, /coverage/);
});
