import {
  retrieveEntity,
  retrieveRelationships,
  retrieveSearch,
  retrieveEntities,
} from "@/lib/retrieval";
import { entities, datasets, sources } from "@/lib/knowledge";
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams,
    country = params.get("country") || "ZA",
    query = params.get("q"),
    id = params.get("entity");
  if (!/^[A-Z]{2}$/.test(country) || (query && query.length > 2000))
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
      datasets: country === "ZA" ? datasets : [],
      sources: country === "ZA" ? sources : [],
    });
  } catch {
    return Response.json(
      { error: "Knowledge service unavailable" },
      { status: 503 },
    );
  }
}
