import fs from "node:fs/promises";
const url =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";
const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
if (!response.ok) throw new Error(`Geography download: ${response.status}`);
const geo = await response.json();
const features = geo.features.map((f) => ({
  type: "Feature",
  geometry: f.geometry,
  properties: {
    code: f.properties.ISO_A2_EH || f.properties.ISO_A2,
    name: f.properties.NAME_EN || f.properties.NAME,
    continent: f.properties.CONTINENT,
  },
}));
for (const f of features) {
  const polygon =
    f.geometry.type === "MultiPolygon"
      ? f.geometry.coordinates.toSorted((a, b) => b[0].length - a[0].length)[0]
      : f.geometry.coordinates;
  const ring = polygon[0],
    xs = ring.map((p) => p[0]),
    ys = ring.map((p) => p[1]);
  const west = Math.min(...xs),
    east = Math.max(...xs),
    south = Math.min(...ys),
    north = Math.max(...ys);
  f.properties.center = [(west + east) / 2, (south + north) / 2];
  f.properties.zoom = Math.min(
    6,
    Math.max(2, Math.log2(300 / Math.max(east - west, (north - south) * 1.5))),
  );
}
await fs.mkdir("public/data", { recursive: true });
await fs.writeFile(
  "public/data/countries.geojson",
  JSON.stringify({ type: "FeatureCollection", features }),
);
console.log(`Bundled ${features.length} Natural Earth country boundaries.`);

await fs.mkdir("data", { recursive: true });
await fs.writeFile(
  "data/countries.json",
  JSON.stringify(
    features
      .filter((f) => /^[A-Z]{2}$/.test(f.properties.code))
      .map((f) => f.properties),
    null,
    2,
  ) + "\n",
);
