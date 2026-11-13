import { z } from "zod";
import { countries, datasets, entityById, entities } from "./knowledge";
import { relationships } from "./knowledge";
import { networkSchema } from "./network";
import { metricSchema } from "./statistics";
import { municipalById } from "./geography";
import { wardById } from "./boundaries";
import {
  cameraSchema,
  densitySchema,
  layoutSchema,
  layerIdSchema,
  filterSchema,
} from "./canvas";

export const modeSchema = z.enum([
  "geographic",
  "hierarchy",
  "relationships",
  "flow",
  "data",
  "compare",
  "timeline",
]);
export const actionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("SELECT_WARD"),
      payload: z.object({ id: z.string() }).strict(),
    })
    .strict(),
  z
    .object({ type: z.literal("TRACE_NETWORK"), payload: networkSchema })
    .strict(),
  z.object({ type: z.literal("FLY_TO"), payload: cameraSchema }).strict(),
  z
    .object({
      type: z.literal("SET_LAYER_VISIBILITY"),
      payload: z.object({ id: layerIdSchema, visible: z.boolean() }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("SET_LAYER_OPACITY"),
      payload: z
        .object({ id: layerIdSchema, opacity: z.number().min(0).max(1) })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("REORDER_LAYERS"),
      payload: z
        .object({
          ids: z
            .array(layerIdSchema)
            .length(11)
            .refine((ids) => new Set(ids).size === 11),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("SET_LAYER_FILTERS"),
      payload: z.object({ id: layerIdSchema, filters: filterSchema }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("SET_STATISTIC"),
      payload: z
        .object({
          metric: metricSchema,
          year: z.union([z.literal(2011), z.literal(2022)]),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("SET_INFORMATION_DENSITY"),
      payload: z.object({ density: densitySchema }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("SET_LAYOUT"),
      payload: z.object({ layout: layoutSchema }).strict(),
    })
    .strict(),
  z.object({ type: z.literal("SET_FILTERS"), payload: filterSchema }).strict(),
  z
    .object({
      type: z.literal("SET_TIME_RANGE"),
      payload: z
        .object({ range: z.tuple([z.iso.date(), z.iso.date()]).nullable() })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("SELECT_ENTITIES"),
      payload: z.object({ ids: z.array(z.string()).min(1).max(200) }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("ISOLATE_ENTITIES"),
      payload: z.object({ ids: z.array(z.string()).max(200) }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("HIGHLIGHT_RELATIONSHIPS"),
      payload: z.object({ ids: z.array(z.string()).max(200) }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("CLEAR_SELECTION"),
      payload: z.object({}).strict(),
    })
    .strict(),
  z
    .object({ type: z.literal("RESET_VIEW"), payload: z.object({}).strict() })
    .strict(),
  z
    .object({ type: z.literal("UNDO"), payload: z.object({}).strict() })
    .strict(),
  z
    .object({ type: z.literal("REDO"), payload: z.object({}).strict() })
    .strict(),
  z
    .object({
      type: z.literal("SELECT_COUNTRY"),
      payload: z
        .object({ countryCode: z.string().regex(/^[A-Z]{2}$/) })
        .strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("SET_VISUALIZATION_MODE"),
      payload: z.object({ mode: modeSchema }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("OPEN_ENTITY"),
      payload: z.object({ entityId: z.string() }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("EXPAND_NODE"),
      payload: z.object({ nodeId: z.string() }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("FOCUS_REGION"),
      payload: z.object({ entityId: z.string() }).strict(),
    })
    .strict(),
  z
    .object({
      type: z.literal("CREATE_CHART"),
      payload: z.object({ datasetId: z.string() }).strict(),
    })
    .strict(),
  z
    .object({ type: z.literal("FIT_CANVAS"), payload: z.object({}).strict() })
    .strict(),
]);
export type CanvasAction = z.infer<typeof actionSchema>;
export const replySchema = z
  .object({
    message: z.string().min(1).max(12000),
    actions: z.array(actionSchema).max(8),
    sourceIds: z.array(z.string()).max(20),
  })
  .strict();
export const contextSchema = z.object({
  country: z.string().regex(/^[A-Z]{2}$/),
  countryName: z.string().max(120),
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
  visibleEntities: z.array(z.string()).max(2000),
  region: z.string().nullable(),
});
export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  context: contextSchema,
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(12000),
      }),
    )
    .max(12),
});
export function validateActions(
  input: unknown,
  activeCountry = "ZA",
): CanvasAction[] {
  const parsed = z.array(actionSchema).max(8).parse(input);
  let country = activeCountry;
  if (
    parsed.some((a) => a.type === "UNDO" || a.type === "REDO") &&
    parsed.length !== 1
  )
    throw new Error("History actions must be issued alone");
  for (const action of parsed) {
    if (
      action.type === "SELECT_WARD" &&
      (country !== "ZA" || !wardById(action.payload.id))
    )
      throw new Error("Unknown ward or ward outside active country");
    if (action.type === "TRACE_NETWORK")
      for (const id of [action.payload.startId, action.payload.targetId])
        if (id && entityById(id)?.country !== country)
          throw new Error("Network entity outside active country");
    if (action.type === "SELECT_ENTITIES" || action.type === "ISOLATE_ENTITIES")
      for (const id of action.payload.ids)
        if (entityById(id)?.country !== country)
          throw new Error("Entity outside active country");
    if (action.type === "HIGHLIGHT_RELATIONSHIPS")
      for (const id of action.payload.ids)
        if (
          !relationships.some(
            (r) =>
              r.id === id &&
              entityById(r.source)?.country === country &&
              entityById(r.target)?.country === country,
          )
        )
          throw new Error("Relationship outside active country");
    if (
      action.type === "SET_TIME_RANGE" &&
      action.payload.range &&
      action.payload.range[0] > action.payload.range[1]
    )
      throw new Error("Invalid time range");
    if (action.type === "SELECT_COUNTRY") {
      if (!countries.some((c) => c.code === action.payload.countryCode))
        throw new Error("Unsupported assistant country");
      country = action.payload.countryCode;
    }
    if (
      action.type === "OPEN_ENTITY" ||
      action.type === "FOCUS_REGION" ||
      action.type === "EXPAND_NODE"
    ) {
      const id =
        action.type === "EXPAND_NODE"
          ? action.payload.nodeId
          : action.payload.entityId;
      const entity = entityById(id);
      if (!entity || entity.country !== country)
        throw new Error("Entity outside active country");
      if (
        action.type === "FOCUS_REGION" &&
        !entity.coordinates &&
        !municipalById(entity.id)
      )
        throw new Error("Region has no geometry");
    }
    if (
      action.type === "CREATE_CHART" &&
      (country !== "ZA" ||
        !datasets.some((d) => d.id === action.payload.datasetId))
    )
      throw new Error("Unknown dataset");
    if (
      action.type === "SET_VISUALIZATION_MODE" &&
      country !== "ZA" &&
      !["geographic", "compare", "timeline"].includes(action.payload.mode)
    )
      throw new Error("Detailed coverage unavailable");
  }
  return parsed;
}
export const allowedEntityIds = entities.map((e) => e.id);
