"use client";
import { useEffect, useState } from "react";
import type { Map as MapInstance, RasterTileSource } from "maplibre-gl";
import { rasterBasemap, type Basemap, type BasemapStatus } from "./basemaps";

export function useBasemap(
  map: MapInstance | null,
  ready: boolean,
  basemap: Basemap,
  retry: number,
  onStatus: (status: BasemapStatus) => void,
) {
  const [status, setStatus] = useState<BasemapStatus>("off");
  useEffect(() => {
    if (!map || !ready) return;
    // Remove inactive sources to stop their requests and remove stale attribution.
    for (const id of ["streets", "satellite", "satellite-detail"]) {
      if (id === basemap) continue;
      if (map.getLayer(id + "-base")) map.removeLayer(id + "-base");
      if (map.getSource(id)) map.removeSource(id);
    }
    const layerId = basemap + "-base";
    let failed = false;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const update = (next: BasemapStatus) => {
      if (next !== "loading") clearTimeout(deadline);
      setStatus(next);
      onStatus(next);
      map.getContainer().setAttribute("data-basemap", basemap);
      map.getContainer().setAttribute("data-basemap-status", next);
      map
        .getContainer()
        .setAttribute(
          "data-street-status",
          basemap === "streets" ? next : "off",
        );
    };
    if (basemap === "reference") {
      update("off");
      return;
    }
    const source = rasterBasemap(basemap);
    if (!source) {
      update("error");
      return;
    }
    update("loading");
    const settled = () => {
      if (!failed && map.getSource(basemap) && map.isSourceLoaded(basemap))
        update("ready");
    };
    const loaded = (event: { sourceId?: string; sourceDataType?: string }) => {
      // A successful tile must not clear an error from another visible tile.
      if (
        !failed &&
        event.sourceId === basemap &&
        ["content", "idle"].includes(event.sourceDataType ?? "")
      )
        settled();
    };
    const error = (event: { sourceId?: string }) => {
      if (event.sourceId !== basemap) return;
      failed = true;
      if (map.getLayer(layerId))
        map.setLayoutProperty(layerId, "visibility", "none");
      update("error");
    };
    map.on("sourcedata", loaded);
    // MapLibre 6 separates tile completion from source metadata events.
    // Its map idle event confirms the initial visible tile set has settled.
    map.on("idle", settled);
    map.on("error", error);
    deadline = setTimeout(() => error({ sourceId: basemap }), 20000);
    if (!map.getSource(basemap)) {
      map.addSource(basemap, source);
      map.addLayer(
        {
          id: layerId,
          type: "raster",
          source: basemap,
          paint: { "raster-opacity": 1, "raster-fade-duration": 200 },
        },
        "land",
      );
    } else {
      map.setLayoutProperty(layerId, "visibility", "visible");
      const current = map.getSource(basemap) as RasterTileSource;
      if (retry) {
        if (source.url) current.setUrl(source.url);
        else if (source.tiles) current.setTiles(source.tiles);
      } else if (map.isSourceLoaded(basemap)) update("ready");
    }
    return () => {
      clearTimeout(deadline);
      map.off("sourcedata", loaded);
      map.off("idle", settled);
      map.off("error", error);
    };
  }, [map, ready, basemap, retry, onStatus]);
  return status;
}
