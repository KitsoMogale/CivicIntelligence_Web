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
const bundle = await read(proposal ?? "data/knowledge.json");
const result = inspectBundle(bundle);
const errors = result.issues.filter((issue) => issue.severity === "error");
const warnings = result.issues.filter((issue) => issue.severity === "warning");
const regions = await read("data/regions.json");
const countries = await read("data/countries.json");
const regionIds = new Set(regions.map((r: { id: string }) => r.id));
const countryIds = new Set(countries.map((c: { code: string }) => c.code));
const refs = new Set(result.bundle?.sources.map((s) => s.id));
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
    JSON.stringify(result.bundle, null, 2) + "\n",
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
    reviewedAt: "2026-11-13",
    counts: {
      ...result.counts,
      regions: regions.length,
      indicators: indicators.indicators.length,
      events: events.length,
      municipalities: municipal.length,
      provincialIndicators: provincial.metrics.length,
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
