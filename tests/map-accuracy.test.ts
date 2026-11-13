import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { initialExploration, normalizeExploration } from "../lib/exploration";
import { reduceCanvas } from "../lib/canvas-reducer";
import { defaultLayers, layerById, cameraSchema } from "../lib/canvas";
import {
  officialMunicipalities,
  wards,
  municipalityWards,
  wardById,
  municipalFilesFor,
  boundaryMunicipality,
} from "../lib/boundaries";
import { knowledgeSnapshot } from "../lib/snapshot";
import { renderReport } from "../lib/report";
import { canvasPlaces } from "../lib/map-data";
import { validateActions } from "../lib/actions";
import release from "../data/boundary-release.json";
import repairs from "../data/provenance/mdb-geometry-repairs.json";
import { createHash } from "node:crypto";

test("one publisher ring repair preserves original coordinates, area and downloadable evidence", () => {
  assert.equal(repairs.length, 1);
  const repair = repairs[0];
  const original = fs.readFileSync(
    new URL("../public" + repair.originalGeometryFile, import.meta.url),
  );
  assert.equal(
    createHash("sha256").update(original).digest("hex"),
    repair.originalFileSha256,
  );
  const originalGeometry = JSON.parse(original.toString()).features[0].geometry;
  const pairs = (g: { coordinates: number[][][] }) =>
    new Set(g.coordinates.flat().map((p) => JSON.stringify(p)));
  assert.deepEqual(pairs(originalGeometry), pairs(repair.repairedGeometry));
  assert.equal(repair.originalAreaM2, repair.repairedAreaM2);
  assert.equal(
    wardById(repair.wardId)?.originalGeometryFile,
    repair.originalGeometryFile,
  );
});

test("street zoom validates through19 and omits province-only point proxies", () => {
  const state = reduceCanvas(initialExploration, [
    {
      type: "FLY_TO",
      payload: { center: [18.42, -33.92], zoom: 19, bearing: 0, pitch: 0 },
    },
  ]);
  assert.equal(state.camera.zoom, 19);
  assert.throws(() => cameraSchema.parse({ ...state.camera, zoom: 20 }));
  assert.ok(
    canvasPlaces({ ...state, density: "detailed" }).every((p) => !p.regional),
  );
});
test("nine and ten layer investigations migrate while preserving their original edition", () => {
  const { boundaryEdition, basemap, selectedWardId, ...old } =
    initialExploration;
  for (const omitted of [["wards"], ["wards", "municipalities"]]) {
    const layers = defaultLayers()
      .filter((l) => !omitted.includes(l.id))
      .map((l, zIndex) => ({ ...l, zIndex }));
    const restored = normalizeExploration({ ...old, layers });
    assert.equal(restored.layers.length, 11);
    assert.equal(restored.boundaryEdition, "legacy-2020");
    assert.equal(restored.basemap, "reference");
    assert.equal(restored.selectedWardId, null);
  }
});
test("reviewed municipality and ward coverage matches the revised publisher release", () => {
  assert.equal(officialMunicipalities.length, 257);
  assert.equal(wards.length, 4485);
  assert.equal(new Set(wards.map((w) => w.id)).size, 4485);
  const parents = new Set(officialMunicipalities.map((m) => m.entityId));
  assert.ok(wards.every((w) => parents.has(w.municipalityId)));
  assert.equal(municipalityWards("za-municipality-fs162").length, 9);
  assert.equal(municipalityWards("za-municipality-fs164").length, 0);
  const merafong = municipalityWards("za-municipality-gt484");
  assert.equal(merafong.length, 25);
  assert.equal(
    merafong.some((w) => [8, 19, 27].includes(w.number)),
    false,
    "Published numbering gaps are not filled with invented wards",
  );
  assert.equal(release.sourceDate, "2026-11-04");
  assert.match(release.sourceDateMeaning, /not the retrieval/);
});
test("official geometry loads only the selected scope with original source attributes", () => {
  assert.deepEqual(municipalFilesFor("mdb-2026", "local", null), []);
  const paths = municipalFilesFor("mdb-2026", "local", "za-municipality-cpt");
  assert.equal(paths.length, 1);
  const feature = JSON.parse(
    fs.readFileSync(new URL("../public" + paths[0], import.meta.url), "utf8"),
  ).features[0];
  assert.equal(feature.properties.CAT_B, "CPT");
  assert.equal(feature.properties.CATEGORY, "A");
  assert.equal(feature.properties.DATE_, Date.parse("2026-11-04"));
  assert.equal(feature.properties.boundaryVintage, "2026");
  assert.deepEqual(
    feature.properties.bounds,
    boundaryMunicipality("za-municipality-cpt", "mdb-2026")!.bounds,
  );
  assert.ok(
    municipalFilesFor("legacy-2020", "local", null)[0].endsWith(
      "za-municipalities-adm3.geojson",
    ),
  );
});
test("ward selection shares the correct parent, camera and dated report evidence", () => {
  const ward = municipalityWards("za-municipality-cpt")[0];
  assert.ok(ward);
  const next = reduceCanvas(initialExploration, [
    { type: "SELECT_WARD", payload: { id: ward.id } },
  ]);
  assert.equal(next.selectedWardId, ward.id);
  assert.equal(next.region, ward.municipalityId);
  assert.equal(next.selectedEntity, ward.municipalityId);
  assert.equal(next.boundaryEdition, "mdb-2026");
  assert.equal(next.municipalityLevel, "local");
  assert.equal(layerById(next.layers, "wards").visible, true);
  assert.ok(next.camera.zoom <= 17 && next.camera.zoom >= 4.5);
  assert.equal(
    normalizeExploration(JSON.parse(JSON.stringify(next))).selectedWardId,
    ward.id,
  );
  const data = knowledgeSnapshot(next);
  assert.equal(data.selectedWard?.id, ward.id);
  assert.ok(data.sources.some((s) => s.id === "mdb-wards-2026"));
  assert.ok(data.sources.some((s) => s.id === "openstreetmap"));
  const html = renderReport(data, "Ward research", "");
  assert.ok(html.includes("Ward " + ward.number));
  assert.match(html, /No ward population/);
  assert.match(html, /street tiles are not embedded/);
});
test("country, region and historical-edition changes cannot retain an unrelated ward", () => {
  const ward = wards[0],
    next = reduceCanvas(initialExploration, [
      { type: "SELECT_WARD", payload: { id: ward.id } },
    ]);
  assert.equal(
    normalizeExploration({ ...next, boundaryEdition: "legacy-2020" })
      .selectedWardId,
    null,
  );
  assert.equal(
    reduceCanvas(next, [
      { type: "SELECT_COUNTRY", payload: { countryCode: "BW" } },
    ]).selectedWardId,
    null,
  );
  assert.equal(
    reduceCanvas(next, [
      { type: "FOCUS_REGION", payload: { entityId: "za-gauteng" } },
    ]).selectedWardId,
    null,
  );
  assert.throws(() =>
    validateActions([{ type: "SELECT_WARD", payload: { id: ward.id } }], "BW"),
  );
  assert.throws(() =>
    validateActions([
      { type: "SELECT_WARD", payload: { id: "ward-invented" } },
    ]),
  );
  assert.equal(wardById("ward-invented"), undefined);
});
