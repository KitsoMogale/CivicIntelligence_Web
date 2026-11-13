import { descendants, domains, entities, relationships } from "./knowledge";
import type { Domain, Mode } from "./types";
import type { Exploration } from "./exploration";
import {
  mapPlaces,
  canvasPlaces,
  matchesFilters,
  inRegion,
  canvasLinks,
} from "./map-data";
import { entityById } from "./knowledge";
export function visibleEntityIds(context: {
  countryCode: string;
  domain: Domain;
  mode: Mode;
  expanded: string[];
  markerLayer?: Exploration["markerLayer"];
  provinceLayer?: boolean;
  canvas?: Exploration;
}) {
  if (
    context.countryCode !== "ZA" ||
    ["data", "compare", "timeline"].includes(context.mode)
  )
    return [];
  if (context.mode === "geographic")
    return context.canvas
      ? canvasPlaces(context.canvas).map((p) => p.entity.id)
      : mapPlaces(
          context.countryCode,
          context.markerLayer,
          context.provinceLayer,
        ).map((place) => place.entity.id);
  const root = domains.find((d) => d.id === context.domain)!.root;
  const all = descendants(root);
  if (context.mode === "flow")
    return context.domain === "infrastructure"
      ? [
          ...new Set(
            relationships
              .filter(
                (r) =>
                  r.type === "SUPPLIES" &&
                  all.includes(r.source) &&
                  all.includes(r.target),
              )
              .flatMap((r) => [r.source, r.target]),
          ),
        ]
      : all;
  const ids = new Set([root]);
  const pending = [root];
  while (pending.length) {
    const id = pending.shift()!;
    if (!context.expanded.includes(id)) continue;
    for (const r of relationships.filter((r) => r.source === id)) {
      if (!ids.has(r.target)) {
        ids.add(r.target);
        pending.push(r.target);
      }
    }
  }
  if (!context.canvas) return [...ids];
  const s = context.canvas;
  let result = [...ids].filter((id) => {
    const e = entityById(id)!;
    return (
      matchesFilters(e, s.filters) &&
      inRegion(e, s.region) &&
      (!s.isolatedEntityIds.length || s.isolatedEntityIds.includes(id))
    );
  });
  if (s.filters.relationshipType || s.timeRange) {
    const linked = new Set(
      canvasLinks(s, new Set(result)).flatMap((r) => [r.source, r.target]),
    );
    result = result.filter((id) => linked.has(id));
  }
  return result;
}
