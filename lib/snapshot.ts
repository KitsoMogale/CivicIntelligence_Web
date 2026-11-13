import {
  datasets,
  descendants,
  domains,
  entities,
  entityById,
  getSources,
  relationships,
  timelineEvents,
} from "./knowledge";
import type { Country, Domain, Mode } from "./types";
import { comparisonRows } from "./analytics";
import { initialExploration, type Exploration } from "./exploration";
export function knowledgeSnapshot(
  context: Pick<Exploration, "country" | "domain" | "mode" | "selectedEntity"> &
    Partial<Exploration>,
) {
  const exportedContext = Object.fromEntries(
    Object.keys(initialExploration)
      .filter((key) => key in context)
      .map((key) => [key, context[key as keyof Exploration]]),
  ) as Partial<Exploration>;
  const ids = new Set(
    context.country.code === "ZA" &&
      !["compare", "timeline", "data"].includes(context.mode)
      ? context.mode === "geographic"
        ? entities
            .filter((e) => e.country === context.country.code)
            .map((e) => e.id)
        : descendants(domains.find((d) => d.id === context.domain)!.root)
      : [],
  );
  const records = entities.filter(
    (e) => e.country === context.country.code && ids.has(e.id),
  );
  const links = relationships.filter(
    (r) => ids.has(r.source) && ids.has(r.target),
  );
  const series =
    context.country.code === "ZA" && context.domain === "society"
      ? datasets
      : [];
  const comparison =
    context.mode === "compare"
      ? comparisonRows(
          context.indicatorCode ?? "SP.POP.TOTL",
          context.comparisonCountries ?? ["ZA", "BW"],
          context.comparisonYear,
        )
      : null;
  const events =
    context.mode === "timeline"
      ? timelineEvents.filter(
          (event) =>
            event.country === context.country.code &&
            (!context.timelineYear ||
              +event.date.slice(0, 4) <= context.timelineYear) &&
            (!context.timelineEntity ||
              event.entityIds.includes(context.timelineEntity)),
        )
      : [];
  const references = [
    ...(context.mode === "geographic" && context.country.code === "ZA"
      ? ["province-boundaries"]
      : []),
    ...new Set(
      [
        ...records,
        ...links,
        ...series,
        ...events,
        ...(comparison ? [comparison.indicator] : []),
      ].flatMap((r) => r.sourceIds),
    ),
  ];
  return {
    ...exportedContext,
    country: context.country,
    domain: context.domain,
    mode: context.mode,
    selectedEntity:
      context.selectedEntity && ids.has(context.selectedEntity)
        ? entityById(context.selectedEntity)
        : null,
    coverage: records.length ? "curated-seed" : "map-only",
    entities: records,
    relationships: links,
    datasets: series,
    comparison,
    events,
    sources: getSources(references),
    mapAttribution: {
      publisher: "Natural Earth",
      url: "https://www.naturalearthdata.com/about/terms-of-use/",
      license: "Public domain",
      note: "Low-resolution illustrative boundaries; not legal determinations.",
      provinceBoundaries: {
        publisher:
          "geoBoundaries; OCHA ROSEA / South African Municipal Demarcation Board",
        url: "https://www.geoboundaries.org/api/current/gbOpen/ZAF/ADM1/",
        license: "geoBoundaries CC BY 4.0; original OCHA/MDB CC BY 3.0 IGO",
        vintage: "2020",
        note: "Simplified province boundaries; source Northern Cape label corrected.",
      },
    },
    exportedAt: new Date().toISOString(),
  };
}
