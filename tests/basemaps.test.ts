import { test } from "node:test";
import assert from "node:assert/strict";
import { basemapMetadata, rasterBasemap } from "../lib/basemaps";
import { initialExploration, normalizeExploration } from "../lib/exploration";
import { knowledgeSnapshot } from "../lib/snapshot";
import { renderReport } from "../lib/report";
import { reduceCanvas } from "../lib/canvas-reducer";
import { municipalityWards } from "../lib/boundaries";

test("satellite investigations retain ward, camera, layers and selections through JSON restore", () => {
  const ward = municipalityWards("za-municipality-cpt")[0];
  const before = reduceCanvas(initialExploration, [
    { type: "SELECT_WARD", payload: { id: ward.id } },
  ]);
  for (const basemap of ["satellite", "satellite-detail"] as const) {
    const after = normalizeExploration(
      JSON.parse(JSON.stringify({ ...before, basemap })),
    );
    assert.equal(after.basemap, basemap);
    assert.equal(after.selectedWardId, ward.id);
    assert.deepEqual(after.camera, before.camera);
    assert.deepEqual(after.layers, before.layers);
    assert.deepEqual(after.selectionIds, before.selectionIds);
    assert.equal(after.region, before.region);
  }
  assert.throws(() =>
    normalizeExploration({ ...before, basemap: "invented-provider" }),
  );
});

test("key-free satellite requests stop at native zoom and identify the dated open mosaic", () => {
  const source = rasterBasemap("satellite", "");
  assert.equal(source?.maxzoom, 14);
  assert.match(
    source?.tiles?.[0] ?? "",
    /s2cloudless_3857\/default\/g\/\{z\}\/\{y\}\/\{x\}\.jpg$/,
  );
  assert.match(
    source?.attribution ?? "",
    /modified Copernicus Sentinel data 2016/,
  );
  assert.match(basemapMetadata("satellite")?.license ?? "", /CC BY 4.0/);
  assert.equal(rasterBasemap("reference", ""), null);
});

test("detailed imagery needs its own browser key and uses provider TileJSON for limits and credits", () => {
  assert.equal(rasterBasemap("satellite-detail", ""), null);
  const source = rasterBasemap("satellite-detail", "test key&value");
  assert.equal(
    source?.url,
    "https://api.maptiler.com/tiles/satellite-v4/tiles.json?key=test%20key%26value",
  );
  assert.equal(source?.tiles, undefined);
  assert.equal(source?.maxzoom, undefined);
  assert.ok(
    !JSON.stringify(basemapMetadata("satellite-detail")).includes("test key"),
  );
});

test("satellite exports identify the selected provider without embedding online imagery or keys", () => {
  for (const basemap of ["satellite", "satellite-detail"] as const) {
    const snapshot = knowledgeSnapshot({ ...initialExploration, basemap });
    assert.deepEqual(
      snapshot.mapAttribution.satellite,
      basemapMetadata(basemap),
    );
    const report = renderReport(snapshot, "Satellite test", "");
    assert.match(report, /Online imagery is not embedded in offline reports/);
    assert.match(report, /This report shows reference geography instead/);
    assert.ok(!report.includes("api.maptiler.com/tiles"));
    assert.ok(!report.includes("tiles.maps.eox.at"));
  }
  assert.equal(
    knowledgeSnapshot(initialExploration).mapAttribution.satellite,
    null,
  );
});
