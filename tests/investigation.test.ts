import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import seed from "../data/knowledge.json";
import directory from "../data/provenance/municipalities.json";
import {
  entities,
  indicators,
  regions,
  relationships,
  timelineEvents,
} from "../lib/knowledge";
import { inspectBundle } from "../lib/data-quality";
import { commonYears, comparisonRows } from "../lib/analytics";
import { initialExploration, normalizeExploration } from "../lib/exploration";
import { parseInvestigation } from "../lib/investigations";
import { knowledgeSnapshot } from "../lib/snapshot";
import { renderReport, geographySvg } from "../lib/report";
import { mapPlaces } from "../lib/map-data";
import { knowledgeReadiness } from "../lib/health";
import { legacyLayers } from "../lib/canvas";
import { GET as compare } from "../app/api/compare/route";
import { GET as history } from "../app/api/history/route";

test("active municipality directory excludes the documented former codes", () => {
  const current = directory.municipalities.filter((m) => !m.historical),
    former = directory.municipalities.filter((m) => m.historical);
  assert.equal(current.length, 257);
  assert.equal(former.length, 35);
  for (const [category, count] of [
    ["A", 8],
    ["B", 205],
    ["C", 44],
  ] as const)
    assert.equal(current.filter((m) => m.category === category).length, count);
  const graph = new Set(entities.map((e) => e.id));
  for (const m of current)
    assert.ok(graph.has("za-municipality-" + m.code.toLowerCase()));
  for (const m of former)
    assert.ok(!graph.has("za-municipality-" + m.code.toLowerCase()));
  assert.equal(
    entities.filter((e) =>
      ["National department", "National public body"].includes(e.type),
    ).length,
    43,
  );
});
test("province geometry, metadata, capital context and statistics join consistently", () => {
  const geo = JSON.parse(
    fs.readFileSync(
      new URL("../public/data/za-provinces.geojson", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(regions.length, 9);
  assert.equal(geo.features.length, 9);
  for (const region of regions) {
    const geometry = geo.features.find(
      (f: { properties: { id: string } }) => f.properties.id === region.id,
    );
    assert.ok(geometry);
    assert.ok(
      entities.some(
        (e) =>
          e.id === region.entityId &&
          e.attributes?.["Provincial capital"] === region.capital,
      ),
    );
    assert.ok(geometry.properties.population2022 > 0);
    assert.ok(Number.isFinite(geometry.properties.changePercent));
  }
});
test("ownership evidence remains dated and distinguishes joint ventures and subsidiary levels", () => {
  const mafube = relationships.find(
    (r) => r.source === "za-exxaro-resources" && r.target === "za-mafube-mine",
  )!;
  assert.equal(mafube.ownershipPercent, 50);
  assert.equal(mafube.asOf, "2025-12-31");
  assert.match(mafube.type, /JOINT_VENTURE/);
  const operating = relationships.find(
    (r) =>
      r.source === "za-rustenburg-platinum-mines" &&
      r.target === "za-mogalakwena-mine",
  )!;
  assert.match(operating.description, /not the parent/);
  assert.equal(operating.ownershipPercent, undefined);
  assert.ok(
    relationships
      .filter((r) => r.ownershipPercent !== undefined)
      .every((r) => r.asOf),
  );
});
test("unsafe sources, missing endpoints and undated ownership fail proposal validation", () => {
  assert.equal(
    inspectBundle(seed).issues.filter((i) => i.severity === "error").length,
    0,
  );
  const invalid = structuredClone(seed);
  invalid.relationships[0].target = "missing-entity";
  assert.ok(
    inspectBundle(invalid).issues.some((i) => i.message.includes("endpoint")),
  );
  const unsafe = structuredClone(seed);
  unsafe.sources[0].url = "javascript:alert(1)";
  assert.equal(inspectBundle(unsafe).bundle, null);
  const undated = structuredClone(seed) as unknown as {
    relationships: { id: string; asOf?: string; ownershipPercent?: number }[];
  };
  const owned = undated.relationships.find(
    (r) => r.ownershipPercent !== undefined,
  )!;
  delete owned.asOf;
  assert.ok(
    inspectBundle(undated).issues.some((i) =>
      i.message.includes("reporting date"),
    ),
  );
});
test("common-year comparison preserves nulls, zero and negative growth", () => {
  const indicator = {
    ...indicators[0],
    observations: [
      { country: "ZA", year: 2020, value: 0 },
      { country: "BW", year: 2020, value: 2 },
      { country: "ZA", year: 2021, value: null },
      { country: "BW", year: 2021, value: 3 },
    ],
  };
  assert.deepEqual(commonYears(indicator, ["ZA", "BW"]), [2020]);
  const observed = comparisonRows("NY.GDP.MKTP.KD.ZG", ["ZA", "BW"], 2024)!;
  assert.equal(observed.year, 2024);
  assert.ok(observed.rows.find((r) => r.country === "BW")!.value! < 0);
  const missing = comparisonRows("SP.POP.TOTL", ["ZA", "VA"], 2024)!;
  assert.equal(missing.rows.find((r) => r.country === "VA")!.value, null);
  assert.equal(comparisonRows("SP.POP.TOTL", ["ZA", "BW"])!.year, 2024);
});
test("investigations restore the full selected evidence and reject foreign or unknown records", () => {
  const context = {
    ...initialExploration,
    selectedEntity: "za-mogalak-wena-invalid",
  };
  assert.throws(() => normalizeExploration(context));
  const valid = {
    ...initialExploration,
    domain: "industry" as const,
    mode: "relationships" as const,
    selectedEntity: "za-mogalakwena-mine",
    expanded: [
      "za-mining",
      "za-valterra-platinum",
      "za-rustenburg-platinum-mines",
    ],
    populationLayer: "change" as const,
    layers: legacyLayers({ populationLayer: "change" }),
    comparisonCountries: ["ZA", "NA"],
    comparisonYear: 2020,
  };
  const item = parseInvestigation({
    id: "saved-1",
    title: "Mining evidence",
    note: "Check ownership source",
    createdAt: "2026-11-13T10:00:00.000Z",
    updatedAt: "2026-11-13T10:00:00.000Z",
    context: valid,
  });
  assert.deepEqual(item.context.expanded, valid.expanded);
  assert.equal(item.context.comparisonYear, 2020);
  assert.equal(item.context.populationLayer, "change");
  const withCharts = normalizeExploration({
    ...valid,
    chartType: "trend",
    comparisonDisplay: "history",
  });
  assert.equal(withCharts.chartType, "trend");
  assert.equal(withCharts.comparisonDisplay, "history");
  assert.throws(() =>
    normalizeExploration({ ...valid, selectedRelationship: "made-up-link" }),
  );
});
test("reports escape notes and source URLs and preserve negative comparison values", () => {
  const data = knowledgeSnapshot({
    ...initialExploration,
    mode: "compare",
    indicatorCode: "NY.GDP.MKTP.KD.ZG",
    comparisonYear: 2024,
  });
  assert.equal(data.entities.length, 0);
  assert.equal(data.comparison!.year, 2024);
  const html = renderReport(
    data,
    '<img src=x onerror="alert(1)">',
    "<script>alert(1)</script>",
  );
  assert.ok(html.includes("&lt;script&gt;"));
  assert.doesNotMatch(html, /<script[\s>]/i);
  assert.match(html, /-2[.,]78%/);
  assert.ok(html.includes("shared zero baseline"));
  const unsafe = structuredClone(data);
  unsafe.sources[0].url = "javascript:alert(1)";
  assert.doesNotMatch(renderReport(unsafe, "Report", ""), /href="javascript:/);
  assert.match(
    renderReport({ ...data, comparisonDisplay: "history" }, "History", ""),
    /Historical trends with source observations/,
  );
});
test("geographic reports include vector provinces and map layers retain precision notes", () => {
  const boundaries = JSON.parse(
    fs.readFileSync(
      new URL("../public/data/za-provinces.geojson", import.meta.url),
      "utf8",
    ),
  );
  const svg = geographySvg(boundaries, "population");
  assert.equal((svg.match(/<path /g) ?? []).length, 9);
  assert.ok(svg.includes("CC BY 3.0 IGO"));
  assert.match(
    geographySvg(boundaries, "population", 2011),
    /Census 2011 population/,
  );
  assert.equal(mapPlaces("ZA", "cities").length, 13);
  assert.equal(mapPlaces("ZA", "infrastructure").length, 4);
  const duvha = mapPlaces("ZA", "infrastructure").find(
    (p) => p.entity.id === "za-duvha-power-station",
  )!;
  assert.equal(duvha.regional, true);
  assert.match(duvha.entity.coordinateNote!, /verification/);
  assert.deepEqual(mapPlaces("BW", "infrastructure"), []);
});
test("timeline exports respect the selected country, year and entity", () => {
  const snapshot = knowledgeSnapshot({
    ...initialExploration,
    mode: "timeline",
    timelineYear: 2020,
    timelineEntity: "za-belfast-mine",
  });
  assert.equal(snapshot.events.length, 1);
  assert.equal(snapshot.events[0].date, "2019");
  assert.equal(snapshot.entities.length, 0);
  for (const event of timelineEvents) {
    assert.ok(event.sourceIds.length);
    assert.ok(event.entityIds.every((id) => entities.some((e) => e.id === id)));
  }
});
test("comparison and history APIs reject malformed filters and isolate foreign entity requests", async () => {
  assert.equal(
    compare(new Request("http://local/api/compare?countries=ZA,ZA")).status,
    400,
  );
  assert.equal(
    compare(new Request("http://local/api/compare?year=oops")).status,
    400,
  );
  const response = compare(
    new Request("http://local/api/compare?countries=ZA,NA&year=2020"),
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).rows.length, 2);
  assert.equal(
    history(
      new Request("http://local/api/history?country=BW&entity=za-belfast-mine"),
    ).status,
    404,
  );
  assert.equal(
    (await history(new Request("http://local/api/history?country=BW")).json())
      .events.length,
    0,
  );
});
test("readiness works without AI credentials and detects unavailable or mismatched knowledge releases", async () => {
  assert.equal((await knowledgeReadiness("")).ready, true);
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json({ status: "ready", revision: "different" });
    assert.equal(
      (await knowledgeReadiness("http://knowledge.test")).ready,
      false,
    );
    globalThis.fetch = async () => new Response("not ready", { status: 503 });
    assert.equal(
      (await knowledgeReadiness("http://knowledge.test")).ready,
      false,
    );
  } finally {
    globalThis.fetch = original;
  }
});
