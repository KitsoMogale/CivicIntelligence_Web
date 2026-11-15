"use client";
import { useEffect, useState } from "react";
import type {
  Map as MapInstance,
  GeoJSONSource,
  MapLayerMouseEvent,
} from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { useExplorer } from "@/lib/store";
import { layerById } from "@/lib/canvas";
import {
  boundaryMunicipality,
  boundaryTitle,
  municipalityWards,
  wardById,
  wardFile,
} from "@/lib/boundaries";
import { basemapMetadata, type BasemapStatus } from "@/lib/basemaps";
import { useBasemap } from "@/lib/use-basemap";
import { entityById, getSources } from "@/lib/knowledge";
import { countryProfile } from "@/lib/country-profiles";
import MapOverlay from "./MapOverlay";
const cachedWards = new Map<string, FeatureCollection>();
export default function MapDetails({
  map,
  ready,
  onBasemapStatus,
}: {
  map: MapInstance | null;
  ready: boolean;
  onBasemapStatus: (status: BasemapStatus) => void;
}) {
  const s = useExplorer(),
    [basemapRetry, setBasemapRetry] = useState(0),
    [retry, setRetry] = useState(0),
    [wardStatus, setWardStatus] = useState<
      "idle" | "loading" | "ready" | "error"
    >("idle");
  const municipality = boundaryMunicipality(s.region, s.boundaryEdition),
    ward = wardById(s.selectedWardId),
    wardLayer = layerById(s.layers, "wards"),
    file =
      s.boundaryEdition === "mdb-2026" &&
      s.country.code === "ZA" &&
      wardLayer.visible
        ? wardFile(s.region)
        : null;
  const options = municipalityWards(s.region);
  const profile = countryProfile(s.country.code);
  const boundarySource = getSources([profile.boundary.sourceId])[0];
  const basemapStatus = useBasemap(
    map,
    ready,
    s.basemap,
    basemapRetry,
    onBasemapStatus,
  );
  const imagery = s.basemap.startsWith("satellite");
  const metadata = basemapMetadata(s.basemap);
  useEffect(() => {
    if (!map || !ready) return;
    if (!map.getSource("ward-detail")) {
      map.addSource("ward-detail", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        promoteId: "wardId",
        attribution:
          '<a href="https://spatialhub-mdb-sa.opendata.arcgis.com/" target="_blank" rel="noreferrer">Municipal Demarcation Board</a> (2026 publisher terms)',
      });
      map.addLayer({
        id: "ward-fill",
        type: "fill",
        source: "ward-detail",
        minzoom: 7,
        paint: { "fill-color": "#d8ad55", "fill-opacity": 0.025 },
      });
      map.addLayer({
        id: "ward-borders",
        type: "line",
        source: "ward-detail",
        minzoom: 7,
        paint: {
          "line-color": "#775118",
          "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.8, 13, 1.6],
        },
      });
      map.addLayer({
        id: "ward-selection",
        type: "line",
        source: "ward-detail",
        filter: ["==", "wardId", ""],
        paint: { "line-color": "#f0a83b", "line-width": 4 },
      });
    }
    const click = (event: MapLayerMouseEvent) => {
      if (
        (event.originalEvent.target as Element)?.closest?.(
          ".map-entity,.maplibregl-popup",
        )
      )
        return;
      const id = event.features?.[0]?.properties.wardId;
      if (id && wardById(id))
        useExplorer
          .getState()
          .applyActions([{ type: "SELECT_WARD", payload: { id } }]);
    };
    map.on("click", "ward-fill", click);
    return () => {
      map.off("click", "ward-fill", click);
    };
  }, [map, ready]);
  useEffect(() => {
    if (!map || !ready || !map.getSource("ward-detail")) return;
    const controller = new AbortController();
    if (!file) {
      (map.getSource("ward-detail") as GeoJSONSource).setData({
        type: "FeatureCollection",
        features: [],
      });
      setWardStatus("idle");
      map.getContainer().setAttribute("data-wards-loaded", "false");
      return;
    }
    setWardStatus("loading");
    map.getContainer().setAttribute("data-wards-loaded", "false");
    (map.getSource("ward-detail") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: [],
    });
    for (const id of ["ward-fill", "ward-borders", "ward-selection"])
      map.setLayoutProperty(id, "visibility", "none");
    (async () => {
      let data = cachedWards.get(file);
      if (!data) {
        const response = await fetch(file, { signal: controller.signal });
        if (!response.ok) throw new Error("Ward boundaries unavailable");
        data = (await response.json()) as FeatureCollection;
        if (controller.signal.aborted) return;
        cachedWards.set(file, data);
        while (cachedWards.size > 4)
          cachedWards.delete(cachedWards.keys().next().value!);
      }
      if (controller.signal.aborted) return;
      (map.getSource("ward-detail") as GeoJSONSource).setData(data);
      for (const id of ["ward-fill", "ward-borders", "ward-selection"])
        map.setLayoutProperty(id, "visibility", "visible");
      map.setFilter("ward-selection", [
        "==",
        "wardId",
        useExplorer.getState().selectedWardId ?? "",
      ]);
      map.getContainer().setAttribute("data-wards-loaded", "true");
      map
        .getContainer()
        .setAttribute("data-ward-count", String(data.features.length));
      setWardStatus("ready");
    })().catch(() => {
      if (!controller.signal.aborted) setWardStatus("error");
    });
    return () => controller.abort();
  }, [map, ready, file, retry]);
  useEffect(() => {
    if (!map || !ready || !map.getLayer("ward-fill")) return;
    const visible = !!file && wardStatus === "ready";
    for (const id of ["ward-fill", "ward-borders", "ward-selection"]) {
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
      if (id !== "ward-fill")
        map.setPaintProperty(id, "line-opacity", wardLayer.opacity);
    }
    map.setPaintProperty(
      "ward-fill",
      "fill-opacity",
      wardLayer.opacity * 0.025,
    );
    map.setFilter("ward-selection", ["==", "wardId", s.selectedWardId ?? ""]);
    map.setPaintProperty(
      "ward-borders",
      "line-color",
      s.basemap.startsWith("satellite") ? "#f9e0a3" : "#775118",
    );
  }, [map, ready, file, wardStatus, wardLayer, s.selectedWardId, s.basemap]);
  return (
    <>
      <div className="map-source-status" aria-label="Map sources and edition">
        {metadata && (
          <>
            <a href={metadata.url} target="_blank" rel="noreferrer">
              {s.basemap === "streets"
                ? "© OpenStreetMap contributors"
                : s.basemap === "satellite"
                  ? "EOxCloudless · EOX / Copernicus · 2016 · CC BY 4.0"
                  : "© MapTiler · imagery credits"}
            </a>
            <span>
              {basemapStatus === "ready"
                ? imagery
                  ? s.basemap === "satellite"
                    ? "2016 images · ~10 m detail · not live"
                    : "Captured images · dates vary · not live"
                  : "Online streets"
                : basemapStatus === "error"
                  ? `${imagery ? "Satellite images" : "Street tiles"} unavailable · reference map shown`
                  : `Loading ${imagery ? "satellite images" : "street map"}…`}
            </span>
            {basemapStatus === "error" && (
              <button onClick={() => setBasemapRetry((n) => n + 1)}>
                {imagery ? "Retry satellite" : "Retry streets"}
              </button>
            )}
          </>
        )}
        {s.basemap === "satellite-detail" && (
          <a
            href="https://www.maptiler.com/"
            target="_blank"
            rel="noreferrer"
            aria-label="MapTiler"
          >
            {/* Required logo for MapTiler free accounts. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://api.maptiler.com/resources/logo.svg"
              alt="MapTiler"
              width="85"
              height="20"
            />
          </a>
        )}
        {s.country.code === "ZA" && (
          <span>{boundaryTitle(s.boundaryEdition)}</span>
        )}
        {s.country.code !== "ZA" && boundarySource && (
          <a
            href={boundarySource.url}
            target="_blank"
            rel="noreferrer"
            title={
              boundarySource.publisher + " · " + (boundarySource.license ?? "")
            }
          >
            Boundary reference · {profile.boundary.year}
            {s.country.code === "NA" ? " · date conflict" : ""}
          </a>
        )}
      </div>
      {s.country.code === "ZA" && wardLayer.visible && (
        <MapOverlay
          className="ward-controls"
          label="Ward boundary controls"
          title="Ward detail · MDB 2026 edition"
          reopenLabel="Ward controls"
        >
          {s.boundaryEdition !== "mdb-2026" ? (
            <p>Select the MDB 2026 boundary edition to show wards.</p>
          ) : !file ? (
            <p>
              Choose a local municipality or metro in Focus municipality to load
              its wards.
            </p>
          ) : (
            <>
              <label>
                <span className="ward-scope">
                  Ward in {entityById(s.region ?? "")?.name}
                </span>
                <select
                  aria-label="Focus ward"
                  value={s.selectedWardId ?? ""}
                  onChange={(e) =>
                    e.target.value
                      ? s.applyActions([
                          {
                            type: "SELECT_WARD",
                            payload: { id: e.target.value },
                          },
                        ])
                      : s.navigate(
                          { selectedWardId: null },
                          "Clear ward selection",
                        )
                  }
                >
                  <option value="">
                    Choose ward · {options.length} available
                  </option>
                  {options.map((w) => (
                    <option key={w.id} value={w.id}>
                      Ward {w.number} · {w.id.replace("ward-", "")}
                    </option>
                  ))}
                </select>
              </label>
              {wardStatus === "loading" && (
                <p role="status">Loading publisher geometry…</p>
              )}
              {wardStatus === "error" && (
                <p role="alert">
                  Ward geometry unavailable.{" "}
                  <button onClick={() => setRetry((n) => n + 1)}>
                    Retry wards
                  </button>
                </p>
              )}
              {wardStatus === "ready" && s.camera.zoom < 7 && (
                <p>
                  Zoom in to see individual ward outlines, or choose a ward.
                </p>
              )}
              {ward && (
                <p className="ward-evidence" role="status">
                  <b>Ward {ward.number}</b> · {municipality?.name}
                  <br />
                  Publisher identifier: {ward.id.replace("ward-", "")}
                  <br />
                  2026 published boundary edition. No population or service
                  values are inferred for this ward.
                </p>
              )}
              {ward?.geometryNote && (
                <p className="ward-evidence">
                  {ward.geometryNote}{" "}
                  <a
                    href={ward.originalGeometryFile}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Original publisher geometry
                  </a>
                </p>
              )}
            </>
          )}
          <p>
            Source DATE field: 4 November 2026 · retrieved 13 November 2026.
            Ward numbering is preserved. One documented topology repair is
            identified on the affected ward.
          </p>
          <a
            href="https://www.arcgis.com/home/item.html?id=30b6e281a5074eddbf1a3f82aa00459e"
            target="_blank"
            rel="noreferrer"
          >
            Municipal Demarcation Board · source ↗
          </a>
        </MapOverlay>
      )}
    </>
  );
}
