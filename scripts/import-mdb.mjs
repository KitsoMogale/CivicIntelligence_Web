// Reproduce the reviewed MDB2026 export from the archived, verified source downloads.
// Usage: node scripts/import-mdb.mjs .research/map-accuracy
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const input = path.resolve(process.argv[2] || ".research/map-accuracy");
const read = (name) =>
  JSON.parse(fs.readFileSync(path.join(input, name), "utf8"));
const legacy = JSON.parse(
    fs.readFileSync("data/municipal-geography.json", "utf8"),
  ),
  byCode = new Map(legacy.map((m) => [m.municipalityCode, m]));
const assets = [],
  municipalities = new Map(),
  wards = [],
  wardFiles = new Map(),
  rawInputs = [];
const municipalSource = "mdb-municipalities-2026",
  wardSource = "mdb-wards-2026";
const repairs = JSON.parse(
  fs.readFileSync("data/provenance/mdb-geometry-repairs.json", "utf8"),
);
const geometryHash = (geometry) =>
  createHash("sha256").update(JSON.stringify(geometry)).digest("hex");
async function hash(file) {
  const h = createHash("sha256");
  for await (const chunk of fs.createReadStream(file)) h.update(chunk);
  return h.digest("hex");
}
async function* features(filename) {
  let prefix = "",
    started = false,
    depth = 0,
    inString = false,
    escaped = false,
    parts = [];
  for await (const buffer of fs.createReadStream(filename, {
    encoding: "utf8",
  })) {
    let text = buffer;
    if (!started) {
      prefix += text;
      const match = /"features"\s*:\s*\[/.exec(prefix);
      if (!match) continue;
      text = prefix.slice(match.index + match[0].length);
      prefix = "";
      started = true;
    }
    let start = depth ? 0 : -1;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (!depth) {
        if (c === "]") return;
        if (c !== "{") continue;
        depth = 1;
        start = i;
        continue;
      }
      if (inString) {
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') {
        inString = true;
        continue;
      }
      if (c === "{") depth++;
      if (c === "}") depth--;
      if (depth === 0) {
        parts.push(text.slice(start, i + 1));
        yield JSON.parse(parts.join(""));
        parts = [];
        start = -1;
      }
    }
    if (depth) parts.push(text.slice(start));
  }
  assert.equal(depth, 0, "Truncated source geometry");
}
function extent(geometry) {
  assert.ok(["Polygon", "MultiPolygon"].includes(geometry.type));
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  for (const polygon of polygons)
    for (const ring of polygon) {
      assert.ok(ring.length >= 4);
      assert.deepEqual(ring[0], ring.at(-1));
      for (const p of ring) {
        assert.ok(
          Number.isFinite(p[0]) &&
            Number.isFinite(p[1]) &&
            p[0] >= 15 &&
            p[0] <= 34 &&
            p[1] >= -36 &&
            p[1] <= -21,
        );
        bounds[0] = Math.min(bounds[0], p[0]);
        bounds[1] = Math.min(bounds[1], p[1]);
        bounds[2] = Math.max(bounds[2], p[0]);
        bounds[3] = Math.max(bounds[3], p[1]);
      }
    }
  // A point inside the polygon is used only for navigation, never as a facility coordinate.
  let center = null,
    best = 0;
  for (const polygon of polygons) {
    const outer = polygon[0];
    let low = Infinity,
      high = -Infinity;
    for (const p of outer) {
      low = Math.min(low, p[1]);
      high = Math.max(high, p[1]);
    }
    const y = (low + high) / 2,
      xs = [];
    for (const ring of polygon)
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[j],
          b = ring[i];
        if (a[1] > y !== b[1] > y)
          xs.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2)
      if (xs[i + 1] - xs[i] > best) {
        best = xs[i + 1] - xs[i];
        center = [(xs[i] + xs[i + 1]) / 2, y];
      }
  }
  assert.ok(center, "No interior navigation point found");
  return { bounds, center };
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value) + "\n");
}
async function source(kind, rawFile, expected) {
  const metadata = read(kind + "-download.json"),
    file = path.join(input, rawFile);
  assert.equal(metadata.featureCount, expected);
  assert.equal(await hash(file), metadata.sha256);
  rawInputs.push(metadata);
  return file;
}
for (const [level, kind, count] of [
  ["district", "district", 52],
  ["local", "local", 213],
]) {
  const file = await source(kind, "mdb-" + kind + "-2026.raw.geojson", count);
  let total = 0;
  for await (const feature of features(file)) {
    const p = feature.properties,
      code = level === "local" ? p.CAT_B : p.DISTRICT,
      old = byCode.get(code);
    assert.ok(old, "Unknown municipality " + code);
    assert.equal(old.category, p.CATEGORY);
    const spatial = extent(feature.geometry),
      record = {
        ...old,
        ...spatial,
        sourceName: p.MUNICNAME ?? p.DISTRICT_N,
        adminLevel: level === "local" ? 3 : 2,
        boundaryVintage: "2026",
        sourceIds: [municipalSource],
      };
    municipalities.set(old.entityId, record);
    feature.properties = {
      ...p,
      ...record,
      id: old.entityId,
      sourceDate: "2026-11-04",
    };
    const target = "za-municipalities-2026/" + level + "/" + code + ".geojson";
    writeJson("public/data/" + target, {
      type: "FeatureCollection",
      features: [feature],
    });
    assets.push({
      file: target,
      kind: "municipality",
      edition: "mdb-2026",
      level,
      municipalityId: old.entityId,
      features: 1,
      sha256: await hash("public/data/" + target),
    });
    total++;
  }
  assert.equal(total, count);
}
const wardFile = await source(
    "wardsCurrent",
    "mdb-wardsCurrent-2026.raw.geojson",
    4485,
  ),
  seen = new Set();
for await (const feature of features(wardFile)) {
  const p = feature.properties,
    municipality = byCode.get(p.CAT_B),
    number = Number(p.WardNo),
    id = "ward-" + String(p.WardID);
  assert.ok(municipality && municipality.category !== "C");
  assert.ok(Number.isInteger(number) && number > 0);
  assert.ok(!seen.has(id));
  seen.add(id);
  const repair = repairs.find((r) => r.wardId === id);
  if (repair) {
    assert.equal(
      geometryHash(feature.geometry),
      repair.originalGeometrySha256,
      "Publisher geometry changed; review repair again",
    );
    writeJson("public" + repair.originalGeometryFile, {
      type: "FeatureCollection",
      features: [feature],
    });
    assert.equal(
      await hash("public" + repair.originalGeometryFile),
      repair.originalFileSha256,
    );
    assert.equal(
      geometryHash(repair.repairedGeometry),
      repair.repairedGeometrySha256,
    );
    feature.geometry = repair.repairedGeometry;
  }
  const record = {
    id,
    number,
    municipalityId: municipality.entityId,
    municipalityCode: p.CAT_B,
    provinceId: municipality.region,
    ...extent(feature.geometry),
    sourceId: wardSource,
    ...(repair
      ? {
          geometryNote: repair.note,
          originalGeometryFile: repair.originalGeometryFile,
        }
      : {}),
  };
  wards.push(record);
  feature.properties = {
    ...p,
    wardId: id,
    number,
    municipalityId: record.municipalityId,
    provinceId: record.provinceId,
    sourceId: wardSource,
    edition: "mdb-2026",
    sourceDate: "2026-11-04",
    ...(repair
      ? {
          geometryNote: repair.note,
          originalGeometryFile: repair.originalGeometryFile,
        }
      : {}),
  };
  const target = "za-wards-2026/" + p.CAT_B + ".geojson",
    file = "public/data/" + target;
  if (!wardFiles.has(target)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '{"type":"FeatureCollection","features":[');
    wardFiles.set(target, { count: 0, municipalityId: record.municipalityId });
  }
  const status = wardFiles.get(target);
  fs.appendFileSync(file, (status.count ? "," : "") + JSON.stringify(feature));
  status.count++;
}
assert.equal(wards.length, 4485);
assert.equal(wardFiles.size, 213);
assert.equal(municipalities.size, 257);
for (const [target, status] of wardFiles) {
  const file = "public/data/" + target;
  fs.appendFileSync(file, "]}\n");
  assets.push({
    file: target,
    kind: "ward",
    edition: "mdb-2026",
    municipalityId: status.municipalityId,
    features: status.count,
    sha256: await hash(file),
  });
}
wards.sort(
  (a, b) =>
    a.municipalityCode.localeCompare(b.municipalityCode) || a.number - b.number,
);
writeJson(
  "data/municipal-geography-2026.json",
  [...municipalities.values()].sort((a, b) =>
    a.entityId.localeCompare(b.entityId),
  ),
);
writeJson("data/ward-index.json", wards);
writeJson("data/boundary-assets.json", assets);
const provenance = read("official-boundary-provenance.json");
provenance.sourceDate = provenance.effectiveDate;
delete provenance.effectiveDate;
provenance.sourceDateMeaning =
  "Publisher DATE/DATE_/DATE_EFFEC attribute, not a verified publication date or legal certification";
provenance.transformation =
  "ArcGIS WGS84 export, split by municipality. Full source attributes and unique coordinate pairs retained. One documented ST_MakeValid ring repair for Ward 52308005; original feature retained separately. No simplification.";
provenance.geometryProcessing =
  "Full publisher coordinates retained. One self-intersecting ward was repaired using ST_MakeValid without changing its unique coordinate pairs or measured geodesic area; original retained. See mdb-geometry-repairs.json.";
writeJson("data/provenance/mdb-2026.json", provenance);
writeJson("data/boundary-release.json", {
  edition: "mdb-2026",
  reviewedAt: "2026-11-13",
  sourceDate: "2026-11-04",
  sourceDateMeaning:
    "Publisher DATE/DATE_/DATE_EFFEC attribute; not the retrieval timestamp",
  counts: {
    local: 213,
    district: 52,
    municipalities: 257,
    wards: 4485,
    wardMunicipalities: 213,
  },
  rawInputs,
  transformation:
    "Civic Intelligence GeoJSON export, split by municipality. Publisher attributes and unique coordinate pairs are preserved. One self-intersecting ward (52308005) uses a documented ST_MakeValid ring repair with unchanged measured geodesic area; its original is retained. Interior navigation points and bounds are derived. No simplification, interpolation, smoothing or invented ward numbers.",
  geometryRepairs: "provenance/mdb-geometry-repairs.json",
  revisionNote:
    "The revised September ward release reflects the stayed Kopanong split. The May 4488-ward edition is retained only as research evidence and is not used as the current map.",
  sourceIds: [municipalSource, wardSource],
});
console.log(
  "PASS official MDB export: 257 municipalities, 4485 wards, 478 individually hashed assets; one documented topology repair",
);
