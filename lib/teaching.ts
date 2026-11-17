import { z } from "zod";

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const text = z.string().max(1200);
export const sourceSchema = z
  .object({
    title: z.string().min(1).max(240),
    url: z
      .url()
      .max(2000)
      .refine((s) => /^https?:\/\//.test(s), "Use an HTTP source"),
    date: z.string().max(80).nullable(),
  })
  .strict();
export const citationSchema = sourceSchema.extend({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});
export type WebSource = z.infer<typeof sourceSchema>;
export type Citation = z.infer<typeof citationSchema>;
export const componentKind = z.enum([
  "map",
  "hierarchy",
  "flow",
  "relationships",
  "chart",
  "timeline",
  "panel",
  "annotation",
]);
export const teachingComponentSchema = z
  .object({
    id,
    kind: componentKind,
    title: z.string().min(1).max(180),
    x: z.number().min(-10000).max(10000),
    y: z.number().min(-10000).max(10000),
    width: z.number().min(300).max(1600),
    height: z.number().min(240).max(1200),
    text,
    nodes: z
      .array(
        z
          .object({ id, label: z.string().min(1).max(180), detail: text })
          .strict(),
      )
      .max(80),
    edges: z
      .array(
        z
          .object({ id, source: id, target: id, label: z.string().max(180) })
          .strict(),
      )
      .max(160),
    series: z
      .array(
        z
          .object({
            name: z.string().min(1).max(120),
            unit: z.string().max(80),
            points: z
              .array(
                z
                  .object({
                    label: z.string().max(120),
                    value: z.number().finite().nullable(),
                  })
                  .strict(),
              )
              .max(120),
          })
          .strict(),
      )
      .max(6),
    chartType: z.enum(["bar", "line", "pie"]),
    events: z
      .array(
        z
          .object({
            id,
            date: z.string().max(80),
            label: z.string().max(180),
            detail: text,
          })
          .strict(),
      )
      .max(80),
    markers: z
      .array(
        z
          .object({
            id,
            label: z.string().min(1).max(180),
            detail: text,
            longitude: z.number().min(-180).max(180),
            latitude: z.number().min(-85).max(85),
            precision: z.enum(["exact", "approximate"]),
            sourceUrl: sourceSchema.shape.url,
          })
          .strict(),
      )
      .max(80),
    center: z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-85).max(85),
    ]),
    zoom: z.number().min(1).max(19),
    sources: z.array(sourceSchema).max(20),
    asOf: z.string().max(100).nullable(),
    highlighted: z.array(id).max(160),
    filter: z.string().max(200),
    collapsed: z.array(id).max(80),
  })
  .strict();
export type TeachingComponent = z.infer<typeof teachingComponentSchema>;
export const boardLinkSchema = z
  .object({ id, source: id, target: id, label: z.string().max(180) })
  .strict();
export const teachingDocumentSchema = z
  .object({
    components: z.array(teachingComponentSchema).max(12),
    connections: z.array(boardLinkSchema).max(30),
    selectedComponent: id.nullable(),
    selectedElement: id.nullable(),
    viewport: z
      .object({
        x: z.number().min(-100000).max(100000),
        y: z.number().min(-100000).max(100000),
        zoom: z.number().min(0.15).max(2),
      })
      .strict(),
  })
  .strict();
export type TeachingDocument = z.infer<typeof teachingDocumentSchema>;
export const teachingCommandSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("upsert_component"),
      component: teachingComponentSchema,
    })
    .strict(),
  z.object({ type: z.literal("remove_component"), id }).strict(),
  z
    .object({
      type: z.literal("arrange_canvas"),
      layout: z.enum(["grid", "split"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("connect_components"),
      connection: boardLinkSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("select_canvas"),
      componentId: id.nullable(),
      elementId: id.nullable(),
    })
    .strict(),
  z
    .object({
      type: z.literal("highlight_elements"),
      componentId: id,
      ids: z.array(id).max(160),
    })
    .strict(),
  z
    .object({
      type: z.literal("filter_elements"),
      componentId: id,
      query: z.string().max(200),
    })
    .strict(),
  z
    .object({
      type: z.literal("focus_map"),
      componentId: id,
      center: teachingComponentSchema.shape.center,
      zoom: teachingComponentSchema.shape.zoom,
    })
    .strict(),
  z
    .object({
      type: z.literal("set_canvas_viewport"),
      viewport: teachingDocumentSchema.shape.viewport,
    })
    .strict(),
]);
export type TeachingCommand = z.infer<typeof teachingCommandSchema>;
export const emptyTeachingDocument: TeachingDocument = {
  components: [],
  connections: [],
  selectedComponent: null,
  selectedElement: null,
  viewport: { x: 30, y: 30, zoom: 0.8 },
};
export function newTeachingComponent(
  kind: TeachingComponent["kind"],
  count = 0,
): TeachingComponent {
  return {
    id: "visual-" + crypto.randomUUID(),
    kind,
    title: kind === "annotation" ? "My note" : "New " + kind,
    x: (count % 2) * 600,
    y: Math.floor(count / 2) * 460,
    width: 560,
    height: 420,
    text: "",
    nodes: [],
    edges: [],
    series: [],
    chartType: "bar",
    events: [],
    markers: [],
    center: [24, -29],
    zoom: 4,
    sources: [],
    asOf: null,
    highlighted: [],
    filter: "",
    collapsed: [],
  };
}
export function validateTeachingDocument(input: unknown): TeachingDocument {
  const doc = teachingDocumentSchema.parse(input);
  const unique = (ids: string[]) => new Set(ids).size === ids.length;
  if (
    !unique(doc.components.map((c) => c.id)) ||
    !unique(doc.connections.map((c) => c.id))
  )
    throw new Error("Duplicate canvas ID");
  for (const c of doc.components) {
    const nodes = new Set(c.nodes.map((n) => n.id)),
      markers = new Set(c.markers.map((n) => n.id));
    const elements = new Set([
      ...nodes,
      ...markers,
      ...c.events.map((e) => e.id),
      ...c.edges.map((e) => e.id),
    ]);
    if (
      !unique(
        [...c.nodes, ...c.markers, ...c.events, ...c.edges].map((n) => n.id),
      )
    )
      throw new Error("Duplicate element ID");
    const endpoints = c.kind === "map" ? markers : nodes;
    if (
      c.edges.some((e) => !endpoints.has(e.source) || !endpoints.has(e.target))
    )
      throw new Error("Connection endpoint missing");
    if (
      c.highlighted.some((i) => !elements.has(i)) ||
      c.collapsed.some((i) => !nodes.has(i))
    )
      throw new Error("Unknown highlighted or collapsed element");
    if (c.markers.some((m) => !c.sources.some((s) => s.url === m.sourceUrl)))
      throw new Error("Map point needs a source");
    if (
      c.chartType === "pie" &&
      c.series.some((s) =>
        s.points.some((p) => p.value !== null && p.value < 0),
      )
    )
      throw new Error("Pie values cannot be negative");
  }
  if (
    doc.connections.some(
      (l) =>
        !doc.components.some((c) => c.id === l.source) ||
        !doc.components.some((c) => c.id === l.target),
    )
  )
    throw new Error("Canvas connection endpoint missing");
  const selected = doc.components.find((c) => c.id === doc.selectedComponent);
  if (doc.selectedComponent && !selected)
    throw new Error("Selected component missing");
  if (
    doc.selectedElement &&
    (!selected ||
      ![
        ...selected.nodes,
        ...selected.edges,
        ...selected.events,
        ...selected.markers,
      ].some((e) => e.id === doc.selectedElement))
  )
    throw new Error("Selected element missing");
  return doc;
}
export function reduceTeaching(
  doc: TeachingDocument,
  input: unknown,
): TeachingDocument {
  const commands = z.array(teachingCommandSchema).max(16).parse(input);
  const next = { ...doc };
  for (const command of commands) {
    const target =
      "componentId" in command
        ? next.components.find((c) => c.id === command.componentId)
        : undefined;
    switch (command.type) {
      case "upsert_component": {
        const exists = next.components.some(
          (c) => c.id === command.component.id,
        );
        next.components = exists
          ? next.components.map((c) =>
              c.id === command.component.id ? command.component : c,
            )
          : [...next.components, command.component];
        if (
          next.selectedComponent === command.component.id &&
          next.selectedElement &&
          ![
            ...command.component.nodes,
            ...command.component.edges,
            ...command.component.markers,
            ...command.component.events,
          ].some((e) => e.id === next.selectedElement)
        )
          next.selectedElement = null;
        break;
      }
      case "remove_component":
        if (!next.components.some((c) => c.id === command.id))
          throw new Error("Component missing");
        next.components = next.components.filter((c) => c.id !== command.id);
        next.connections = next.connections.filter(
          (e) => e.source !== command.id && e.target !== command.id,
        );
        if (next.selectedComponent === command.id) {
          next.selectedComponent = null;
          next.selectedElement = null;
        }
        break;
      case "connect_components": {
        const exists = next.connections.some(
          (c) => c.id === command.connection.id,
        );
        next.connections = exists
          ? next.connections.map((c) =>
              c.id === command.connection.id ? command.connection : c,
            )
          : [...next.connections, command.connection];
        break;
      }
      case "arrange_canvas":
        next.components = next.components.map((c, i) => {
          const height = command.layout === "split" ? 520 : 420;
          return {
            ...c,
            width: 560,
            height,
            x: (i % 2) * 600,
            y: Math.floor(i / 2) * (height + 40),
          };
        });
        break;
      case "select_canvas":
        next.selectedComponent = command.componentId;
        next.selectedElement = command.elementId;
        break;
      case "set_canvas_viewport":
        next.viewport = command.viewport;
        break;
      default:
        if (!target) throw new Error("Component missing");
        const updated = { ...target };
        if (command.type === "highlight_elements")
          updated.highlighted = command.ids;
        if (command.type === "filter_elements") updated.filter = command.query;
        if (command.type === "focus_map") {
          if (target.kind !== "map") throw new Error("Not a map");
          updated.center = command.center;
          updated.zoom = command.zoom;
        }
        next.components = next.components.map((c) =>
          c.id === updated.id ? updated : c,
        );
    }
  }
  validateTeachingDocument(next);
  return next;
}
