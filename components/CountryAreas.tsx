"use client";
import { useEffect, useState } from "react";
import type { Map as MapInstance } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import {
  countryAreas,
  countryProfile,
  referenceArea,
} from "@/lib/country-profiles";
import { getSources } from "@/lib/knowledge";
import { useExplorer } from "@/lib/store";
import MapOverlay from "./MapOverlay";
const cache = new Map<string, FeatureCollection>();
const layerIds = [
  "country-area-fill",
  "country-area-lines",
  "country-area-selection",
];
const html = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export default function CountryAreas({
  map,
  ready,
  onReady,
}: {
  map: MapInstance | null;
  ready: boolean;
  onReady: (ready: boolean) => void;
}) {
  const s = useExplorer(),
    p = countryProfile(s.country.code);
  const file = p.boundary.kind === "country-specific" ? null : p.boundary.file;
  const [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const source = getSources([p.boundary.sourceId])[0];
  useEffect(() => {
    if (!map || !ready) return;
    const controller = new AbortController();
    const clear = () => {
      if (!map.getStyle()) return;
      for (const id of layerIds) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource("country-areas")) map.removeSource("country-areas");
    };
    clear();
    setLoaded(false);
    onReady(false);
    setError(false);
    map.getContainer().setAttribute("data-areas-loaded", "false");
    map.getContainer().setAttribute("data-areas-country", s.country.code);
    if (!file) return;
    (async () => {
      let data = cache.get(file);
      if (!data) {
        const r = await fetch(file, { signal: controller.signal });
        if (!r.ok) throw new Error("Reference boundaries unavailable");
        data = (await r.json()) as FeatureCollection;
        if (controller.signal.aborted) return;
        cache.set(file, data);
        while (cache.size > 3) cache.delete(cache.keys().next().value!);
      }
      if (controller.signal.aborted) return;
      const state = useExplorer.getState();
      const shown = state.layers.find((l) => l.id === "provinces")?.visible;
      map.addSource("country-areas", {
        type: "geojson",
        data,
        promoteId: "entityId",
        attribution: source
          ? `<a href="${html(source.url)}" target="_blank" rel="noreferrer">${html(source.publisher)} (${html(source.license ?? "see source")})</a>`
          : undefined,
      });
      map.addLayer({
        id: layerIds[0],
        type: "fill",
        source: "country-areas",
        layout: { visibility: shown ? "visible" : "none" },
        paint: { "fill-color": "#719f8a", "fill-opacity": 0.04 },
      });
      map.addLayer({
        id: layerIds[1],
        type: "line",
        source: "country-areas",
        layout: { visibility: shown ? "visible" : "none" },
        paint: { "line-color": "#54846f", "line-width": 1.2 },
      });
      map.addLayer({
        id: layerIds[2],
        type: "line",
        source: "country-areas",
        filter: ["==", "entityId", state.region ?? ""],
        layout: { visibility: shown ? "visible" : "none" },
        paint: { "line-color": "#f0a83b", "line-width": 3 },
      });
      map
        .getContainer()
        .setAttribute("data-area-count", String(data.features.length));
      map.getContainer().setAttribute("data-areas-loaded", "true");
      setLoaded(true);
      onReady(true);
    })().catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => {
      controller.abort();
      clear();
    };
  }, [map, ready, file, retry, source, s.country.code, onReady]);
  useEffect(() => {
    if (!map || !ready || !loaded) return;
    const click = (e: {
      features?: { properties?: Record<string, unknown> | null }[];
      originalEvent: MouseEvent;
    }) => {
      if (
        (e.originalEvent.target as Element)?.closest?.(
          ".map-entity,.maplibregl-popup",
        )
      )
        return;
      const id = e.features?.[0]?.properties?.entityId;
      if (
        typeof id === "string" &&
        referenceArea(id)?.country === useExplorer.getState().country.code
      )
        useExplorer
          .getState()
          .applyActions([{ type: "FOCUS_REGION", payload: { entityId: id } }]);
    };
    map.on("click", "country-area-fill", click);
    return () => {
      map.off("click", "country-area-fill", click);
    };
  }, [map, ready, loaded]);
  const areas = countryAreas(s.country.code);
  return (
    <>
      {file && (
        <div className="province-focus">
          <select
            aria-label="Focus administrative area"
            value={referenceArea(s.region)?.entityId ?? ""}
            onChange={(e) =>
              e.target.value
                ? s.applyActions([
                    {
                      type: "FOCUS_REGION",
                      payload: { entityId: e.target.value },
                    },
                  ])
                : s.navigate(
                    {
                      region: null,
                      selectedEntity: null,
                      selectionIds: [],
                      camera: {
                        center: s.country.center,
                        zoom: s.country.zoom,
                        bearing: 0,
                        pitch: 0,
                      },
                    },
                    "Return to country",
                  )
            }
          >
            <option value="">All areas · {p.boundary.divisionLabel}</option>
            {[...areas]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((a) => (
                <option key={a.entityId} value={a.entityId}>
                  {a.name}
                </option>
              ))}
          </select>
        </div>
      )}
      {error && (
        <MapOverlay
          className="province-error"
          label="Area boundary status"
          title="Reference boundaries unavailable"
          reopenLabel="Boundary status"
        >
          <button onClick={() => setRetry((n) => n + 1)}>
            Retry area boundaries
          </button>
        </MapOverlay>
      )}
    </>
  );
}
