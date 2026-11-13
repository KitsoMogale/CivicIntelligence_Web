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
import { metricById } from "./statistics";
import { traceNetwork } from "./network";
import { wardById, boundaryTitle } from "./boundaries";
import boundaryRelease from "@/data/boundary-release.json";
export function knowledgeSnapshot(
  context: Pick<Exploration, "country" | "domain" | "mode" | "selectedEntity"> &
    Partial<Exploration>,
) {
  const exportedContext = Object.fromEntries(
    Object.keys(initialExploration)
      .filter((key) => key in context)
      .map((key) => [key, context[key as keyof Exploration]]),
  ) as Partial<Exploration>;
  const trace =
    context.mode === "relationships" && context.networkTrace
      ? traceNetwork(
          context.networkTrace,
          context.country.code,
          context.timeRange,
        )
      : null;
  const ids = new Set(
    trace
      ? trace.nodeIds
      : context.country.code === "ZA" &&
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
    (r) =>
      ids.has(r.source) &&
      ids.has(r.target) &&
      (!trace || trace.relationshipIds.includes(r.id)),
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
  const provincialMetric =
    context.country.code === "ZA" &&
    context.layers?.some((l) => l.id === "statistics" && l.visible)
      ? (metricById(
          context.layers.find((l) => l.id === "statistics")!.metric,
        ) ?? null)
      : null;
  const references = [
    ...(context.basemap === "streets" ? ["openstreetmap"] : []),
    ...(context.country.code === "ZA" &&
    context.boundaryEdition === "mdb-2026" &&
    context.layers?.some(
      (l) => ["municipalities", "wards"].includes(l.id) && l.visible,
    )
      ? boundaryRelease.sourceIds
      : []),
    ...(context.selectedWardId ? ["mdb-wards-2026", "iec-kopanong-2026"] : []),
    ...(provincialMetric?.sourceIds ?? []),
    ...(context.country.code === "ZA" &&
    context.layers?.some((l) => l.id === "municipalities" && l.visible)
      ? ["municipal-boundaries"]
      : []),
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
    provincialMetric,
    selectedWard:
      context.country.code === "ZA" && context.boundaryEdition === "mdb-2026"
        ? (wardById(context.selectedWardId) ?? null)
        : null,
    boundaryEdition: context.boundaryEdition ?? "legacy-2020",
    boundaryDescription: boundaryTitle(
      context.boundaryEdition ?? "legacy-2020",
    ),
    sources: getSources(references),
    mapAttribution: {
      publisher: "Natural Earth",
      url: "https://www.naturalearthdata.com/about/terms-of-use/",
      license: "Public domain",
      note: "Low-resolution illustrative boundaries; not legal determinations.",
      streets:
        context.basemap === "streets"
          ? {
              publisher: "OpenStreetMap contributors",
              url: "https://www.openstreetmap.org/copyright",
              license: "ODbL 1.0 (data)",
              note: "Online street map; imagery is not embedded or downloaded by this report.",
            }
          : null,
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
