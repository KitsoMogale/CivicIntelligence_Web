import {
  countries,
  domains,
  entityById,
  relationships,
  regions,
} from "./knowledge";
import {
  normalizeExploration,
  initialExploration,
  type Exploration,
} from "./exploration";
import { validateActions, type CanvasAction } from "./actions";
import { legacyFlags } from "./canvas";
export function entityExpansion(state: Exploration, id: string) {
  const expanded = new Set(state.expanded),
    pending = [id],
    visited = new Set<string>();
  while (pending.length) {
    const target = pending.shift()!;
    if (visited.has(target)) continue;
    visited.add(target);
    for (const r of relationships.filter((r) => r.target === target)) {
      expanded.add(r.source);
      pending.push(r.source);
    }
  }
  return [...expanded];
}
export function focusCamera(state: Exploration, id: string | null) {
  const e = id ? entityById(id) : null,
    region = regions.find((r) => r.entityId === id || r.id === e?.region);
  return {
    center: e?.coordinates ?? region?.center ?? state.country.center,
    zoom: e ? (e.type === "Province" ? 6 : 8) : state.country.zoom,
    bearing: 0,
    pitch: 0,
  };
}
export function reduceCanvas(state: Exploration, input: unknown): Exploration {
  const actions = validateActions(input, state.country.code);
  let next = structuredClone(state);
  for (const a of actions) {
    switch (a.type) {
      case "SELECT_COUNTRY": {
        const country = countries.find(
          (c) => c.code === a.payload.countryCode,
        )!;
        next = {
          ...next,
          country,
          mode: "geographic",
          region: null,
          selectedEntity: null,
          selectedRelationship: null,
          selectionIds: [],
          isolatedEntityIds: [],
          highlightedRelationshipIds: [],
          expanded:
            country.code === "ZA" ? [...initialExploration.expanded] : [],
          timelineEntity: null,
          timelineYear: null,
          filters: { query: "", entityType: "", relationshipType: "" },
          camera: {
            center: country.center,
            zoom: country.zoom,
            bearing: 0,
            pitch: 0,
          },
        };
        break;
      }
      case "SET_VISUALIZATION_MODE": {
        next.mode = a.payload.mode;
        next.domain =
          a.payload.mode === "flow"
            ? "infrastructure"
            : a.payload.mode === "data"
              ? "society"
              : next.domain;
        next.expanded = [
          ...new Set([
            ...next.expanded,
            domains.find((d) => d.id === next.domain)!.root,
          ]),
        ];
        break;
      }
      case "OPEN_ENTITY": {
        const entity = entityById(a.payload.entityId)!;
        next = {
          ...next,
          selectedEntity: entity.id,
          selectionIds: [entity.id],
          selectedRelationship: null,
          domain: next.mode === "data" ? "society" : entity.domain,
          expanded: entityExpansion(next, entity.id),
        };
        break;
      }
      case "EXPAND_NODE":
        next.expanded = [...new Set([...next.expanded, a.payload.nodeId])];
        break;
      case "FOCUS_REGION":
        next = {
          ...next,
          region: a.payload.entityId,
          mode: next.layout === "overlay" ? next.mode : "geographic",
          selectedEntity: a.payload.entityId,
          selectionIds: [a.payload.entityId],
          selectedRelationship: null,
          domain:
            next.layout === "overlay" && next.mode === "data"
              ? "society"
              : entityById(a.payload.entityId)!.domain,
          expanded: [
            ...new Set([
              ...entityExpansion(next, a.payload.entityId),
              a.payload.entityId,
            ]),
          ],
          camera: focusCamera(next, a.payload.entityId),
        };
        break;
      case "CREATE_CHART":
        next = {
          ...next,
          datasetId: a.payload.datasetId,
          mode: "data",
          domain: "society",
        };
        break;
      case "FLY_TO":
        next.camera = a.payload;
        break;
      case "FIT_CANVAS":
        if (next.mode === "geographic")
          next.camera = focusCamera(next, next.selectedEntity ?? next.region);
        break;
      case "RESET_VIEW":
        next = structuredClone(initialExploration);
        break;
      case "SET_LAYOUT":
        next.layout = a.payload.layout;
        break;
      case "SET_INFORMATION_DENSITY":
        next.density = a.payload.density;
        break;
      case "SET_LAYER_VISIBILITY":
        next.layers = next.layers.map((l) =>
          l.id === a.payload.id ? { ...l, visible: a.payload.visible } : l,
        );
        break;
      case "SET_LAYER_OPACITY":
        next.layers = next.layers.map((l) =>
          l.id === a.payload.id ? { ...l, opacity: a.payload.opacity } : l,
        );
        break;
      case "SET_LAYER_FILTERS":
        next.layers = next.layers.map((l) =>
          l.id === a.payload.id ? { ...l, filters: a.payload.filters } : l,
        );
        break;
      case "SET_STATISTIC":
        next.layers = next.layers.map((l) =>
          l.id === "statistics" ? { ...l, ...a.payload } : l,
        );
        break;
      case "REORDER_LAYERS":
        next.layers = next.layers.map((l) => ({
          ...l,
          zIndex: a.payload.ids.indexOf(l.id),
        }));
        break;
      case "SET_FILTERS":
        next.filters = a.payload;
        break;
      case "SET_TIME_RANGE":
        next.timeRange = a.payload.range;
        break;
      case "SELECT_ENTITIES":
        next.selectionIds = [...new Set(a.payload.ids)];
        next.selectedEntity = next.selectionIds[0];
        next.selectedRelationship = null;
        for (const id of next.selectionIds)
          next.expanded = entityExpansion(next, id);
        next.domain =
          next.mode === "data"
            ? "society"
            : entityById(next.selectedEntity)!.domain;
        break;
      case "ISOLATE_ENTITIES":
        next.isolatedEntityIds = [...new Set(a.payload.ids)];
        break;
      case "HIGHLIGHT_RELATIONSHIPS":
        next.highlightedRelationshipIds = [...new Set(a.payload.ids)];
        break;
      case "CLEAR_SELECTION":
        next = {
          ...next,
          selectedEntity: null,
          selectedRelationship: null,
          selectionIds: [],
          highlightedRelationshipIds: [],
          isolatedEntityIds: [],
        };
        break;
      case "UNDO":
      case "REDO":
        throw new Error("History must be dispatched by the exploration store");
    }
  }
  return normalizeExploration({ ...next, ...legacyFlags(next.layers) });
}
export function actionLabel(actions: CanvasAction[]) {
  return actions
    .map((a) => a.type.toLowerCase().replaceAll("_", " "))
    .join(" · ");
}
