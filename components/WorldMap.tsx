"use client";
import { useEffect, useRef, useState } from "react";
import maplibregl, {
  type Map as MapInstance,
  type GeoJSONSource,
} from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { AlertCircle, Layers3, RotateCcw } from "lucide-react";
import { countries, entityById, regions, getSources } from "@/lib/knowledge";
import { useExplorer } from "@/lib/store";
import {
  canvasPlaces,
  canvasLinks,
  placeLayer,
  type MapPlace,
} from "@/lib/map-data";
import {
  layerById,
  layerRegistry,
  geographicScope,
  sameCamera,
  type Camera,
} from "@/lib/canvas";
import LayerControls from "./LayerControls";
import { municipalGeography, municipalById } from "@/lib/geography";
import {
  metricById,
  metricValue,
  metricColor,
  metricExtent,
  formatMetric,
} from "@/lib/statistics";
let geography: Promise<FeatureCollection> | undefined,
  provinceGeography: Promise<FeatureCollection> | undefined;
const municipalFiles: Record<string, Promise<FeatureCollection>> = {};
async function jsonFile(path: string): Promise<FeatureCollection> {
  const r = await fetch(path);
  if (!r.ok) throw new Error("Geography unavailable");
  return r.json();
}
function readCamera(m: MapInstance): Camera {
  const center = m.getCenter();
  return {
    center: [
      Math.max(-180, Math.min(180, center.lng)),
      Math.max(-85, Math.min(85, center.lat)),
    ],
    zoom: m.getZoom(),
    bearing: ((((m.getBearing() + 180) % 360) + 360) % 360) - 180,
    pitch: m.getPitch(),
  };
}
function isMarkerControl(event: maplibregl.MapMouseEvent) {
  const target = event.originalEvent.target;
  return (
    target instanceof Element &&
    !!target.closest(".map-entity,.maplibregl-popup")
  );
}
export default function WorldMap() {
  const container = useRef<HTMLDivElement>(null),
    map = useRef<MapInstance | null>(null),
    markers = useRef<maplibregl.Marker[]>([]);
  const s = useExplorer();
  const municipalLevelLoaded = useRef("");
  const [municipalReady, setMunicipalReady] = useState(false),
    [municipalError, setMunicipalError] = useState(false);
  const [error, setError] = useState(""),
    [ready, setReady] = useState(false),
    [provinceReady, setProvinceReady] = useState(false),
    [provinceError, setProvinceError] = useState(false);
  const [hover, setHover] = useState(""),
    [retry, setRetry] = useState(0),
    [layersOpen, setLayersOpen] = useState(false),
    [visibleCount, setVisibleCount] = useState(0),
    [connectionCount, setConnectionCount] = useState(0);
  const [liveCamera, setLiveCamera] = useState(s.camera);
  useEffect(() => {
    if (!container.current) return;
    let cancelled = false;
    let m: MapInstance | undefined;
    let observer: ResizeObserver | undefined;
    try {
      const camera = useExplorer.getState().camera;
      m = new maplibregl.Map({
        container: container.current,
        ...camera,
        minZoom: 1.2,
        maxZoom: 12,
        maxPitch: 60,
        attributionControl: false,
        renderWorldCopies: false,
        style: {
          version: 8,
          sources: {},
          layers: [
            {
              id: "ocean",
              type: "background",
              paint: { "background-color": "#0d171e" },
            },
          ],
        },
      });
      map.current = m;
      observer = new ResizeObserver(() => m?.resize());
      observer.observe(container.current);
      m.addControl(
        new maplibregl.NavigationControl({ showCompass: true }),
        "bottom-right",
      );
      m.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution:
            'Countries/cities: <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Natural Earth (public domain)</a> · Provinces/municipalities: <a href="https://www.geoboundaries.org/" target="_blank" rel="noreferrer">geoBoundaries (CC BY 4.0)</a>; OCHA ROSEA / MDB (<a href="https://creativecommons.org/licenses/by/3.0/igo/" target="_blank" rel="noreferrer">CC BY 3.0 IGO</a>), 2020 · simplified',
        }),
      );
      m.on("moveend", () => {
        if (!m || cancelled) return;
        const camera = readCamera(m);
        setLiveCamera(camera);
        container.current?.setAttribute("data-camera", JSON.stringify(camera));
        useExplorer.getState().recordCamera(camera);
      });
      m.on("idle", () => {
        if (m?.getLayer("land") && m.loaded())
          container.current?.setAttribute("data-loaded", "true");
      });
      m.on("error", (e) => {
        if (!cancelled && e.error?.message?.includes("WebGL"))
          setError(
            "Your browser could not initialize the map. Try enabling hardware acceleration.",
          );
      });
      m.on("load", async () => {
        try {
          geography ??= jsonFile("/data/countries.geojson").catch((e) => {
            geography = undefined;
            throw e;
          });
          const data = await geography;
          if (cancelled || !m) return;
          m.addSource("countries", {
            type: "geojson",
            data,
            promoteId: "code",
          });
          m.addLayer({
            id: "land",
            type: "fill",
            source: "countries",
            paint: { "fill-color": "#1c2b32", "fill-opacity": 0.96 },
          });
          m.addLayer({
            id: "borders",
            type: "line",
            source: "countries",
            paint: { "line-color": "#3a4b50", "line-width": 0.8 },
          });
          m.addLayer({
            id: "selection",
            type: "line",
            source: "countries",
            filter: ["==", "code", useExplorer.getState().country.code],
            paint: { "line-color": "#a4debf", "line-width": 1.6 },
          });
          m.addLayer({
            id: "hover",
            type: "fill",
            source: "countries",
            filter: ["==", "code", ""],
            paint: { "fill-color": "#7dc7ad", "fill-opacity": 0.16 },
          });
          m.addSource("connections", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          m.addSource("marker-points", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          for (const id of [
            "cities",
            "institutions",
            "mining",
            "infrastructure",
          ] as const)
            m.addLayer({
              id: "points-" + id,
              type: "circle",
              source: "marker-points",
              filter: ["==", "layerId", id],
              paint: {
                "circle-color": layerRegistry[id].style.color,
                "circle-radius": ["case", [">", ["get", "count"], 1], 12, 5],
                "circle-stroke-color": "#d3e8cd",
                "circle-stroke-width": 1,
              },
            });
          m.addLayer({
            id: "connection-lines",
            type: "line",
            source: "connections",
            paint: {
              "line-color": [
                "case",
                ["get", "highlighted"],
                "#ddf1b1",
                "#96b7cc",
              ],
              "line-width": ["case", ["get", "highlighted"], 3, 1.4],
              "line-dasharray": [3, 3],
            },
          });
          m.on("mousemove", "land", (e) => {
            const f = e.features?.[0];
            if (!f || !m) return;
            m.getCanvas().style.cursor = "pointer";
            setHover(f.properties.name);
            m.setFilter("hover", ["==", "code", f.properties.code]);
          });
          m.on("mouseleave", "land", () => {
            if (!m) return;
            m.getCanvas().style.cursor = "";
            setHover("");
            m.setFilter("hover", ["==", "code", ""]);
          });
          m.on("click", "land", (e) => {
            if (isMarkerControl(e)) return;
            if (!m) return;
            const layers = [
              "municipal-fill",
              "province-fill",
              "statistics-fill",
              "connection-lines",
            ].filter((id) => !!m!.getLayer(id));
            if (
              layers.length &&
              m.queryRenderedFeatures(e.point, { layers }).length
            )
              return;
            const f = e.features?.[0];
            if (!f) return;
            const country = countries.find((c) => c.code === f.properties.code);
            if (country) useExplorer.getState().selectCountry(country);
          });
          m.on("click", "connection-lines", (e) => {
            if (isMarkerControl(e)) return;
            const id = e.features?.[0]?.properties?.id;
            if (id) useExplorer.getState().openRelationship(id);
          });
          setReady(true);
        } catch {
          if (!cancelled)
            setError(
              "Country boundaries could not load. Retry the local geography file.",
            );
        }
      });
    } catch {
      setError(
        "This browser cannot render the interactive map. You can still explore the knowledge diagrams.",
      );
    }
    return () => {
      cancelled = true;
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      observer?.disconnect();
      m?.remove();
      map.current = null;
      setReady(false);
      setProvinceReady(false);
    };
  }, [retry]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || s.country.code !== "ZA" || m.getSource("za-provinces"))
      return;
    let cancelled = false;
    provinceGeography ??= jsonFile("/data/za-provinces.geojson").catch((e) => {
      provinceGeography = undefined;
      throw e;
    });
    provinceGeography
      .then((data) => {
        if (cancelled) return;
        m.addSource("za-provinces", { type: "geojson", data, promoteId: "id" });
        m.addLayer({
          id: "province-fill",
          type: "fill",
          source: "za-provinces",
          paint: { "fill-color": "#386754", "fill-opacity": 0.08 },
        });
        m.addLayer({
          id: "province-borders",
          type: "line",
          source: "za-provinces",
          paint: { "line-color": "#749b87", "line-width": 1 },
        });
        m.addLayer({
          id: "statistics-fill",
          type: "fill",
          source: "za-provinces",
          paint: { "fill-color": "#5d9570", "fill-opacity": 0.72 },
        });
        m.addLayer({
          id: "province-selection",
          type: "line",
          source: "za-provinces",
          filter: ["==", "id", ""],
          paint: { "line-color": "#d7f3be", "line-width": 2.5 },
        });
        for (const id of ["province-fill", "statistics-fill"]) {
          m.on("mousemove", id, (e) => {
            const p = e.features?.[0]?.properties;
            if (p) {
              m.getCanvas().style.cursor = "pointer";
              const layer = layerById(
                  useExplorer.getState().layers,
                  "statistics",
                ),
                metric = metricById(layer.metric);
              setHover(
                metric
                  ? p.name +
                      " · " +
                      metric.name +
                      ": " +
                      formatMetric(
                        metricValue(metric.id, p.id),
                        metric.precision,
                      ) +
                      " · " +
                      metric.periodLabel
                  : p.name +
                      " · Census " +
                      layer.year +
                      ": " +
                      Number(p["population" + layer.year]).toLocaleString(
                        "en-ZA",
                      ),
              );
            }
          });
          m.on("mouseleave", id, () => setHover(""));
        }
        // One map click can hit both composable fills. Dispatch the topmost province once.
        m.on("click", (e) => {
          if (isMarkerControl(e)) return;
          if (
            m.getLayer("municipal-fill") &&
            layerById(useExplorer.getState().layers, "municipalities").visible
          ) {
            const p = m.queryRenderedFeatures(e.point, {
              layers: ["municipal-fill"],
            })[0]?.properties;
            if (p) {
              useExplorer
                .getState()
                .applyActions([
                  { type: "FOCUS_REGION", payload: { entityId: p.entityId } },
                ]);
              return;
            }
          }
          if (
            m.queryRenderedFeatures(e.point, { layers: ["connection-lines"] })
              .length
          )
            return;
          const hits = m.queryRenderedFeatures(e.point, {
              layers: ["province-fill", "statistics-fill"],
            }),
            p = hits[0]?.properties;
          if (p)
            useExplorer
              .getState()
              .applyActions([
                { type: "FOCUS_REGION", payload: { entityId: p.entityId } },
              ]);
        });
        setProvinceReady(true);
        setProvinceError(false);
        container.current?.setAttribute("data-provinces-loaded", "true");
      })
      .catch(() => {
        if (!cancelled) setProvinceError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, s.country.code, retry]);
  useEffect(() => {
    const m = map.current;
    if (
      !m ||
      !ready ||
      s.country.code !== "ZA" ||
      !layerById(s.layers, "municipalities").visible ||
      s.camera.zoom < 4.5
    )
      return;
    const level = s.municipalityLevel === "district" ? "2" : "3";
    if (
      municipalLevelLoaded.current === level &&
      m.getSource("za-municipalities")
    )
      return;
    let cancelled = false;
    setMunicipalReady(false);
    container.current?.setAttribute("data-municipalities-loaded", "false");
    municipalFiles[level] ??= jsonFile(
      "/data/za-municipalities-adm" + level + ".geojson",
    ).catch((e) => {
      delete municipalFiles[level];
      throw e;
    });
    municipalFiles[level]
      .then((data) => {
        if (cancelled) return;
        if (m.getSource("za-municipalities"))
          (m.getSource("za-municipalities") as GeoJSONSource).setData(data);
        else {
          m.addSource("za-municipalities", {
            type: "geojson",
            data,
            promoteId: "entityId",
          });
          m.addLayer({
            id: "municipal-fill",
            type: "fill",
            source: "za-municipalities",
            minzoom: 4.5,
            paint: { "fill-color": "#879e8e", "fill-opacity": 0.08 },
          });
          m.addLayer({
            id: "municipal-borders",
            type: "line",
            source: "za-municipalities",
            minzoom: 4.5,
            paint: { "line-color": "#9cb09c", "line-width": 1 },
          });
          m.addLayer({
            id: "municipal-selection",
            type: "line",
            source: "za-municipalities",
            filter: ["==", "entityId", ""],
            paint: { "line-color": "#e3f3b6", "line-width": 3 },
          });
          m.on("mousemove", "municipal-fill", (e) => {
            const p = e.features?.[0]?.properties;
            if (p) {
              m.getCanvas().style.cursor = "pointer";
              setHover(
                p.name + " · historical 2020 boundary · " + p.municipalityCode,
              );
            }
          });
          m.on("mouseleave", "municipal-fill", () => setHover(""));
        }
        municipalLevelLoaded.current = level;
        setMunicipalReady(true);
        setMunicipalError(false);
        container.current?.setAttribute("data-municipalities-loaded", "true");
        container.current?.setAttribute(
          "data-municipality-count",
          String(data.features.length),
        );
      })
      .catch(() => {
        if (!cancelled) setMunicipalError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [
    ready,
    s.country.code,
    s.municipalityLevel,
    s.camera.zoom,
    layerById(s.layers, "municipalities").visible,
    retry,
  ]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    m.setPaintProperty("land", "fill-color", [
      "case",
      ["==", ["get", "code"], s.country.code],
      "#335e54",
      "#1c2b32",
    ]);
    m.setFilter("selection", ["==", "code", s.country.code]);
    // Store writes from map gestures already match this camera. Jumping only on a
    // deliberate state change prevents moveend -> state -> camera feedback loops.
    if (!sameCamera(readCamera(m), s.camera)) m.jumpTo(s.camera);
    setLiveCamera(s.camera);
    container.current?.setAttribute("data-camera", JSON.stringify(s.camera));
  }, [s.camera, s.country.code, ready]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    const stats = layerById(s.layers, "statistics"),
      provinces = layerById(s.layers, "provinces"),
      geographic = s.country.code === "ZA";
    const groups: Record<string, string[]> = {
      countries: ["land", "borders"],
      provinces: ["province-fill", "province-borders"],
      municipalities: [
        "municipal-fill",
        "municipal-borders",
        "municipal-selection",
      ],
      statistics: ["statistics-fill"],
      connections: ["connection-lines"],
      cities: ["points-cities"],
      institutions: ["points-institutions"],
      mining: ["points-mining"],
      infrastructure: ["points-infrastructure"],
      evidence: ["selection", "hover", "province-selection"],
    };
    for (const layer of [...s.layers].sort((a, b) => a.zIndex - b.zIndex)) {
      for (const id of groups[layer.id] ?? []) {
        if (!m.getLayer(id)) continue;
        m.setLayoutProperty(
          id,
          "visibility",
          layer.visible &&
            (layer.id !== "municipalities" || municipalReady) &&
            (layer.id === "countries" || layer.id === "evidence" || geographic)
            ? "visible"
            : "none",
        );
        m.moveLayer(id);
        if (id.startsWith("points-")) {
          m.setPaintProperty(id, "circle-opacity", layer.opacity);
          m.setPaintProperty(id, "circle-stroke-opacity", layer.opacity);
        }
        if (
          [
            "borders",
            "province-borders",
            "province-selection",
            "selection",
            "connection-lines",
            "municipal-borders",
            "municipal-selection",
          ].includes(id)
        )
          m.setPaintProperty(id, "line-opacity", layer.opacity);
        if (id === "land")
          m.setPaintProperty(id, "fill-opacity", layer.opacity * 0.96);
      }
    }
    if (provinceReady) {
      const province = regions.find(
        (r) =>
          r.entityId === s.region || r.id === municipalById(s.region)?.region,
      );
      const filter: maplibregl.FilterSpecification = province
        ? ["==", "id", province.id]
        : ["has", "id"];
      m.setFilter("statistics-fill", filter);
      m.setFilter("province-fill", filter);
      m.setFilter("province-borders", filter);
      m.setFilter("province-selection", ["==", "id", province?.id ?? ""]);
      m.setPaintProperty(
        "province-fill",
        "fill-opacity",
        provinces.opacity * 0.08,
      );
      m.setPaintProperty("statistics-fill", "fill-opacity", stats.opacity);
      m.setPaintProperty(
        "statistics-fill",
        "fill-color",
        stats.metric === "population"
          ? [
              "step",
              ["get", "population" + stats.year],
              "#234a40",
              3e6,
              "#3a7059",
              6e6,
              "#5d9570",
              10e6,
              "#a0c389",
              14e6,
              "#d5dca0",
            ]
          : [
              "step",
              ["get", "changePercent"],
              "#254958",
              15,
              "#3d7376",
              25,
              "#81aaa0",
              35,
              "#d5dca0",
            ],
      );
      for (const id of ["province-fill", "province-borders", "statistics-fill"])
        m.setLayerZoomRange(id, 3, 13);
      const metric = metricById(stats.metric);
      if (metric) {
        const expression: unknown[] = ["match", ["get", "id"]];
        for (const r of regions)
          expression.push(
            r.id,
            metricColor(metric, metricValue(metric.id, r.id)),
          );
        expression.push("#596460");
        m.setPaintProperty(
          "statistics-fill",
          "fill-color",
          expression as maplibregl.ExpressionSpecification,
        );
      }
    }
    if (municipalReady) {
      const provinceId =
        regions.find((r) => r.entityId === s.region)?.id ??
        municipalById(s.region)?.region;
      const filter: maplibregl.FilterSpecification = provinceId
        ? ["==", "region", provinceId]
        : ["has", "entityId"];
      m.setFilter("municipal-fill", filter);
      m.setFilter("municipal-borders", filter);
      m.setPaintProperty(
        "municipal-fill",
        "fill-opacity",
        layerById(s.layers, "municipalities").opacity * 0.08,
      );
      m.setFilter("municipal-selection", [
        "==",
        "entityId",
        municipalById(s.selectedEntity)?.entityId ??
          municipalById(s.region)?.entityId ??
          "",
      ]);
    }
  }, [
    ready,
    provinceReady,
    municipalReady,
    s.layers,
    s.region,
    s.country.code,
    s.selectedEntity,
  ]);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    let popup: maplibregl.Popup | null = null;
    function draw() {
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      popup?.remove();
      popup = null;
      const state = useExplorer.getState(),
        bounds = m!.getBounds();
      const places = canvasPlaces({ ...state, camera: readCamera(m!) }, [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]);
      setVisibleCount(places.length);
      const groups: { places: MapPlace[]; x: number; y: number }[] = [];
      for (const place of places) {
        const point = m!.project(place.coordinate),
          group = groups.find(
            (g) =>
              placeLayer(g.places[0].entity) === placeLayer(place.entity) &&
              Math.hypot(g.x - point.x, g.y - point.y) <
                (state.density === "detailed" ? 28 : 40),
          );
        if (group) group.places.push(place);
        else groups.push({ places: [place], x: point.x, y: point.y });
      }
      const pointFeatures: FeatureCollection = {
        type: "FeatureCollection",
        features: [],
      };
      for (const group of groups) {
        const coordinate: [number, number] = [
          group.places.reduce((n, p) => n + p.coordinate[0], 0) /
            group.places.length,
          group.places.reduce((n, p) => n + p.coordinate[1], 0) /
            group.places.length,
        ];
        const records = group.places.map((p) => p.entity),
          regional = group.places.every((p) => p.regional),
          button = document.createElement("button"),
          layer = layerById(state.layers, placeLayer(records[0]));
        pointFeatures.features.push({
          type: "Feature",
          properties: { layerId: layer.id, count: records.length },
          geometry: { type: "Point", coordinates: coordinate },
        });
        button.className =
          "map-entity" +
          (records.length > 1
            ? " map-cluster"
            : m!.getZoom() > 6.2 || state.density === "detailed"
              ? " show-label"
              : "");
        if (
          layerById(state.layers, "evidence").visible &&
          records.some((e) => state.selectionIds.includes(e.id))
        )
          button.classList.add("is-selected");
        button.dataset.entityIds = records.map((e) => e.id).join(",");
        button.classList.add("native-map-marker");
        button.dataset.layerId = layer.id;
        button.style.opacity = String(layer.opacity);
        button.style.zIndex = String(10 + layer.zIndex);
        button.style.setProperty(
          "--marker-color",
          layerRegistry[layer.id].style.color,
        );
        button.title =
          (regional ? "Province locator · " : "") +
          records
            .map(
              (e) =>
                e.name + (e.coordinateNote ? " · " + e.coordinateNote : ""),
            )
            .join(" · ");
        button.setAttribute(
          "aria-label",
          records.length === 1
            ? "Open " + records[0].name
            : "Explore " + records.length + " nearby entities",
        );
        const dot = document.createElement("span");
        dot.className = "map-dot";
        const label = document.createElement("span");
        label.className = "map-marker-label";
        label.textContent =
          records.length > 1
            ? String(records.length)
            : records[0].name + (regional ? " · province locator" : "");
        button.append(dot, label);
        function open(id: string, add = false) {
          const current = useExplorer.getState();
          if (add)
            current.applyActions([
              {
                type: "SELECT_ENTITIES",
                payload: { ids: [...new Set([...current.selectionIds, id])] },
              },
            ]);
          else current.openEntity(id);
        }
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          if (records.length === 1) {
            open(
              records[0].id,
              event.ctrlKey || event.metaKey || event.shiftKey,
            );
            return;
          }
          const list = document.createElement("div");
          list.className = "map-cluster-list";
          const title = document.createElement("strong");
          title.textContent = regional
            ? "Province locators · exact site coordinates unavailable"
            : "Explore nearby entities";
          list.append(title);
          records.forEach((entity) => {
            const item = document.createElement("button");
            item.textContent = entity.name;
            item.addEventListener("click", (e) => {
              e.stopPropagation();
              open(entity.id, e.ctrlKey || e.shiftKey);
              popup?.remove();
            });
            list.append(item);
          });
          popup?.remove();
          popup = new maplibregl.Popup({ offset: 14, maxWidth: "280px" })
            .setLngLat(coordinate)
            .setDOMContent(list)
            .addTo(m!);
        });
        markers.current.push(
          new maplibregl.Marker({ element: button, anchor: "center" })
            .setLngLat(coordinate)
            .addTo(m!),
        );
      }
      (m!.getSource("marker-points") as GeoJSONSource)?.setData(pointFeatures);
      const pointById = new Map(
        places.filter((p) => !p.regional).map((p) => [p.entity.id, p]),
      );
      const layer = layerById(state.layers, "connections");
      const links =
        layer.visible && layer.opacity > 0
          ? canvasLinks(state, new Set(pointById.keys())).filter(
              (r) =>
                JSON.stringify(pointById.get(r.source)!.coordinate) !==
                JSON.stringify(pointById.get(r.target)!.coordinate),
            )
          : [];
      setConnectionCount(links.length);
      (m!.getSource("connections") as GeoJSONSource)?.setData({
        type: "FeatureCollection",
        features: links.map((r) => ({
          type: "Feature",
          properties: {
            id: r.id,
            highlighted:
              state.highlightedRelationshipIds.includes(r.id) ||
              state.selectedRelationship === r.id,
          },
          geometry: {
            type: "LineString",
            coordinates: [
              pointById.get(r.source)!.coordinate,
              pointById.get(r.target)!.coordinate,
            ],
          },
        })),
      });
      container.current?.setAttribute(
        "data-visible-count",
        String(places.length),
      );
      container.current?.setAttribute(
        "data-scope",
        geographicScope(m!.getZoom()),
      );
    }
    draw();
    m.on("moveend", draw);
    return () => {
      m.off("moveend", draw);
      popup?.remove();
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
    };
  }, [
    ready,
    s.layers,
    s.country.code,
    s.region,
    s.density,
    s.filters,
    s.selectionIds,
    s.isolatedEntityIds,
    s.highlightedRelationshipIds,
    s.timeRange,
    s.selectedRelationship,
  ]);
  const stats = layerById(s.layers, "statistics"),
    evidence = layerById(s.layers, "evidence"),
    selected = entityById(s.selectedEntity ?? ""),
    sources = selected ? getSources(selected.sourceIds) : [];
  const metric = metricById(stats.metric),
    statSource = metric ? getSources(metric.sourceIds)[0] : null;
  return (
    <div className="map-frame">
      <div
        ref={container}
        className="map-surface"
        aria-label="Interactive world map. Use country and province selectors for keyboard navigation."
      />
      <div className="map-topline">
        <span className="map-label">
          <span className="live-dot" />
          {hover || "Explore the world"}
        </span>
        <button
          className="map-layer"
          aria-label="Map layers"
          aria-expanded={layersOpen}
          onClick={() => setLayersOpen(!layersOpen)}
        >
          <Layers3 size={14} />
          <span>Layers</span>
        </button>
      </div>
      {s.country.code === "ZA" && (
        <div className="province-focus">
          <select
            aria-label="Focus province"
            value={
              entityById(s.region ?? "")?.type === "Province"
                ? (s.region ?? "all")
                : (regions.find((r) => r.id === municipalById(s.region)?.region)
                    ?.entityId ?? "all")
            }
            onChange={(e) => {
              if (e.target.value === "all")
                s.navigate(
                  {
                    region: null,
                    camera: {
                      center: s.country.center,
                      zoom: s.country.zoom,
                      bearing: 0,
                      pitch: 0,
                    },
                  },
                  "Return to country",
                );
              else
                s.applyActions([
                  {
                    type: "FOCUS_REGION",
                    payload: { entityId: e.target.value },
                  },
                ]);
            }}
          >
            <option value="all">All provinces</option>
            {regions.map((r) => (
              <option key={r.id} value={r.entityId}>
                {r.name}
              </option>
            ))}
          </select>
          {layerById(s.layers, "municipalities").visible && (
            <select
              className="municipal-focus"
              aria-label="Focus municipality"
              value={municipalById(s.region)?.entityId ?? ""}
              onChange={(e) => {
                if (e.target.value)
                  s.applyActions([
                    {
                      type: "FOCUS_REGION",
                      payload: { entityId: e.target.value },
                    },
                  ]);
              }}
            >
              <option value="">Choose municipality</option>
              {municipalGeography
                .filter(
                  (m) =>
                    (s.municipalityLevel === "district"
                      ? m.category !== "B"
                      : m.category !== "C") &&
                    (!s.region ||
                      m.region ===
                        (regions.find((r) => r.entityId === s.region)?.id ??
                          municipalById(s.region)?.region)),
                )
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((m) => (
                  <option key={m.entityId} value={m.entityId}>
                    {m.name} · {m.municipalityCode}
                  </option>
                ))}
            </select>
          )}
        </div>
      )}
      <div className="map-density-status" aria-label="Map scope and density">
        {geographicScope(liveCamera.zoom)} · {s.density} · {visibleCount}{" "}
        records
        {layerById(s.layers, "connections").visible
          ? " · " + connectionCount + " abstract connections"
          : ""}
      </div>
      {layersOpen && <LayerControls close={() => setLayersOpen(false)} />}
      {evidence.visible && selected && !layersOpen && (
        <aside
          className="map-selection-card"
          style={{ opacity: evidence.opacity }}
          aria-label="Map selection evidence"
        >
          <span className="eyebrow">
            SHARED SELECTION · {s.selectionIds.length}
          </span>
          <strong>{selected.name}</strong>
          <small>
            {selected.coordinateNote ??
              (selected.coordinates
                ? "Published representative locator"
                : municipalById(selected.id)
                  ? "Historical 2020 municipality boundary · not a facility locator"
                  : "No verified exact location")}
          </small>
          {sources.slice(0, 1).map((source) => (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noreferrer"
            >
              {source.publisher} · evidence ↗
            </a>
          ))}
          <div>
            <button
              onClick={() =>
                s.applyActions([
                  {
                    type: "ISOLATE_ENTITIES",
                    payload: {
                      ids: s.isolatedEntityIds.length ? [] : s.selectionIds,
                    },
                  },
                ])
              }
            >
              {s.isolatedEntityIds.length
                ? "Show all records"
                : "Isolate selection"}
            </button>
            <button
              onClick={() =>
                s.applyActions([{ type: "CLEAR_SELECTION", payload: {} }])
              }
            >
              Clear selection
            </button>
          </div>
        </aside>
      )}
      {s.country.code === "ZA" && stats.visible && (
        <div className="map-legend" aria-label="Map data legend">
          <strong>
            {metric
              ? metric.name + " · " + metric.periodLabel
              : stats.metric === "population"
                ? "Population · Census " + stats.year
                : "Population change · Census 2011–2022"}
          </strong>
          <div
            style={
              metric
                ? {
                    background:
                      "linear-gradient(to right,#284e55,#407578,#78a294,#a7c18f,#d6dfa8)",
                  }
                : undefined
            }
            className={
              "legend-ramp " + (stats.metric === "change" ? "change" : "")
            }
          />
          <span>
            {metric
              ? "Equal intervals · " +
                metricExtent(metric)
                  .map((v) => formatMetric(v, metric.precision))
                  .join(" → ") +
                " · grey = unavailable"
              : stats.metric === "population"
                ? "<3m · 3–6m · 6–10m · 10–14m · ≥14m people"
                : "<15% · 15–25% · 25–35% · ≥35% growth"}
          </span>
          <a
            href={
              statSource?.url ??
              "https://www.gov.za/sites/default/files/P03014_Census_2022_Statistical_Release.pdf"
            }
            target="_blank"
            rel="noreferrer"
          >
            {metric
              ? "Stats SA · " + metric.periodLabel + " ↗"
              : "Stats SA · Table 2.2 ↗"}
          </a>
          {metric && (
            <details>
              <summary>Measure & source</summary>
              <p>{metric.definition}</p>
              <p>{metric.denominator}</p>
              <p>{metric.caveats.join(" ")}</p>
              <p>Provincial values; no municipality estimates.</p>
            </details>
          )}
        </div>
      )}
      <button
        className="world-control"
        onClick={() =>
          s.applyActions([
            {
              type: "FLY_TO",
              payload: { center: [15, 5], zoom: 1.5, bearing: 0, pitch: 0 },
            },
          ])
        }
      >
        <RotateCcw size={13} />
        World view
      </button>
      {provinceError && (
        <button
          className="province-error"
          onClick={() => setRetry((n) => n + 1)}
        >
          Province boundaries unavailable · Retry
        </button>
      )}
      {municipalError && (
        <button
          className="province-error"
          onClick={() => {
            municipalLevelLoaded.current = "";
            setRetry((n) => n + 1);
          }}
        >
          Municipal boundaries unavailable · Retry
        </button>
      )}
      {error && (
        <div className="map-error" role="alert">
          <AlertCircle size={26} />
          <h3>Map unavailable</h3>
          <p>{error}</p>
          <button
            onClick={() => {
              setError("");
              setRetry((n) => n + 1);
            }}
          >
            Retry map
          </button>
          <button onClick={() => s.setMode("hierarchy")}>
            Explore knowledge instead
          </button>
        </div>
      )}
    </div>
  );
}
