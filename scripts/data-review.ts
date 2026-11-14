import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { inspectBundle } from "../lib/data-quality";
const args = process.argv.slice(2);
const root = process.cwd();
const read = async (name: string) =>
  JSON.parse(
    (await fs.readFile(path.resolve(root, name), "utf8")).replace(
      /^\uFEFF/,
      "",
    ),
  );
const option = (name: string) => {
  const index = args.indexOf(name);
  return index < 0 ? null : args[index + 1];
};
const proposal = option("--proposal") ?? option("--apply");
const baseBundle = await read(proposal ?? "data/knowledge.json");
const worldBundle = await read("data/world-catalog.json");
const bundle = Object.fromEntries(
  Object.entries(baseBundle).map(([key, rows]) => [
    key,
    [...(rows as unknown[]), ...(worldBundle[key] ?? [])],
  ]),
);
const result = inspectBundle(bundle);
const errors = result.issues.filter((issue) => issue.severity === "error");
const warnings = result.issues.filter((issue) => issue.severity === "warning");
const regions = [
  ...(await read("data/regions.json")),
  ...(await read("data/world-regions.json")),
];
const countries = await read("data/countries.json");
const regionIds = new Set(regions.map((r: { id: string }) => r.id));
const countryIds = new Set(countries.map((c: { code: string }) => c.code));
const officialMunicipal = await read("data/municipal-geography-2026.json"),
  wards = await read("data/ward-index.json"),
  boundaryAssets = await read("data/boundary-assets.json"),
  boundaryRelease = await read("data/boundary-release.json");
const refs = new Set(result.bundle?.sources.map((s) => s.id));
const repairs = await read("data/provenance/mdb-geometry-repairs.json");
for (const repair of repairs) {
  const bytes = await fs.readFile(
    path.join(root, "public", repair.originalGeometryFile),
  );
  if (
    createHash("sha256").update(bytes).digest("hex") !==
    repair.originalFileSha256
  )
    errors.push({
      severity: "error",
      record: repair.wardId,
      message: "Retained original geometry digest differs",
    });
  if (repair.originalAreaM2 !== repair.repairedAreaM2)
    errors.push({
      severity: "error",
      record: repair.wardId,
      message: "Repair changes measured area",
    });
}
const entityIds = new Set(result.bundle?.entities.map((e) => e.id));
function fail(record: string, message: string) {
  errors.push({ severity: "error", record, message });
}
for (const entity of result.bundle?.entities ?? []) {
  if (entity.region && !regionIds.has(entity.region))
    fail(entity.id, "Unknown province/region");
  if (!countryIds.has(entity.country))
    fail(entity.id, "Unknown mapped country");
}
const indicators = await read("data/indicators.json");
for (const indicator of indicators.indicators) {
  if (
    !indicator.sourceIds.length ||
    !indicator.sourceIds.every((id: string) => refs.has(id))
  )
    fail(indicator.code, "Unknown statistical source");
  const seen = new Set();
  for (const observation of indicator.observations) {
    const key = observation.country + "-" + observation.year;
    if (seen.has(key))
      fail(indicator.code, "Duplicate country/year observation");
    seen.add(key);
    if (
      !countryIds.has(observation.country) ||
      !Number.isInteger(observation.year) ||
      observation.year < 1960 ||
      observation.year > 2100 ||
      (observation.value !== null && !Number.isFinite(observation.value))
    )
      fail(indicator.code, "Invalid country/year/value");
  }
}
const events = await read("data/events.json");
for (const event of events) {
  if (!/^\d{4}(-\d{2}-\d{2})?$/.test(event.date))
    fail(event.id, "Invalid event date");
  if (
    !event.sourceIds.length ||
    !event.sourceIds.every((id: string) => refs.has(id))
  )
    fail(event.id, "Unknown event source");
  if (!event.entityIds.every((id: string) => entityIds.has(id)))
    fail(event.id, "Unknown event entity");
}
const boundaries = await read("public/data/za-provinces.geojson");
const provincial = await read("data/provincial-indicators.json"),
  municipal = await read("data/municipal-geography.json"),
  assets = await read("data/geography-assets.json");
if (
  municipal.length !== 257 ||
  new Set(municipal.map((m: { entityId: string }) => m.entityId)).size !== 257
)
  fail("municipalities", "Expected257unique municipality code joins");
for (const m of municipal) {
  if (
    !entityIds.has(m.entityId) ||
    !regionIds.has(m.region) ||
    m.bounds.length !== 4 ||
    m.center.length !== 2 ||
    ![...m.bounds, ...m.center].every(Number.isFinite)
  )
    fail(m.entityId, "Invalid municipal geography join or bounds");
}
for (const asset of assets) {
  const bytes = await fs.readFile(path.join(root, "public/data", asset.file));
  if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256)
    fail(asset.file, "Geography asset digest mismatch");
  const geo = JSON.parse(bytes.toString());
  if (geo.features.length !== asset.features)
    fail(asset.file, "Boundary feature count mismatch");
  for (const f of geo.features)
    if (!entityIds.has(f.properties.entityId))
      fail(asset.file, "Boundary references unknown municipality");
}
const officialIds = new Map(
    officialMunicipal.map((m: { entityId: string }) => [m.entityId, m]),
  ),
  wardIds = new Map(wards.map((w: { id: string }) => [w.id, w]));
if (officialIds.size !== 257 || wardIds.size !== 4485)
  fail("mdb-2026", "Unexpected reviewed municipality or ward count");
const seenWards = new Set<string>();
let wardFeatures = 0,
  municipalFeatures = 0;
for (const asset of boundaryAssets) {
  if (
    !/^za-(municipalities|wards)-2026\/[A-Za-z0-9/.-]+\.geojson$/.test(
      asset.file,
    )
  ) {
    fail(asset.file, "Unsafe boundary asset path");
    continue;
  }
  const bytes = await fs.readFile(path.join(root, "public/data", asset.file));
  if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256)
    fail(asset.file, "Official geometry digest mismatch");
  const collection = JSON.parse(bytes.toString());
  if (collection.features.length !== asset.features)
    fail(asset.file, "Official geometry feature count mismatch");
  for (const feature of collection.features) {
    const p = feature.properties;
    if (asset.kind === "ward") {
      wardFeatures++;
      const record = wardIds.get(p.wardId) as
        | { municipalityId: string; municipalityCode: string; number: number }
        | undefined;
      if (
        !record ||
        seenWards.has(p.wardId) ||
        record.municipalityId !== p.municipalityId ||
        record.municipalityCode !== p.CAT_B ||
        record.number !== p.WardNo ||
        !officialIds.has(p.municipalityId)
      )
        fail(asset.file, "Ward identity or parent join mismatch");
      seenWards.add(p.wardId);
    } else {
      municipalFeatures++;
      if (
        !officialIds.has(p.entityId) ||
        !entityIds.has(p.entityId) ||
        p.boundaryVintage !== "2026"
      )
        fail(asset.file, "Official municipality join mismatch");
    }
    if (!["Polygon", "MultiPolygon"].includes(feature.geometry?.type))
      fail(asset.file, "Expected polygon geometry");
  }
}
if (
  wardFeatures !== 4485 ||
  municipalFeatures !== 265 ||
  seenWards.size !== 4485
)
  fail("mdb-2026", "Incomplete reviewed geometry coverage");
if (
  boundaryRelease.counts.wards !== 4485 ||
  boundaryRelease.counts.municipalities !== 257
)
  fail("mdb-2026", "Boundary release counts differ");
for (const w of wards)
  if (
    !refs.has(w.sourceId) ||
    !regionIds.has(w.provinceId) ||
    !officialIds.has(w.municipalityId)
  )
    fail(w.id, "Unknown ward source, province or municipality");
const metricIds = new Set();
for (const metric of provincial.metrics) {
  if (metricIds.has(metric.id)) fail(metric.id, "Duplicate provincial metric");
  metricIds.add(metric.id);
  if (
    metric.startDate > metric.endDate ||
    !metric.sourceIds.every((id: string) => refs.has(id))
  )
    fail(metric.id, "Invalid period or unknown source");
  const observed = new Set();
  for (const o of metric.observations) {
    if (
      !regionIds.has(o.regionId) ||
      observed.has(o.regionId) ||
      (o.value !== null && !Number.isFinite(o.value))
    )
      fail(metric.id, "Invalid province observation");
    observed.add(o.regionId);
    if (
      o.numerator !== undefined &&
      (!(o.denominator > 0) ||
        Math.round((o.numerator / o.denominator) * 1000) / 10 !== o.value)
    )
      fail(metric.id, "Derived percentage differs from published counts");
  }
  if (observed.size !== 9)
    fail(
      metric.id,
      "Province coverage must explicitly include all9regions, using null for unavailable values",
    );
}
if (boundaries.features.length !== 9)
  fail("province-boundaries", "Expected nine source province geometries");
for (const feature of boundaries.features) {
  if (!regionIds.has(feature.properties.id))
    fail("province-boundaries", "Unknown geometry region");
}
const profiles = await read("data/country-profiles.json"),
  worldAssets = await read("data/world-assets.json");
const profilesByCode = new Map(
  profiles.map((p: { code: string }) => [p.code, p]),
);
if (
  profiles.length !== countries.length ||
  profilesByCode.size !== countries.length
)
  fail("world", "Country profiles do not match registry");
const seenAreas = new Set<string>();
for (const asset of worldAssets) {
  if (!/^(countries\.geojson|world\/[A-Z]{2}\.geojson)$/.test(asset.file)) {
    fail(asset.file, "Unsafe world asset path");
    continue;
  }
  const bytes = await fs.readFile(path.join(root, "public/data", asset.file));
  if (
    bytes.length !== asset.bytes ||
    createHash("sha256").update(bytes).digest("hex") !== asset.sha256
  )
    fail(asset.file, "World asset digest mismatch");
  const geo = JSON.parse(bytes.toString());
  if (geo.features.length !== asset.features || !refs.has(asset.sourceId))
    fail(asset.file, "World asset count/source mismatch");
  for (const f of geo.features) {
    if (!["Polygon", "MultiPolygon"].includes(f.geometry?.type))
      fail(asset.file, "Expected world polygon");
    if (asset.country) {
      const id = f.properties.entityId;
      if (
        !entityIds.has(id) ||
        !regionIds.has(id) ||
        seenAreas.has(id) ||
        f.properties.countryCode !== asset.country
      )
        fail(asset.file, "Invalid world area identity");
      seenAreas.add(id);
    }
  }
}
for (const profile of profiles) {
  if (
    !countryIds.has(profile.code) ||
    !entityIds.has(profile.root) ||
    !profile.sourceIds.every((id: string) => refs.has(id))
  )
    fail(profile.code, "Invalid country profile join");
  const areaCount = regions.filter(
    (r: { country: string }) => r.country === profile.code,
  ).length;
  if (profile.code !== "ZA" && areaCount !== profile.boundary.count)
    fail(profile.code, "Profile boundary count differs");
}
if (seenAreas.size !== regions.length - 9)
  fail("world", "Reference area geometry incomplete");
const downloads = await read("data/provenance/world-downloads.json");
for (const item of downloads.snapshots) {
  const bytes = await fs.readFile(
    path.join(root, "data/provenance/world-inputs", item.file),
  );
  if (
    bytes.length !== item.bytes ||
    createHash("sha256").update(bytes).digest("hex") !== item.sha256
  )
    fail(item.file, "World snapshot digest mismatch");
}
for (const issue of [...errors, ...warnings])
  console.log(
    issue.severity.toUpperCase() + " " + issue.record + ": " + issue.message,
  );
if (errors.length) {
  console.error(errors.length + " data validation errors");
  process.exit(1);
}
console.log(
  "PASS catalog references, coordinates, ownership dates, comparison observations, timeline records and province joins",
  result.counts,
);
if (args.includes("--apply")) {
  if (!proposal) throw new Error("Supply a reviewed proposal path");
  const existing = await read("data/knowledge.json");
  const removed = existing.entities.filter(
    (e: { id: string }) => !entityIds.has(e.id),
  );
  if (removed.length && !args.includes("--allow-removals"))
    throw new Error(
      "Proposal removes " +
        removed.length +
        " entities. Review the deletion list and explicitly pass --allow-removals.",
    );
  await fs.mkdir(path.join(root, ".data-backups"), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await fs.copyFile(
    path.join(root, "data/knowledge.json"),
    path.join(root, ".data-backups/knowledge-" + stamp + ".json"),
  );
  const target = path.join(root, "data/knowledge.json");
  await fs.writeFile(
    target + ".pending",
    JSON.stringify(inspectBundle(baseBundle).bundle, null, 2) + "\n",
  );
  await fs.rename(target + ".pending", target);
  console.log(
    "Applied validated proposal locally; previous bundle saved in .data-backups. Rebuild and apply the same release to the database before deployment.",
  );
}
{
  const digest = createHash("sha256");
  const files = [
    "knowledge.json",
    "regions.json",
    "indicators.json",
    "events.json",
    "provincial-indicators.json",
    "municipal-geography.json",
    "geography-assets.json",
    "boundary-assets.json",
    "boundary-release.json",
    "municipal-geography-2026.json",
    "ward-index.json",
    "provenance/mdb-geometry-repairs.json",
    "countries.json",
    "world-catalog.json",
    "world-regions.json",
    "country-profiles.json",
    "curated-country-profiles.json",
    "world-source-audit.json",
    "world-assets.json",
    "provenance/world-source-metadata.json",
    "provenance/world-downloads.json",
    ...downloads.snapshots.map(
      (s: { file: string }) => "provenance/world-inputs/" + s.file,
    ),
  ].sort();
  for (const name of files) {
    digest.update(name);
    digest.update(Buffer.from([0]));
    digest.update(await fs.readFile(path.join(root, "data", name)));
    digest.update(Buffer.from([0]));
  }
  const revision = digest.digest("hex");
  const release = {
    version: "0.2.0",
    revision,
    reviewedAt: "2026-11-14",
    counts: {
      ...result.counts,
      regions: regions.length,
      indicators: indicators.indicators.length,
      events: events.length,
      municipalities: municipal.length,
      provincialIndicators: provincial.metrics.length,
      wards: wards.length,
      officialMunicipalities: officialMunicipal.length,
    },
    files,
  };
  if (args.includes("--release") || args.includes("--apply")) {
    await fs.writeFile(
      path.join(root, "data/release.json"),
      JSON.stringify(release, null, 2) + "\n",
    );
    console.log("Recorded catalog release " + revision);
  } else if (!proposal) {
    const recorded = await read("data/release.json");
    if (recorded.revision !== revision)
      throw new Error(
        "Catalog release manifest is stale. Review data changes, then run npm run data:release.",
      );
    console.log("PASS catalog release digest " + revision);
  }
}
