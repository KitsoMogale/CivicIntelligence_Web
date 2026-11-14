import {
  retrieveEntity,
  retrieveRelationships,
  retrieveSearch,
  retrieveEntities,
} from "@/lib/retrieval";
import { countries, entities, datasets, getSources } from "@/lib/knowledge";
import { countryProfile } from "@/lib/country-profiles";
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams,
    country = params.get("country") || "ZA",
    query = params.get("q"),
    id = params.get("entity");
  if (
    !countries.some((c) => c.code === country) ||
    (query && query.length > 2000)
  )
    return Response.json({ error: "Invalid query" }, { status: 400 });
  try {
    if (id) {
      const entity = await retrieveEntity(id, country);
      return entity
        ? Response.json({
            entity,
            relationships: await retrieveRelationships(id, country),
          })
        : Response.json({ error: "Entity not found" }, { status: 404 });
    }
    return Response.json({
      entities: query
        ? await retrieveSearch(query, country)
        : await retrieveEntities(country),
      datasets: datasets.filter((d) => (d.country ?? "ZA") === country),
      sources: getSources([
        ...entities
          .filter((e) => e.country === country)
          .flatMap((e) => e.sourceIds),
        ...countryProfile(country).sourceIds,
        countryProfile(country).boundary.sourceId,
      ]),
    });
  } catch {
    return Response.json(
      { error: "Knowledge service unavailable" },
      { status: 503 },
    );
  }
}
