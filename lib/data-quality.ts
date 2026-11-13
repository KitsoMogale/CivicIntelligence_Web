import { z } from "zod";
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(value + "T00:00:00Z");
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
    );
  }, "Use a valid calendar date");
const refs = z.array(z.string().min(1)).min(1).max(100);
const sourceSchema = z
  .object({
    id: z.string().min(1).max(100),
    title: z.string().min(1).max(500),
    publisher: z.string().min(1).max(200),
    url: z
      .url()
      .refine(
        (url) => ["http:", "https:"].includes(new URL(url).protocol),
        "Use an HTTP source URL",
      ),
    retrievedAt: isoDate,
    publishedAt: isoDate.optional(),
    license: z.string().max(500).optional(),
    note: z.string().max(3000).optional(),
  })
  .strict();
export const entitySchema = z
  .object({
    id: z.string().min(1).max(150),
    name: z.string().min(1).max(300),
    type: z.string().min(1).max(100),
    country: z.string().regex(/^[A-Z]{2}$/),
    domain: z.enum([
      "government",
      "economy",
      "industry",
      "infrastructure",
      "law",
      "society",
    ]),
    description: z.string().min(1).max(12000),
    sourceIds: refs,
    updatedAt: isoDate,
    region: z.string().max(150).optional(),
    coordinates: z
      .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
      .optional(),
    attributes: z
      .record(z.string(), z.union([z.string().max(3000), z.number().finite()]))
      .optional(),
    asOf: isoDate.optional(),
    coordinateNote: z.string().max(1000).optional(),
  })
  .strict();
export const relationshipSchema = z
  .object({
    id: z.string().min(1).max(180),
    source: z.string(),
    target: z.string(),
    type: z.string().min(1).max(100),
    description: z.string().min(1).max(6000),
    sourceIds: refs,
    asOf: isoDate.optional(),
    validFrom: isoDate.optional(),
    validTo: isoDate.optional(),
    ownershipPercent: z.number().min(0).max(100).optional(),
  })
  .strict();
export const datasetSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    unit: z.string().min(1),
    sourceIds: refs,
    points: z
      .array(
        z
          .object({ name: z.string().min(1), value: z.number().finite() })
          .strict(),
      )
      .max(10000),
    country: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .optional(),
    period: z.string().optional(),
    note: z.string().max(3000).optional(),
  })
  .strict();
export const bundleSchema = z
  .object({
    sources: z.array(sourceSchema).min(1).max(20000),
    entities: z.array(entitySchema).min(1).max(20000),
    relationships: z.array(relationshipSchema).max(100000),
    datasets: z.array(datasetSchema).max(1000),
  })
  .strict();
export type KnowledgeBundle = z.infer<typeof bundleSchema>;
export type QualityIssue = {
  severity: "error" | "warning";
  record: string;
  message: string;
};
export function inspectBundle(
  input: unknown,
  now = new Date(),
): {
  bundle: KnowledgeBundle | null;
  issues: QualityIssue[];
  counts: Record<string, number>;
} {
  const parsed = bundleSchema.safeParse(input);
  if (!parsed.success)
    return {
      bundle: null,
      counts: {},
      issues: parsed.error.issues.map((i) => ({
        severity: "error",
        record: i.path.join("."),
        message: i.message,
      })),
    };
  const bundle = parsed.data;
  const issues: QualityIssue[] = [];
  for (const [group, records] of Object.entries(bundle)) {
    const seen = new Set<string>();
    records.forEach((r) => {
      if (seen.has(r.id))
        issues.push({
          severity: "error",
          record: r.id,
          message: "Duplicate ID in " + group,
        });
      seen.add(r.id);
    });
  }
  const sources = new Set(bundle.sources.map((s) => s.id));
  const entities = new Map(bundle.entities.map((e) => [e.id, e]));
  for (const record of [
    ...bundle.entities,
    ...bundle.relationships,
    ...bundle.datasets,
  ]) {
    for (const id of record.sourceIds)
      if (!sources.has(id))
        issues.push({
          severity: "error",
          record: record.id,
          message: "Unknown source: " + id,
        });
  }
  for (const link of bundle.relationships) {
    if (!entities.has(link.source) || !entities.has(link.target))
      issues.push({
        severity: "error",
        record: link.id,
        message: "Missing relationship endpoint",
      });
    if (link.source === link.target)
      issues.push({
        severity: "error",
        record: link.id,
        message: "Self-referencing relationship",
      });
    if (link.validFrom && link.validTo && link.validTo < link.validFrom)
      issues.push({
        severity: "error",
        record: link.id,
        message: "Relationship ends before it starts",
      });
    if (link.ownershipPercent !== undefined && !link.asOf)
      issues.push({
        severity: "error",
        record: link.id,
        message: "Ownership requires an explicit reporting date",
      });
  }
  for (const source of bundle.sources) {
    const age = (now.valueOf() - Date.parse(source.retrievedAt)) / 86400000;
    if (age > 180)
      issues.push({
        severity: "warning",
        record: source.id,
        message:
          "Source retrieval is more than 180 days old; review its claims",
      });
  }
  for (const dataset of bundle.datasets) {
    if (
      new Set(dataset.points.map((p) => p.name)).size !== dataset.points.length
    )
      issues.push({
        severity: "error",
        record: dataset.id,
        message: "Duplicate data point labels",
      });
  }
  return {
    bundle,
    issues,
    counts: Object.fromEntries(
      Object.entries(bundle).map(([group, records]) => [group, records.length]),
    ),
  };
}
