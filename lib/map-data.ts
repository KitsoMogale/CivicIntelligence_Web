import { entities, regions, relationships, entityById } from "./knowledge";
import type { Entity } from "./types";
import type { Exploration } from "./exploration";
import { layerById, layerRegistry, type LayerId } from "./canvas";
export type MapPlace = {
  entity: Entity;
  coordinate: [number, number];
  regional: boolean;
};
export function mapPlaces(
  country: string,
  markerLayer: Exploration["markerLayer"] = "all",
  provinceLayer = true,
): MapPlace[] {
  if (country !== "ZA" || markerLayer === "none") return [];
  return entities
    .filter((e) => e.country === country)
    .flatMap((entity) => {
      const city =
          entity.type === "City" || entity.type === "Regional city locator",
        mining = entity.domain === "industry",
        infrastructure = entity.type === "Power station";
      if (
        (markerLayer === "cities" && !city) ||
        (markerLayer === "mining" && !mining) ||
        (markerLayer === "infrastructure" && !infrastructure) ||
        (markerLayer === "institutions" &&
          (city || mining || infrastructure || entity.type === "Province"))
      )
        return [];
      if (provinceLayer && entity.type === "Province") return [];
      const region = regions.find((r) => r.id === entity.region);
      const coordinate =
        entity.coordinates ??
        ((mining || infrastructure) && region ? region.center : undefined);
      return coordinate
        ? [{ entity, coordinate, regional: !entity.coordinates }]
        : [];
    });
}
export function placeLayer(e: Entity): LayerId {
  return ["City", "Regional city locator"].includes(e.type)
    ? "cities"
    : e.type === "Power station"
      ? "infrastructure"
      : e.domain === "industry"
        ? "mining"
        : "institutions";
}
export function matchesFilters(
  entity: Entity,
  filters: Exploration["filters"],
) {
  return (
    (!filters.entityType || entity.type === filters.entityType) &&
    (!filters.query ||
      [
        entity.name,
        entity.type,
        entity.description,
        ...Object.values(entity.attributes ?? {}),
      ]
        .join(" ")
        .toLowerCase()
        .includes(filters.query.toLowerCase()))
  );
}
export function inRegion(entity: Entity, regionId: string | null) {
  const province = regions.find((r) => r.entityId === regionId);
  return !province || entity.id === regionId || entity.region === province.id;
}
export function canvasPlaces(
  s: Exploration,
  bounds?: [number, number, number, number],
): MapPlace[] {
  const places = mapPlaces(s.country.code, "all", true).filter((p) => {
    const layer = layerById(s.layers, placeLayer(p.entity)),
      meta = layerRegistry[layer.id];
    return (
      layer.visible &&
      layer.opacity > 0 &&
      s.camera.zoom >= meta.minZoom &&
      s.camera.zoom <= meta.maxZoom &&
      matchesFilters(p.entity, s.filters) &&
      matchesFilters(p.entity, layer.filters) &&
      inRegion(p.entity, s.region) &&
      (!s.isolatedEntityIds.length ||
        s.isolatedEntityIds.includes(p.entity.id)) &&
      (!bounds ||
        (p.coordinate[0] >= bounds[0] &&
          p.coordinate[0] <= bounds[2] &&
          p.coordinate[1] >= bounds[1] &&
          p.coordinate[1] <= bounds[3]))
    );
  });
  const limit =
    s.density === "overview"
      ? 12
      : s.density === "regional"
        ? s.camera.zoom < 5.7
          ? 60
          : 120
        : 250;
  return places
    .sort(
      (a, b) =>
        Number(s.selectionIds.includes(b.entity.id)) -
          Number(s.selectionIds.includes(a.entity.id)) ||
        layerById(s.layers, placeLayer(b.entity)).zIndex -
          layerById(s.layers, placeLayer(a.entity)).zIndex,
    )
    .slice(0, limit);
}
export function relationshipInTime(
  r: { validFrom?: string; validTo?: string; asOf?: string },
  range: Exploration["timeRange"],
) {
  if (!range) return true;
  // A reporting date is a snapshot, not evidence of continuous validity.
  if (r.asOf) return r.asOf >= range[0] && r.asOf <= range[1];
  return (
    !!(r.validFrom || r.validTo) &&
    (!r.validFrom || r.validFrom <= range[1]) &&
    (!r.validTo || r.validTo >= range[0])
  );
}
export function canvasLinks(s: Exploration, ids?: Set<string>) {
  const layer = layerById(s.layers, "connections");
  return relationships.filter(
    (r) =>
      entityById(r.source)?.country === s.country.code &&
      (!ids || (ids.has(r.source) && ids.has(r.target))) &&
      (!s.filters.relationshipType || r.type === s.filters.relationshipType) &&
      (!layer.filters.relationshipType ||
        r.type === layer.filters.relationshipType) &&
      relationshipInTime(r, s.timeRange),
  );
}
