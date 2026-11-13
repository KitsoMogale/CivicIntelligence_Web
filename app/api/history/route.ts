import { countries, entityById, timelineEvents } from "@/lib/knowledge";
export function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const country = params.get("country") ?? "ZA",
    entity = params.get("entity");
  const year = params.has("through") ? Number(params.get("through")) : null;
  if (
    !countries.some((c) => c.code === country) ||
    (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2100))
  )
    return Response.json({ error: "Invalid history filters" }, { status: 400 });
  if (entity && entityById(entity)?.country !== country)
    return Response.json({ error: "Entity not found" }, { status: 404 });
  return Response.json({
    events: timelineEvents.filter(
      (event) =>
        event.country === country &&
        (!year || +event.date.slice(0, 4) <= year) &&
        (!entity || event.entityIds.includes(entity)),
    ),
  });
}
