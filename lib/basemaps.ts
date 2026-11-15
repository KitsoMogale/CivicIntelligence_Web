import type { RasterSourceSpecification } from "maplibre-gl";
import { STREET_ATTRIBUTION, STREET_TILES, STREET_TERMS } from "./streets";

export type Basemap =
  "reference" | "streets" | "satellite" | "satellite-detail";
export type BasemapStatus = "off" | "loading" | "ready" | "error";
export const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY?.trim() ?? "";
export const SATELLITE_CREDIT =
  'EOxCloudless <a href="https://cloudless.eox.at" target="_blank" rel="noreferrer">https://cloudless.eox.at</a> by <a href="https://eox.at" target="_blank" rel="noreferrer">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2016)';

// Metadata is safe to export: tile URLs containing browser API keys are separate.
export function basemapMetadata(id: Basemap) {
  if (id === "streets")
    return {
      publisher: "OpenStreetMap contributors",
      url: "https://www.openstreetmap.org/copyright",
      license: "ODbL 1.0 (data); public tile service policy applies",
      terms: STREET_TERMS,
      note: "Online street map. Tiles are not embedded in offline reports.",
    };
  if (id === "satellite")
    return {
      publisher: "EOX IT Services GmbH; Copernicus Sentinel",
      url: "https://cloudless.eox.at",
      license: "CC BY 4.0 (2016 mosaic)",
      terms: "https://cloudless.eox.at/documentation/faq",
      note: "EOxCloudless 2016; contains modified Copernicus Sentinel data 2016. About 10 m ground detail; individual buildings may not be distinguishable. Older captured imagery, not live. Enlarging beyond zoom 14 adds no new detail. Online imagery is not embedded in offline reports.",
    };
  if (id === "satellite-detail")
    return {
      publisher: "MapTiler and its imagery providers",
      url: "https://www.maptiler.com/copyright/",
      license: "MapTiler account terms; not open data",
      terms: "https://www.maptiler.com/terms/",
      note: "Satellite and aerial imagery. Detail and capture dates vary by location; no live or uniform capture-date claim. Online imagery is not embedded in offline reports.",
    };
  return null;
}

export function rasterBasemap(
  id: Basemap,
  key = MAPTILER_KEY,
): RasterSourceSpecification | null {
  if (id === "streets")
    return {
      type: "raster",
      tiles: [STREET_TILES],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution: STREET_ATTRIBUTION,
    };
  if (id === "satellite")
    return {
      type: "raster",
      tiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg",
      ],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 14,
      attribution: SATELLITE_CREDIT,
    };
  if (id === "satellite-detail" && key.trim())
    return {
      type: "raster",
      // TileJSON supplies current tile URLs, native zoom limits and data credits.
      url:
        "https://api.maptiler.com/tiles/satellite-v4/tiles.json?key=" +
        encodeURIComponent(key.trim()),
      tileSize: 256,
    };
  return null;
}
