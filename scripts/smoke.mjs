import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
for (const path of [
  "/",
  "/privacy",
  "/terms",
  "/support",
  "/delete-account",
  "/api/health",
  "/api/health?deep=1",
  "/directory",
  "/review",
  "/data/countries.geojson",
  "/data/za-provinces.geojson",
]) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  console.log("PASS GET " + path);
}
assert.equal((await fetch(base + "/missing-page")).status, 404);
const context = {
  country: "ZA",
  countryName: "South Africa",
  domain: "government",
  mode: "geographic",
  selectedEntity: null,
  visibleEntities: [],
  region: null,
};
const reply = await fetch(base + "/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: base },
  body: JSON.stringify({ message: "Show electricity", context, history: [] }),
});
assert.equal(reply.status, 200);
const events = (await reply.text())
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
assert.ok(events.find((event) => event.type === "done").actions.length);
console.log(
  "PASS streamed assistant API returns canvas commands for a real browser origin",
);
const invalid = await fetch(base + "/api/chat", { method: "POST", body: "{}" });
assert.equal(invalid.status, 400);
const cross = await fetch(base + "/api/chat", {
  method: "POST",
  headers: { Origin: "https://untrusted.example" },
  body: JSON.stringify({ message: "hello", context, history: [] }),
});
assert.equal(cross.status, 403);
console.log("PASS invalid requests and foreign origins rejected");
const knowledge = await fetch(base + "/api/knowledge?q=transmission");
assert.equal(knowledge.status, 200);
assert.ok(
  (await knowledge.json()).entities.some(
    (entity) => entity.id === "za-transmission",
  ),
);
const entity = await fetch(base + "/api/knowledge?entity=za-parliament");
assert.equal(entity.status, 200);
const details = await entity.json();
assert.equal(details.entity.id, "za-parliament");
assert.ok(details.relationships.length);
const forbidden = await fetch(
  base + "/api/knowledge?entity=za-parliament&country=BW",
);
assert.equal(forbidden.status, 404);
const foreign = await fetch(base + "/api/knowledge?country=BW");
assert.deepEqual((await foreign.json()).entities, []);
console.log(
  "PASS knowledge search, entity relationships and country isolation through the frontend gateway",
);
if (process.argv.includes("--with-api")) {
  const health = await fetch(base + "/api/health");
  assert.equal((await health.json()).knowledge, "external");
  const api = await fetch(
    (process.env.KNOWLEDGE_TEST_URL || "http://127.0.0.1:8000") +
      "/health/ready",
  );
  assert.equal(api.status, 200);
  console.log("PASS frontend-to-FastAPI HTTP integration");
}
