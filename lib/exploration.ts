import { z } from "zod";
import {
  countries,
  datasets,
  domains,
  entityById,
  indicators,
  relationships,
} from "./knowledge";
import { modeSchema } from "./actions";
import type { Country, Domain, Mode } from "./types";
import {
  cameraSchema,
  densitySchema,
  layoutSchema,
  layersSchema,
  filterSchema,
  defaultLayers,
  legacyLayers,
  legacyFlags,
  type Camera,
  type CanvasLayer,
} from "./canvas";
export type Exploration = {
  country: Country;
  domain: Domain;
  mode: Mode;
  selectedEntity: string | null;
  selectedRelationship: string | null;
  expanded: string[];
  region: string | null;
  datasetId: string;
  comparisonCountries: string[];
  indicatorCode: string;
  comparisonYear: number | null;
  comparisonDisplay: "snapshot" | "history";
  chartType: "bar" | "pie" | "trend";
  timelineYear: number | null;
  timelineEntity: string | null;
  provinceLayer: boolean;
  populationLayer: "none" | "population" | "change";
  markerLayer:
    "all" | "institutions" | "cities" | "mining" | "infrastructure" | "none";
  camera: Camera;
  layers: CanvasLayer[];
  density: "overview" | "regional" | "detailed";
  layout: "single" | "overlay";
  filters: { query: string; entityType: string; relationshipType: string };
  selectionIds: string[];
  isolatedEntityIds: string[];
  highlightedRelationshipIds: string[];
  timeRange: [string, string] | null;
};
export const initialExploration: Exploration = {
  country: countries[0],
  domain: "government",
  mode: "geographic",
  selectedEntity: null,
  expanded: ["za-government", "za-national"],
  region: null,
  datasetId: "za-census-2022",
  selectedRelationship: null,
  comparisonCountries: ["ZA", "BW"],
  indicatorCode: "SP.POP.TOTL",
  comparisonYear: null,
  comparisonDisplay: "snapshot",
  chartType: "bar",
  timelineYear: null,
  timelineEntity: null,
  provinceLayer: true,
  populationLayer: "none",
  markerLayer: "all",
  camera: { center: [25, -29], zoom: 4.1, bearing: 0, pitch: 0 },
  layers: defaultLayers(),
  density: "regional",
  layout: "single",
  filters: { query: "", entityType: "", relationshipType: "" },
  selectionIds: [],
  isolatedEntityIds: [],
  highlightedRelationshipIds: [],
  timeRange: null,
};
const schema = z.object({
  camera: cameraSchema.optional(),
  layers: layersSchema.optional(),
  density: densitySchema.default("regional"),
  layout: layoutSchema.default("single"),
  filters: filterSchema.default({
    query: "",
    entityType: "",
    relationshipType: "",
  }),
  selectionIds: z.array(z.string()).max(200).default([]),
  isolatedEntityIds: z.array(z.string()).max(200).default([]),
  highlightedRelationshipIds: z.array(z.string()).max(200).default([]),
  timeRange: z.tuple([z.iso.date(), z.iso.date()]).nullable().default(null),
  country: z.object({ code: z.string() }),
  domain: z.enum([
    "government",
    "economy",
    "industry",
    "infrastructure",
    "law",
    "society",
  ]),
  mode: modeSchema,
  selectedEntity: z.string().nullable(),
  selectedRelationship: z.string().nullable().default(null),
  expanded: z.array(z.string()).max(2000),
  region: z.string().nullable(),
  datasetId: z.string(),
  comparisonCountries: z.array(z.string()).min(2).max(3).default(["ZA", "BW"]),
  indicatorCode: z.string().default("SP.POP.TOTL"),
  comparisonYear: z.number().int().min(1960).max(2100).nullable().default(null),
  comparisonDisplay: z.enum(["snapshot", "history"]).default("snapshot"),
  chartType: z.enum(["bar", "pie", "trend"]).default("bar"),
  timelineYear: z.number().int().min(1900).max(2100).nullable().default(null),
  timelineEntity: z.string().nullable().default(null),
  provinceLayer: z.boolean().default(true),
  populationLayer: z.enum(["none", "population", "change"]).default("none"),
  markerLayer: z
    .enum(["all", "institutions", "cities", "mining", "infrastructure", "none"])
    .default("all"),
});
export function normalizeExploration(input: unknown): Exploration {
  const value = schema.parse(input);
  const country = countries.find((c) => c.code === value.country.code);
  if (!country) throw new Error("Unknown country in exploration");
  for (const id of [
    value.selectedEntity,
    value.region,
    value.timelineEntity,
    ...value.selectionIds,
    ...value.isolatedEntityIds,
    ...value.expanded,
  ])
    if (id && entityById(id)?.country !== country.code)
      throw new Error("Entity outside exploration country");
  if (!datasets.some((d) => d.id === value.datasetId))
    throw new Error("Unknown exploration dataset");
  if (value.timeRange && value.timeRange[0] > value.timeRange[1])
    throw new Error("Time range must start before it ends");
  if (
    value.highlightedRelationshipIds.some(
      (id) =>
        !relationships.some(
          (r) => r.id === id && entityById(r.source)?.country === country.code,
        ),
    )
  )
    throw new Error("Unknown highlighted relationship");
  if (
    value.selectedRelationship &&
    !relationships.some(
      (r) =>
        r.id === value.selectedRelationship &&
        entityById(r.source)?.country === country.code &&
        entityById(r.target)?.country === country.code,
    )
  )
    throw new Error("Unknown relationship in exploration");
  if (
    !value.comparisonCountries.every((c) =>
      countries.some((known) => known.code === c),
    )
  )
    throw new Error("Unknown comparison country");
  if (
    new Set(value.comparisonCountries).size !== value.comparisonCountries.length
  )
    throw new Error("Choose different countries to compare");
  if (
    indicators.length &&
    !indicators.some((i) => i.code === value.indicatorCode)
  )
    throw new Error("Unknown indicator");
  if (
    country.code !== "ZA" &&
    !["geographic", "compare", "timeline"].includes(value.mode)
  )
    throw new Error("Detailed country coverage is unavailable");
  const layers = value.layers ?? legacyLayers(value);
  return {
    ...value,
    ...legacyFlags(layers),
    country,
    layers,
    camera: value.camera ?? {
      center: country.center,
      zoom: country.zoom,
      bearing: 0,
      pitch: 0,
    },
    selectionIds: [
      ...new Set([
        ...value.selectionIds,
        ...(value.selectedEntity ? [value.selectedEntity] : []),
      ]),
    ],
  };
}
export function explorationSnapshot(s: Exploration): Exploration {
  return Object.fromEntries(
    Object.keys(initialExploration).map((key) => [
      key,
      s[key as keyof Exploration],
    ]),
  ) as Exploration;
}
