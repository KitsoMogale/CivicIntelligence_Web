"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { MAP_WORKER_URL } from "@/lib/map-runtime";
import {
  MAPTILER_KEY,
  basemapMetadata,
  type Basemap,
  type BasemapStatus,
} from "@/lib/basemaps";
import { useBasemap } from "@/lib/use-basemap";
import { useTeaching } from "@/lib/teaching-store";
import type { TeachingComponent } from "@/lib/teaching";
maplibregl.setWorkerUrl(MAP_WORKER_URL);
export default function TeachingMap({
  component: c,
}: {
  component: TeachingComponent;
}) {
  const ref = useRef<HTMLDivElement>(null),
    current = useRef(c);
  current.current = c;
  const [map, setMap] = useState<maplibregl.Map | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [basemap, setBasemap] = useState<Basemap>("reference"),
    [retry, setRetry] = useState(0),
    [status, setStatus] = useState<BasemapStatus>("off");
  const handleStatus = useCallback(
    (next: BasemapStatus) => setStatus(next),
    [],
  );
  useBasemap(map, ready, basemap, retry, handleStatus);
  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false,
      m: maplibregl.Map;
    try {
      m = new maplibregl.Map({
        container: ref.current,
        center: c.center,
        zoom: c.zoom,
        minZoom: 1,
        maxZoom: 19,
        maxPitch: 0,
        renderWorldCopies: false,
        attributionControl: false,
        style: {
          version: 8,
          sources: {},
          layers: [
            {
              id: "ocean",
              type: "background",
              paint: { "background-color": "#0e1b22" },
            },
          ],
        },
      });
      setMap(m);
      m.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      m.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution:
            '<a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Natural Earth · public domain</a>',
        }),
      );
      m.on("load", async () => {
        try {
          const response = await fetch("/data/countries.geojson");
          if (!response.ok) throw new Error();
          const data = await response.json();
          if (cancelled) return;
          m.addSource("countries", { type: "geojson", data });
          m.addLayer({
            id: "land",
            type: "fill",
            source: "countries",
            paint: { "fill-color": "#284139", "fill-opacity": 0.8 },
          });
          m.addLayer({
            id: "borders",
            type: "line",
            source: "countries",
            paint: { "line-color": "#8caa97", "line-width": 1 },
          });
          m.addSource("teaching-lines", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          m.addLayer({
            id: "teaching-lines",
            type: "line",
            source: "teaching-lines",
            paint: {
              "line-color": "#e2bd7f",
              "line-dasharray": [3, 3],
              "line-width": 2,
            },
          });
          setReady(true);
        } catch {
          if (!cancelled)
            setError(
              "The reference map could not load. Reopen this visual to retry.",
            );
        }
      });
      m.on("error", () => {
        /* Provider status is handled without logging URLs containing browser keys. */
      });
      m.on("moveend", () => {
        const c = current.current,
          center: [number, number] = [
            Math.max(-180, Math.min(180, m.getCenter().lng)),
            Math.max(-85, Math.min(85, m.getCenter().lat)),
          ],
          zoom = m.getZoom();
        if (
          Math.abs(center[0] - c.center[0]) > 0.0001 ||
          Math.abs(center[1] - c.center[1]) > 0.0001 ||
          Math.abs(zoom - c.zoom) > 0.001
        )
          useTeaching
            .getState()
            .apply([{ type: "focus_map", componentId: c.id, center, zoom }]);
      });
    } catch {
      setError(
        "Your browser could not start the map. Check hardware acceleration.",
      );
      return;
    }
    const observer = new ResizeObserver(() => m.resize());
    observer.observe(ref.current);
    return () => {
      cancelled = true;
      observer.disconnect();
      m.remove();
    };
  }, []);
  useEffect(() => {
    if (!map || !ready) return;
    map.jumpTo({ center: c.center, zoom: c.zoom });
  }, [map, ready, c.center, c.zoom]);
  useEffect(() => {
    if (map && ready)
      map.setPaintProperty(
        "land",
        "fill-opacity",
        status === "ready" ? 0.04 : 0.8,
      );
  }, [map, ready, status]);
  useEffect(() => {
    if (!map || !ready) return;
    const markers = c.markers.filter(
      (p) =>
        !c.filter ||
        (p.label + p.detail).toLowerCase().includes(c.filter.toLowerCase()),
    );
    const visible = new Set(markers.map((m) => m.id));
    const instances = markers.map((p) => {
      const button = document.createElement("button");
      button.className =
        "teaching-map-dot" + (c.highlighted.includes(p.id) ? " highlight" : "");
      button.setAttribute("aria-label", "Open " + p.label);
      button.onclick = (event) => {
        event.stopPropagation();
        useTeaching
          .getState()
          .apply([
            { type: "select_canvas", componentId: c.id, elementId: p.id },
          ]);
      };
      return new maplibregl.Marker({ element: button })
        .setLngLat([p.longitude, p.latitude])
        .addTo(map);
    });
    const data: FeatureCollection = {
      type: "FeatureCollection",
      features: c.edges
        .filter((e) => visible.has(e.source) && visible.has(e.target))
        .map((e) => {
          const a = markers.find((p) => p.id === e.source)!,
            b = markers.find((p) => p.id === e.target)!;
          return {
            type: "Feature",
            properties: { id: e.id },
            geometry: {
              type: "LineString",
              coordinates: [
                [a.longitude, a.latitude],
                [b.longitude, b.latitude],
              ],
            },
          };
        }),
    };
    (map.getSource("teaching-lines") as maplibregl.GeoJSONSource).setData(data);
    return () => instances.forEach((m) => m.remove());
  }, [map, ready, c.markers, c.edges, c.filter, c.highlighted, c.id]);
  const metadata = basemapMetadata(basemap);
  return (
    <div className="teaching-map-block">
      <div className="teaching-map-controls">
        <select
          aria-label={"Basemap for " + c.title}
          value={basemap}
          onChange={(e) => setBasemap(e.target.value as Basemap)}
        >
          <option value="reference">Reference map</option>
          <option value="streets">Street map</option>
          {MAPTILER_KEY && (
            <option value="satellite-detail">Detailed satellite</option>
          )}
        </select>
        <button onClick={() => useTeaching.getState().setActive(false)}>
          Full map tools
        </button>
      </div>
      <div
        ref={ref}
        className="teaching-map teaching-visual"
        aria-label={c.title + " map"}
      />
      {metadata && (
        <small className="teaching-map-credit">
          {basemap === "satellite-detail" && (
            <a
              href="https://www.maptiler.com/"
              target="_blank"
              rel="noreferrer"
            >
              <img
                src="https://api.maptiler.com/resources/logo.svg"
                alt="MapTiler"
                width="70"
                height="20"
              />
            </a>
          )}
          <a href={metadata.url} target="_blank" rel="noreferrer">
            {metadata.publisher}
          </a>
          {basemap === "satellite-detail" &&
            " · Capture dates vary by location"}
        </small>
      )}
      {!!c.edges.length && (
        <small>
          Dashed connections show relationships, not surveyed physical routes.
        </small>
      )}
      {(error || status === "error") && (
        <p role="status">
          {error ||
            "Basemap could not load; the reference map remains available."}
          {status === "error" && (
            <button onClick={() => setRetry((v) => v + 1)}>
              Retry imagery
            </button>
          )}
        </p>
      )}
    </div>
  );
}
