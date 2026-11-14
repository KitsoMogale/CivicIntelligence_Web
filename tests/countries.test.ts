import { test } from "node:test";
import assert from "node:assert/strict";
import {
  countries,
  entities,
  entityById,
  getSources,
  indicators,
  countryDomain,
} from "../lib/knowledge";
import {
  countryProfiles,
  countryProfile,
  countryAreas,
  domainRoot,
  supportsCountryMode,
} from "../lib/country-profiles";
import { reduceCanvas } from "../lib/canvas-reducer";
import { initialExploration } from "../lib/exploration";
import { knowledgeSnapshot } from "../lib/snapshot";
import { validateActions } from "../lib/actions";
import { GET as countryApi } from "../app/api/countries/route";
import { GET as knowledgeApi } from "../app/api/knowledge/route";
import { geographySvg, renderReport } from "../lib/report";
import type { FeatureCollection, Position } from "geojson";
test("large reference reports avoid argument limits and retain their own source credit", () => {
  const ring: Position[] = Array.from({ length: 150000 }, (_, i) => {
    const angle = (i * 2 * Math.PI) / 149999;
    return [17 + Math.cos(angle), -20 + Math.sin(angle)];
  });
  ring[ring.length - 1] = ring[0];
  const geography: FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { shapeName: "Reference area" },
        geometry: { type: "Polygon", coordinates: [ring] },
      },
    ],
  };
  assert.match(geographySvg(geography), /Illustrative geographic overview/);
  const state = reduceCanvas(initialExploration, [
    { type: "SELECT_COUNTRY", payload: { countryCode: "NA" } },
  ]);
  const html = renderReport(knowledgeSnapshot(state), "Namibia reference", "", {
    geography,
    overlay: "none",
    year: 2022,
  });
  assert.match(html, /Country\/reference geometry: 2011/);
  assert.doesNotMatch(html, /Province geometry: 2020/);
  assert.match(html, /IGO/);
});
test("every registered country or area has an isolated profile and cited root", () => {
  assert.equal(countries.length, 237);
  assert.equal(new Set(countries.map((c) => c.code)).size, countries.length);
  assert.equal(countryProfiles.length, countries.length);
  for (const c of countries) {
    const p = countryProfile(c.code);
    assert.equal(entityById(p.root)?.country, c.code);
    assert.equal(domainRoot(c.code, "government"), p.root);
    assert.ok(getSources([p.boundary.sourceId]).length);
    for (const r of countryAreas(c.code)) {
      assert.equal(entityById(r.entityId)?.country, c.code);
      assert.ok(r.bounds.every(Number.isFinite));
    }
  }
  for (const code of ["VA", "MC", "AD", "LI", "SM", "SG", "NR", "TV"])
    assert.ok(countries.some((c) => c.code === code));
  assert.equal(countries.find((c) => c.code === "AU")?.name, "Australia");
});
test("countries retain their own administrative terms and separate governance schemes", () => {
  const bw = countryProfile("BW"),
    na = countryProfile("NA");
  assert.equal(countryAreas("BW").length, 10);
  assert.equal(bw.boundary.year, "2017");
  assert.ok(bw.schemes.some((s) => s.name === "Traditional administration"));
  assert.ok(bw.schemes.some((s) => s.name === "Electoral geography"));
  assert.equal(countryAreas("NA").length, 14);
  for (const name of ["Kavango East", "Kavango West", "Zambezi", "//Kharas"])
    assert.ok(countryAreas("NA").some((r) => r.name === name));
  assert.ok(!countryAreas("NA").some((r) => r.name === "Cunene"));
  assert.match(na.boundary.note!, /2011.*Kavango East/);
  assert.equal(countryAreas("GB").length, 4);
  assert.equal(countryAreas("KE").length, 47);
  assert.equal(countryAreas("NP").length, 7);
  assert.equal(countryProfile("HU").boundary.kind, "publisher-reference");
  assert.equal(
    countryDomain("FR", "government").name,
    "Administrative reference",
  );
});
test("foreign boundary focus, navigation, exports and capability checks stay in country", () => {
  const gb = reduceCanvas(initialExploration, [
    { type: "SELECT_COUNTRY", payload: { countryCode: "GB" } },
  ]);
  const area = countryAreas("GB").find((r) => r.name === "Scotland")!;
  assert.ok(area);
  const focused = reduceCanvas(gb, [
    { type: "FOCUS_REGION", payload: { entityId: area.entityId } },
  ]);
  assert.equal(focused.region, area.entityId);
  assert.equal(focused.country.code, "GB");
  assert.equal(focused.selectedWardId, null);
  assert.notDeepEqual(focused.camera.center, gb.country.center);
  assert.ok(Number.isFinite(focused.camera.zoom));
  const unavailable = reduceCanvas(focused, [
    { type: "SELECT_COUNTRY", payload: { countryCode: "VA" } },
  ]);
  assert.ok(unavailable.comparisonCountries.includes("VA"));
  assert.throws(() =>
    validateActions(
      [{ type: "FOCUS_REGION", payload: { entityId: area.entityId } }],
      "BW",
    ),
  );
  assert.ok(supportsCountryMode("GB", "hierarchy"));
  assert.ok(!supportsCountryMode("GB", "data"));
  const graph = reduceCanvas(focused, [
    { type: "SET_VISUALIZATION_MODE", payload: { mode: "hierarchy" } },
  ]);
  assert.ok(graph.expanded.includes("gb-government"));
  const exported = knowledgeSnapshot(graph);
  assert.ok(exported.entities.every((e) => e.country === "GB"));
  assert.equal(exported.datasets.length, 0);
  assert.equal(exported.provincialMetric, null);
  assert.equal(exported.mapAttribution.provinceBoundaries, null);
  assert.equal(exported.countryProfile.code, "GB");
});
test("global historical comparisons contain mapped economies with original nulls and common years", () => {
  for (const series of indicators) {
    const codes = new Set(series.observations.map((o) => o.country));
    assert.ok(codes.size > 200);
    for (const code of ["ZA", "BW", "NA", "US", "DE", "JP", "IN"])
      assert.ok(codes.has(code));
    assert.ok(
      series.observations.every(
        (o) =>
          countries.some((c) => c.code === o.country) &&
          o.year >= 2014 &&
          o.year <= 2024,
      ),
    );
  }
  assert.ok(
    indicators.some((i) => i.observations.some((o) => o.value === null)),
  );
});
test("country and knowledge APIs return country-specific profiles and evidence", async () => {
  const all = await (
    await countryApi(new Request("http://local/api/countries"))
  ).json();
  assert.equal(all.countries.length, 237);
  const na = await (
    await countryApi(new Request("http://local/api/countries?country=NA"))
  ).json();
  assert.equal(na.areas.length, 14);
  assert.equal(na.profile.institutionCount, 5);
  assert.ok(
    na.sources.some((s: { license?: string }) => s.license?.includes("IGO")),
  );
  assert.equal(
    (await countryApi(new Request("http://local/api/countries?country=ZZ")))
      .status,
    404,
  );
  const bw = await (
    await knowledgeApi(new Request("http://local/api/knowledge?country=BW"))
  ).json();
  assert.ok(bw.entities.length > 10);
  assert.ok(bw.entities.every((e: { country: string }) => e.country === "BW"));
  assert.equal(bw.datasets.length, 0);
  assert.ok(bw.sources.length);
  const national = entities.filter(
    (e) => e.country === "BW" && e.type === "Legislature",
  );
  assert.equal(national[0].id, "bw-national-assembly");
});
