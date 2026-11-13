import fs from "node:fs";
import path from "node:path";
const root = process.cwd(),
  pkg = JSON.parse(
    fs.readFileSync(
      path.join(root, "node_modules/maplibre-gl/package.json"),
      "utf8",
    ),
  );
const destination = path.join(root, "public/vendor/maplibre", pkg.version);
const runtime = fs.readFileSync(path.join(root, "lib/map-runtime.ts"), "utf8");
if (
  !runtime.includes(
    "/vendor/maplibre/" + pkg.version + "/maplibre-gl-worker.mjs",
  )
)
  throw Error("Map worker URL must match the installed MapLibre version");
fs.mkdirSync(destination, { recursive: true });
for (const name of [
  "maplibre-gl-worker.mjs",
  "maplibre-gl-shared.mjs",
  "maplibre-gl-worker.mjs.map",
  "maplibre-gl-shared.mjs.map",
])
  fs.copyFileSync(
    path.join(root, "node_modules/maplibre-gl/dist", name),
    path.join(destination, name),
  );
fs.copyFileSync(
  path.join(root, "node_modules/maplibre-gl/LICENSE.txt"),
  path.join(destination, "LICENSE.txt"),
);
console.log(
  "Prepared same-origin MapLibre " + pkg.version + " worker and shared module",
);
