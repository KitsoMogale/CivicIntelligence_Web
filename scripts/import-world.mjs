// Reproduce the reviewed world reference batch from cached, checksummed inputs.
// Download instructions and the distinction between reference and official data
// are documented in docs/world-coverage.md. This script makes no tile requests.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const input = process.argv[2] ?? ".research/world";
const retrievedAt = "2026-11-14";
const read = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
const write = async (file, value, pretty = true) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const bytes = JSON.stringify(value, null, pretty ? 2 : undefined) + "\n";
  await fs.writeFile(file, bytes);
  return { bytes: Buffer.byteLength(bytes), sha256: digest(bytes) };
};
const digest = (value) => createHash("sha256").update(value).digest("hex");
const valid2 = (code) => /^[A-Z]{2}$/.test(code ?? "");
const codeOf = (p) =>
  valid2(p.ISO_A2_EH) ? p.ISO_A2_EH : valid2(p.ISO_A2) ? p.ISO_A2 : null;
const priorCountries = await read("data/countries.json");
const admin0 = await read(path.join(input, "admin0.geojson"));
const admin1 = await read(path.join(input, "admin1.geojson"));
const metadata = await read(path.join(input, "gb-metadata.json"));
const curated = await read("data/curated-country-profiles.json");
const audit = await read("data/world-source-audit.json");
const source0 = await read(path.join(input, "admin0.json"));
const source1 = await read(path.join(input, "admin1.json"));
for (const [file, info] of [
  ["admin0.geojson", source0],
  ["admin1.geojson", source1],
]) {
  if (digest(await fs.readFile(path.join(input, file))) !== info.sha256)
    throw new Error("Changed source: " + file);
}
function boundsOf(geometry) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  function walk(c) {
    if (typeof c[0] === "number") {
      if (
        !Number.isFinite(c[0]) ||
        !Number.isFinite(c[1]) ||
        Math.abs(c[0]) > 180.001 ||
        Math.abs(c[1]) > 90.001
      )
        throw new Error("Invalid geographic coordinate");
      b[0] = Math.min(b[0], c[0]);
      b[1] = Math.min(b[1], c[1]);
      b[2] = Math.max(b[2], c[0]);
      b[3] = Math.max(b[3], c[1]);
    } else for (const child of c) walk(child);
  }
  if (!["Polygon", "MultiPolygon"].includes(geometry?.type))
    throw new Error("Expected polygon geometry");
  walk(geometry.coordinates);
  if (!b.every(Number.isFinite)) throw new Error("Empty geometry");
  return b;
}
function locator(geometry) {
  const polygons =
    geometry.type === "MultiPolygon"
      ? geometry.coordinates
      : [geometry.coordinates];
  const polygon = [...polygons].sort((a, b) => b[0].length - a[0].length)[0];
  const b = boundsOf({ type: "Polygon", coordinates: polygon });
  return {
    center: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2],
    zoom: Math.min(
      8,
      Math.max(
        1.5,
        Math.log2(300 / Math.max(b[2] - b[0], (b[3] - b[1]) * 1.5, 0.01)),
      ),
    ),
  };
}
const grouped = new Map();
for (const f of admin0.features) {
  const code = codeOf(f.properties);
  if (code) grouped.set(code, [...(grouped.get(code) ?? []), f]);
}
const countryRows = [...grouped]
  .map(([code, features]) => {
    const main = [...features].sort(
      (a, b) =>
        a.properties.SCALERANK - b.properties.SCALERANK ||
        a.properties.LABELRANK - b.properties.LABELRANK,
    )[0];
    const p = main.properties,
      previous = priorCountries.find((c) => c.code === code);
    return {
      code,
      name: p.NAME_EN || p.NAME,
      continent: p.CONTINENT,
      ...locator(main.geometry),
      ...(previous ? { center: previous.center, zoom: previous.zoom } : {}),
      iso3: p.ISO_A3_EH || p.ISO_A3 || p.ADM0_A3,
      status: p.TYPE,
      sovereignty: p.SOVEREIGNT,
      providerId: p.ADM0_A3,
    };
  })
  .sort((a, b) => a.code.localeCompare(b.code));
if (countryRows.length !== 237)
  throw new Error("Unexpected reviewed country/area count");
const sources = [
  ...curated.sources,
  {
    id: "world-natural-earth-countries",
    title: "Natural Earth 50m country/area reference, release 5.1.2",
    publisher: "Natural Earth",
    url: "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/",
    publishedAt: "2022-05-13",
    retrievedAt,
    license: "Public domain",
    note: "Cartographic reference, de facto worldview; dependencies and disputed areas retain publisher identifiers. Not a legal determination.",
  },
  {
    id: "world-natural-earth-divisions",
    title: "Natural Earth administrative reference, release 5.1.2",
    publisher: "Natural Earth",
    url: "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/",
    publishedAt: "2022-05-13",
    retrievedAt,
    license: "Public domain",
    note: "Fallback publisher reference areas only. Administrative depths and dates vary; classifications are not a verified current government hierarchy.",
  },
];
const entities = [],
  relationships = [],
  regions = [],
  profiles = [],
  assets = [],
  usedMetadata = [];
const entityIds = new Set();
function entity(record) {
  if (entityIds.has(record.id))
    throw new Error("Duplicate entity " + record.id);
  entityIds.add(record.id);
  entities.push(record);
}
function link(source, target, type, sourceIds, description) {
  relationships.push({
    id: source + "--" + target + "--" + type.toLowerCase(),
    source,
    target,
    type,
    sourceIds,
    description,
  });
}
for (const country of countryRows) {
  const { code } = country,
    prefix = code.toLowerCase(),
    spec = curated.profiles[code];
  let boundary = {
    kind: "country-only",
    year: "2022",
    count: 0,
    file: null,
    sourceId: "world-natural-earth-countries",
    divisionLabel: "Reference areas",
  };
  const iso3 = code === "XK" ? "XKX" : country.iso3;
  let m = metadata.find((row) => row.boundaryISO === iso3);
  if (audit.excludedGbOpen[iso3]) m = undefined;
  if (code === "NA")
    m = await read(path.join(input, "namibia-humanitarian.json"));
  let geo;
  if (code === "ZA")
    boundary = {
      kind: "country-specific",
      year: "2020 / MDB 2026",
      count: 9,
      file: "/data/za-provinces.geojson",
      sourceId: "province-boundaries",
      divisionLabel: "Provinces",
    };
  else if (m) {
    const file = path.join(
      input,
      code === "NA"
        ? "namibia-humanitarian.geojson"
        : "gb-" + iso3 + ".geojson",
    );
    const original = await fs.readFile(file);
    const info = code === "NA" ? m.download : await read(file + ".meta.json");
    if (
      info.sha256 !== digest(original) ||
      info.url !== m.simplifiedGeometryGeoJSON
    )
      throw new Error("Unreviewed source " + iso3);
    geo = JSON.parse(original);
    const sourceId = "world-gb-" + prefix + "-adm1";
    const note =
      code === "NA"
        ? audit.namibia.yearNote
        : (audit.countOverrides[iso3]?.note ?? "");
    sources.push({
      id: sourceId,
      title: `${country.name} ADM1 reference boundaries (${m.boundaryYearRepresented})`,
      publisher: "geoBoundaries / " + m.boundarySource,
      url: `https://www.geoboundaries.org/api/current/${code === "NA" ? "gbHumanitarian" : "gbOpen"}/${iso3}/ADM1/`,
      retrievedAt,
      license: m.boundaryLicense,
      note: `Publisher-simplified reference geometry. Source year ${m.boundaryYearRepresented}; canonical label ${m.boundaryCanonical}. Original licence: ${m.licenseSource}. Dataset ${m.boundaryID}; build ${m.buildDate}. No current legal boundary claim. ${note}`.slice(
        0,
        3000,
      ),
    });
    const canonical = m.boundaryCanonical;
    boundary = {
      kind: code === "NA" ? "gbHumanitarian-ADM1" : "gbOpen-ADM1",
      year: String(m.boundaryYearRepresented),
      count: geo.features.length,
      file: `/data/world/${code}.geojson`,
      sourceId,
      divisionLabel:
        code === "NA"
          ? "Regions"
          : canonical && canonical !== "Unknown"
            ? canonical
            : "Administrative areas",
      ...(note ? { note } : {}),
    };
    usedMetadata.push({ ...m, countryCode: code, download: info });
    if (
      geo.features.length !== Number(m.admUnitCount) &&
      geo.features.length !== audit.countOverrides[iso3]?.geometryCount
    )
      throw new Error("Publisher count mismatch " + code);
    if (code === "NA") {
      const names = geo.features
        .map(
          (f) =>
            audit.namibia.aliases[f.properties.shapeName] ??
            f.properties.shapeName,
        )
        .sort();
      if (
        JSON.stringify(names) !==
        JSON.stringify([...audit.namibia.verifiedNames].sort())
      )
        throw new Error("Namibia roster differs from reviewed official names");
    }
  } else {
    const features = admin1.features.filter(
      (f) => f.properties.iso_a2 === code,
    );
    if (features.length > 1) {
      geo = { type: "FeatureCollection", features };
      boundary = {
        ...boundary,
        kind: "publisher-reference",
        count: features.length,
        file: `/data/world/${code}.geojson`,
        sourceId: "world-natural-earth-divisions",
        note:
          audit.excludedGbOpen[iso3] ??
          "Publisher reference classifications; administrative depth and underlying vintage may differ from today's structure.",
      };
    }
  }
  const root = prefix + "-government",
    areaGroup = prefix + "-reference-areas";
  if (code !== "ZA") {
    entity({
      id: root,
      name: country.name + " · civic profile",
      type: "Country / area profile",
      country: code,
      domain: "government",
      description:
        spec?.summary ??
        "Dated administrative reference geography. Current institutions and government structures have not yet been independently curated for this country or area.",
      sourceIds: spec?.sourceIds ?? [boundary.sourceId],
      updatedAt: retrievedAt,
    });
    if (geo) {
      entity({
        id: areaGroup,
        name: boundary.divisionLabel + " · " + boundary.year + " reference",
        type: "Geographic directory",
        country: code,
        domain: "government",
        description:
          "Publisher reference geography; directory connections express geographic grouping, not government authority or a chain of command.",
        sourceIds: [boundary.sourceId],
        updatedAt: retrievedAt,
      });
      link(
        root,
        areaGroup,
        "INCLUDES",
        [boundary.sourceId],
        "Reference-geography navigation group; not a government reporting line.",
      );
      for (const f of geo.features) {
        const p = f.properties ?? {},
          rawId = String(p.shapeID ?? p.adm1_code ?? p.ne_id ?? "");
        if (!rawId) throw new Error("Absent publisher ID " + code);
        const publishedName =
          p.shapeName ||
          p.name_en ||
          p.name ||
          "Unnamed publisher area · " + rawId;
        const id = prefix + "-area-" + digest(rawId).slice(0, 16),
          name =
            code === "NA"
              ? (audit.namibia.aliases[publishedName] ?? publishedName)
              : publishedName,
          bounds = boundsOf(f.geometry);
        const region = {
          id,
          entityId: id,
          country: code,
          name,
          center: locator(f.geometry).center,
          bounds,
          sourceIds: [boundary.sourceId],
          sourceCode: rawId,
          boundaryYear: boundary.year,
        };
        regions.push(region);
        entity({
          id,
          name,
          type: "Administrative reference area",
          country: code,
          domain: "government",
          region: id,
          description: `${name} is a publisher reference area in ${country.name}. Source year/edition: ${boundary.year}. The map does not infer current legal powers, electoral wards or statistical values from this polygon.`,
          sourceIds: region.sourceIds,
          updatedAt: retrievedAt,
          attributes: {
            "Boundary source year": boundary.year,
            "Publisher identifier": rawId,
            Coverage: "Dated reference geometry",
          },
        });
        link(
          areaGroup,
          id,
          "INCLUDES",
          region.sourceIds,
          "Reference geographic grouping; not a governance relationship.",
        );
        f.properties = {
          ...p,
          entityId: id,
          countryCode: code,
          referenceYear: boundary.year,
        };
      }
      const output = await write("public" + boundary.file, geo, false);
      assets.push({
        country: code,
        file: boundary.file.replace("/data/", ""),
        features: geo.features.length,
        sourceId: boundary.sourceId,
        ...output,
      });
    }
    for (const institution of spec?.institutions ?? []) {
      entity({
        ...institution,
        country: code,
        domain: "government",
        updatedAt: retrievedAt,
      });
      link(
        root,
        institution.id,
        "INCLUDES",
        institution.sourceIds,
        "Country institutional directory entry; not a claim that the profile exercises authority.",
      );
    }
  }
  profiles.push({
    code,
    root: code === "ZA" ? "za-government" : root,
    domainRoots:
      code === "ZA"
        ? {
            government: "za-government",
            economy: "za-economy",
            industry: "za-mining",
            infrastructure: "za-infrastructure",
            law: "za-justice",
            society: "za-society",
          }
        : { government: root },
    modes:
      code === "ZA"
        ? [
            "geographic",
            "hierarchy",
            "relationships",
            "flow",
            "data",
            "compare",
            "timeline",
          ]
        : ["geographic", "hierarchy", "relationships", "compare", "timeline"],
    defaultExpanded: code === "ZA" ? ["za-government", "za-national"] : [root],
    defaultSplitMode: code === "ZA" ? "relationships" : "compare",
    institutions:
      code === "ZA" ? "curated" : spec ? "initial-curated" : "not-curated",
    institutionCount: spec?.institutions.length ?? 0,
    summary:
      spec?.summary ??
      "Administrative reference coverage. National institutions, lower administrative levels and electoral divisions still require country-specific verification.",
    schemes: spec?.schemes ?? [],
    sourceIds: spec?.sourceIds ?? [boundary.sourceId],
    boundary,
    reviewedAt: retrievedAt,
  });
}
link(
  "bw-ntlo-ya-dikgosi",
  "bw-national-assembly",
  "ADVISES",
  ["bw-parliament-functions"],
  "Advises on matters within its constitutional remit; not an equal lawmaking chamber.",
);
link(
  "na-national-assembly",
  "na-national-council",
  "REFERS_BILLS_TO",
  ["na-national-assembly", "na-national-council"],
  "Legislative referral for review; does not express a government hierarchy.",
);
const previousIndicators = await read("data/indicators.json");
for (const [name, code] of [
  ["population", "SP.POP.TOTL"],
  ["gdp-growth", "NY.GDP.MKTP.KD.ZG"],
]) {
  const raw = await read(path.join(input, "wdi-" + name + ".json"));
  if (!Array.isArray(raw?.[1]) || raw[0].pages !== 1)
    throw new Error("Incomplete WDI input " + code);
  const indicator = previousIndicators.indicators.find((i) => i.code === code);
  if (!indicator) throw new Error("Unknown indicator code");
  const sourceId = "world-wdi-" + name;
  sources.push({
    id: sourceId,
    title: "World Development Indicators · " + indicator.name + " · 2014–2024",
    publisher: "World Bank",
    url: `https://api.worldbank.org/v2/country/all/indicator/${code}?date=2014:2024&format=json&per_page=20000`,
    retrievedAt,
    license: "CC BY 4.0 (World Bank datasets, subject to third-party terms)",
    note:
      "Historical country/economy observations; World Bank aggregates are excluded. Missing values remain null. API last updated: " +
      raw[0].lastupdated,
  });
  const observations = [];
  for (const row of raw[1]) {
    const c = countryRows.find(
      (c) =>
        c.iso3 === row.countryiso3code ||
        (c.code === "XK" && row.countryiso3code === "XKX"),
    );
    if (c)
      observations.push({
        country: c.code,
        year: Number(row.date),
        value: row.value === null ? null : Number(row.value),
      });
  }
  if (!observations.length) throw new Error("No mapped WDI observations");
  indicator.observations = observations;
  indicator.sourceIds = [sourceId];
}
previousIndicators.retrievedAt = retrievedAt;
for (const profile of profiles)
  profile.comparisonIndicators = previousIndicators.indicators
    .filter((i) =>
      i.observations.some(
        (o) => o.country === profile.code && o.value !== null,
      ),
    )
    .map((i) => i.code);
const admin0Output = {
  ...admin0,
  features: admin0.features.map((f) => ({
    ...f,
    properties: {
      code: codeOf(f.properties) ?? "NE-" + f.properties.ADM0_A3,
      name: f.properties.NAME_EN || f.properties.NAME,
      continent: f.properties.CONTINENT,
      providerId: f.properties.ADM0_A3,
      status: f.properties.TYPE,
      sovereignty: f.properties.SOVEREIGNT,
      note: f.properties.NOTE_ADM0 || f.properties.NOTE_BRK || "",
      sourceId: "world-natural-earth-countries",
    },
  })),
};
const countryAsset = await write(
  "public/data/countries.geojson",
  admin0Output,
  false,
);
await write("data/countries.json", countryRows);
await write("data/indicators.json", previousIndicators);
await write("data/world-regions.json", regions);
await write("data/country-profiles.json", profiles);
await write("data/world-catalog.json", {
  sources,
  entities,
  relationships,
  datasets: [],
});
await write("data/world-assets.json", [
  {
    file: "countries.geojson",
    features: admin0Output.features.length,
    sourceId: "world-natural-earth-countries",
    ...countryAsset,
  },
  ...assets,
]);
await write("data/provenance/world-source-metadata.json", {
  retrievedAt,
  naturalEarth: {
    countries: source0,
    divisions: source1,
    release: "5.1.2",
    releaseDate: "2022-05-13",
  },
  geoBoundaries: usedMetadata,
});
await write("public/data/world/LICENSES.json", {
  note: "Licences apply to their respective datasets. Original geometry properties and publisher simplification are preserved. Source years are not retrieval dates.",
  sources: sources.filter(
    (s) => s.id.startsWith("world-gb") || s.id.startsWith("world-natural"),
  ),
});
console.log(
  JSON.stringify(
    {
      countries: countryRows.length,
      countryFeatures: admin0Output.features.length,
      profiles: profiles.length,
      referenceAreas: regions.length,
      boundaryFiles: assets.length,
      entities: entities.length,
      relationships: relationships.length,
      gbOpenCountries: usedMetadata.length,
      observations: previousIndicators.indicators.map((i) => ({
        code: i.code,
        count: i.observations.length,
      })),
    },
    null,
    2,
  ),
);
