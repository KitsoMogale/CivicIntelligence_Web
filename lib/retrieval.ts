import { z } from "zod";
import type { Entity } from "./types";
import {
  entitySchema,
  datasetSchema,
  relationshipSchema,
} from "./data-quality";
import {
  entities,
  datasets,
  entityById,
  relationships,
  searchKnowledge,
} from "./knowledge";
async function external(path: string) {
  const base = process.env.KNOWLEDGE_API_URL;
  if (!base) return null;
  const response = await fetch(base.replace(/\/$/, "") + path, {
    signal: AbortSignal.timeout(6000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Knowledge service unavailable");
  return response.json();
}
export async function retrieveSearch(
  query: string,
  country: string,
): Promise<Entity[]> {
  const data = await external(
    "/search?q=" + encodeURIComponent(query) + "&country=" + country,
  );
  if (data === null) return searchKnowledge(query, country);
  return z
    .array(entitySchema)
    .max(100)
    .parse(data)
    .filter(
      (e) => e.country === country && entities.some((seed) => seed.id === e.id),
    )
    .map((e) => ({
      ...e,
      region: e.region ?? undefined,
      coordinates: e.coordinates ?? undefined,
    }));
}
export async function retrieveEntity(
  id: string,
  country: string,
): Promise<Entity | undefined> {
  if (entityById(id)?.country !== country) return undefined;
  const data = await external("/entities/" + encodeURIComponent(id));
  if (data === null) {
    const entity = entityById(id);
    return entity?.country === country ? entity : undefined;
  }
  const e = entitySchema.parse(data);
  return e.country === country && entities.some((seed) => seed.id === e.id)
    ? {
        ...e,
        region: e.region ?? undefined,
        coordinates: e.coordinates ?? undefined,
      }
    : undefined;
}
export async function retrieveRelationships(id: string, country: string) {
  const entity = await retrieveEntity(id, country);
  if (!entity) return [];
  const data = await external(
    "/entities/" + encodeURIComponent(id) + "/relationships",
  );
  if (data === null)
    return relationships.filter((r) => r.source === id || r.target === id);
  return z
    .array(relationshipSchema)
    .max(100)
    .parse(data)
    .filter(
      (r) =>
        entityById(r.source)?.country === country &&
        entityById(r.target)?.country === country &&
        (r.source === id || r.target === id),
    );
}
export async function retrieveEntities(country: string): Promise<Entity[]> {
  const data = await external("/entities?country=" + country);
  return data === null
    ? entities.filter((e) => e.country === country)
    : z
        .array(entitySchema)
        .max(20000)
        .parse(data)
        .filter(
          (e) =>
            e.country === country &&
            entities.some((known) => known.id === e.id),
        );
}
export async function retrieveDataset(id: string, country: string) {
  if (country !== "ZA") return undefined;
  const known = datasets.find((d) => d.id === id);
  if (!known) return undefined;
  const data = await external("/datasets?country=" + country);
  return data === null
    ? known
    : z
        .array(datasetSchema)
        .max(30)
        .parse(data)
        .find((d) => d.id === id);
}
