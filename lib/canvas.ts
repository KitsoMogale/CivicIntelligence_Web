import { z } from "zod";
import { metricSchema } from "./statistics";

export const cameraSchema = z
  .object({
    center: z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-85).max(85),
    ]),
    zoom: z.number().min(1.2).max(19),
    bearing: z.number().min(-180).max(180).default(0),
    pitch: z.number().min(0).max(60).default(0),
  })
  .strict();
export type Camera = z.infer<typeof cameraSchema>;
export const densitySchema = z.enum(["overview", "regional", "detailed"]);
export const layoutSchema = z.enum(["single", "overlay", "split"]);
export const layerIdSchema = z.enum([
  "countries",
  "provinces",
  "municipalities",
  "wards",
  "statistics",
  "cities",
  "institutions",
  "mining",
  "infrastructure",
  "connections",
  "evidence",
]);
export type LayerId = z.infer<typeof layerIdSchema>;
export const filterSchema = z
  .object({
    query: z.string().max(120).default(""),
    entityType: z.string().max(100).default(""),
    relationshipType: z.string().max(100).default(""),
  })
  .strict();
export const layerSchema = z
  .object({
    id: layerIdSchema,
    visible: z.boolean(),
    opacity: z.number().min(0).max(1),
    zIndex: z.number().int().min(0).max(20),
    filters: filterSchema.default({
      query: "",
      entityType: "",
      relationshipType: "",
    }),
    metric: metricSchema.default("population"),
    year: z.union([z.literal(2011), z.literal(2022)]).default(2022),
  })
  .strict();
export type CanvasLayer = z.infer<typeof layerSchema>;
export const layersSchema = z.preprocess(
  (value) => {
    if (
      !Array.isArray(value) ||
      ![9, 10].includes(value.length) ||
      value.some((l) => !l || typeof l !== "object")
    )
      return value;
    const old = [...value].sort((a, b) => a.zIndex - b.zIndex);
    for (const id of ["municipalities", "wards"] as const)
      if (!old.some((l) => l.id === id))
        old.splice(
          old.findIndex(
            (l) =>
              l.id ===
              (id === "municipalities" ? "provinces" : "municipalities"),
          ) + 1,
          0,
          defaultLayers().find((l) => l.id === id)!,
        );
    return old.map((l, zIndex) => ({ ...l, zIndex }));
  },
  z
    .array(layerSchema)
    .length(11)
    .refine(
      (layers) => new Set(layers.map((l) => l.id)).size === 11,
      "Every registered layer must occur once",
    )
    .refine(
      (layers) => new Set(layers.map((l) => l.zIndex)).size === 11,
      "Layer order must be unique",
    ),
);
export const layerRegistry: Record<
  LayerId,
  {
    name: string;
    type: string;
    sourceId: string;
    legend: string;
    minZoom: number;
    maxZoom: number;
    style: { color: string };
  }
> = {
  countries: {
    name: "Country geography",
    type: "geography",
    sourceId: "natural-earth",
    legend: "Simplified country boundaries · Natural Earth · public domain",
    minZoom: 1.2,
    maxZoom: 19,
    style: { color: "#335e54" },
  },
  provinces: {
    name: "Province boundaries",
    type: "geography",
    sourceId: "province-boundaries",
    legend: "2020 province geometry · simplified · CC BY 4.0 / CC BY 3.0 IGO",
    minZoom: 3,
    maxZoom: 19,
    style: { color: "#749b87" },
  },
  statistics: {
    name: "Provincial statistics",
    type: "statistics",
    sourceId: "census",
    legend:
      "Stats SA Census · provincial counts or 2011–2022 percentage change",
    minZoom: 3,
    maxZoom: 19,
    style: { color: "#a0c389" },
  },
  municipalities: {
    name: "Municipal boundaries",
    type: "geography",
    sourceId: "municipal-boundaries",
    legend:
      "Historical representative 2020 geometry · source 2018 · joined to 2026 directory · not current legal demarcation",
    minZoom: 4.5,
    maxZoom: 19,
    style: { color: "#9fb6ab" },
  },
  cities: {
    name: "Cities & towns",
    type: "entities",
    sourceId: "natural-earth-cities",
    legend: "Representative settlement points · Natural Earth",
    minZoom: 3,
    maxZoom: 19,
    style: { color: "#85b9d6" },
  },
  wards: {
    name: "Ward boundaries",
    type: "geography",
    sourceId: "mdb-wards-2026",
    legend:
      "MDB 2026 ward edition · choose a local municipality or metro · zoom in for detail",
    minZoom: 7,
    maxZoom: 19,
    style: { color: "#e6bf76" },
  },
  institutions: {
    name: "Institutions",
    type: "entities",
    sourceId: "entity",
    legend:
      "Published institutional locators · inspect each record for evidence",
    minZoom: 3,
    maxZoom: 19,
    style: { color: "#aed7bc" },
  },
  mining: {
    name: "Mining operations",
    type: "entities",
    sourceId: "entity",
    legend: "Province locators only · exact mine positions are unavailable",
    minZoom: 3,
    maxZoom: 19,
    style: { color: "#d9b576" },
  },
  infrastructure: {
    name: "Power stations",
    type: "entities",
    sourceId: "entity",
    legend: "Published project/site points; Duvha uses a province locator",
    minZoom: 3,
    maxZoom: 19,
    style: { color: "#d8a68b" },
  },
  connections: {
    name: "Documented connections",
    type: "relationships",
    sourceId: "relationship",
    legend:
      "Dashed lines link published endpoint locators; they are not physical routes",
    minZoom: 3,
    maxZoom: 19,
    style: { color: "#96b7cc" },
  },
  evidence: {
    name: "Selection & evidence",
    type: "knowledge",
    sourceId: "entity",
    legend: "Shared selection and source-linked details",
    minZoom: 1.2,
    maxZoom: 19,
    style: { color: "#dcf1b2" },
  },
};
export function defaultLayers(): CanvasLayer[] {
  return layerIdSchema.options.map((id, zIndex) => ({
    id,
    visible: !["statistics", "connections", "municipalities", "wards"].includes(
      id,
    ),
    opacity: id === "statistics" ? 0.72 : 1,
    zIndex,
    filters: { query: "", entityType: "", relationshipType: "" },
    metric: "population",
    year: 2022,
  }));
}
export function layerById(layers: CanvasLayer[], id: LayerId) {
  return layers.find((l) => l.id === id)!;
}
export function legacyLayers(
  input: {
    provinceLayer?: boolean;
    populationLayer?: "none" | "population" | "change";
    markerLayer?: string;
  },
  current = defaultLayers(),
) {
  return current.map((layer) => {
    if (layer.id === "provinces" && input.provinceLayer !== undefined)
      return { ...layer, visible: input.provinceLayer };
    if (layer.id === "statistics" && input.populationLayer !== undefined)
      return {
        ...layer,
        visible: input.populationLayer !== "none",
        metric:
          input.populationLayer === "change"
            ? ("change" as const)
            : ("population" as const),
      };
    if (
      ["cities", "institutions", "mining", "infrastructure"].includes(
        layer.id,
      ) &&
      input.markerLayer !== undefined
    )
      return {
        ...layer,
        visible: input.markerLayer === "all" || input.markerLayer === layer.id,
      };
    return layer;
  });
}
export function legacyFlags(layers: CanvasLayer[]) {
  const markers = layers.filter(
    (l) =>
      ["cities", "institutions", "mining", "infrastructure"].includes(l.id) &&
      l.visible,
  );
  const stats = layerById(layers, "statistics");
  return {
    provinceLayer: layerById(layers, "provinces").visible,
    populationLayer: stats.visible
      ? stats.metric === "change"
        ? ("change" as const)
        : ("population" as const)
      : ("none" as const),
    markerLayer:
      markers.length === 0
        ? ("none" as const)
        : markers.length === 1
          ? (markers[0].id as
              "cities" | "institutions" | "mining" | "infrastructure")
          : ("all" as const),
  };
}
export function geographicScope(zoom: number) {
  return zoom < 3
    ? "World"
    : zoom < 5.7
      ? "Country"
      : zoom < 8
        ? "Province / region"
        : zoom < 13
          ? "City / district"
          : "Streets / neighborhood";
}
export function sameCamera(a: Camera, b: Camera) {
  return (
    Math.abs(a.center[0] - b.center[0]) < 0.00001 &&
    Math.abs(a.center[1] - b.center[1]) < 0.00001 &&
    Math.abs(a.zoom - b.zoom) < 0.001 &&
    Math.abs(a.bearing - b.bearing) < 0.01 &&
    Math.abs(a.pitch - b.pitch) < 0.01
  );
}
