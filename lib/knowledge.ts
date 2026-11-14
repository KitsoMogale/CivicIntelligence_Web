import countrySummaries from "@/data/countries.json";
import seed from "@/data/knowledge.json";
import regionData from "@/data/regions.json";
import indicatorData from "@/data/indicators.json";
import eventData from "@/data/events.json";
import world from "@/data/world-catalog.json";
import { countryAreas, domainRoot, countryProfile } from "./country-profiles";
import type {
  Country,
  Dataset,
  Domain,
  Entity,
  Relationship,
  Source,
  Region,
  Indicator,
  TimelineEvent,
} from "./types";

export const entities = [...seed.entities, ...world.entities] as Entity[];
export const relationships = [
  ...seed.relationships,
  ...world.relationships,
] as Relationship[];
export const sources = [...seed.sources, ...world.sources] as Source[];
export const datasets = seed.datasets as Dataset[];
export const regions = regionData as Region[];
export function countryRegions(code: string): Region[] {
  return code === "ZA" ? regions : countryAreas(code);
}
export const indicators = indicatorData.indicators as Indicator[];
export const indicatorSnapshot = indicatorData.retrievedAt;
export const timelineEvents = eventData as TimelineEvent[];
export const domains: {
  id: Domain;
  name: string;
  short: string;
  root: string;
  caption: string;
}[] = [
  {
    id: "government",
    name: "Government & politics",
    short: "Government",
    root: "za-government",
    caption: "Institutions, spheres & responsibilities",
  },
  {
    id: "economy",
    name: "Economy & finance",
    short: "Economy",
    root: "za-economy",
    caption: "Institutions, public finance & economic indicators",
  },
  {
    id: "industry",
    name: "Industries & businesses",
    short: "Industries",
    root: "za-mining",
    caption: "Companies, operations & sourced connections",
  },
  {
    id: "infrastructure",
    name: "Infrastructure & systems",
    short: "Infrastructure",
    root: "za-infrastructure",
    caption: "Electricity, transport and sourced infrastructure records",
  },
  {
    id: "law",
    name: "Law & justice",
    short: "Law & justice",
    root: "za-justice",
    caption: "Constitutional institutions",
  },
  {
    id: "society",
    name: "People & society",
    short: "Society",
    root: "za-society",
    caption: "Population & Census 2022",
  },
];
const preferredCountries: Country[] = [
  {
    code: "ZA",
    name: "South Africa",
    continent: "Africa",
    center: [25, -29],
    zoom: 4.1,
  },
  {
    code: "BW",
    name: "Botswana",
    continent: "Africa",
    center: [24, -22],
    zoom: 5,
  },
  {
    code: "NA",
    name: "Namibia",
    continent: "Africa",
    center: [17, -23],
    zoom: 4.4,
  },
  {
    code: "ZW",
    name: "Zimbabwe",
    continent: "Africa",
    center: [29, -19],
    zoom: 5,
  },
  {
    code: "LS",
    name: "Lesotho",
    continent: "Africa",
    center: [28.2, -29.6],
    zoom: 7,
  },
  {
    code: "SZ",
    name: "Eswatini",
    continent: "Africa",
    center: [31.5, -26.5],
    zoom: 7,
  },
  {
    code: "MZ",
    name: "Mozambique",
    continent: "Africa",
    center: [35, -18],
    zoom: 4,
  },
];
export const countries: Country[] = [
  ...preferredCountries.map((p) => ({
    ...countrySummaries.find((c) => c.code === p.code),
    ...p,
  })),
  ...(countrySummaries as Country[]).filter(
    (c) => !preferredCountries.some((p) => p.code === c.code),
  ),
];
const entityIndex = new Map(entities.map((e) => [e.id, e]));
export function entityById(id: string) {
  return entityIndex.get(id);
}
export function countryDomain(code: string, id: Domain) {
  const d = domains.find((d) => d.id === id)!;
  const p = countryProfile(code);
  return {
    ...d,
    root: domainRoot(code, id) ?? "",
    ...(id === "government" && p.institutions === "not-curated"
      ? {
          name: "Administrative reference",
          short: "Reference geography",
          caption: "Publisher reference areas · current institutions pending",
        }
      : {}),
  };
}
export function searchKnowledge(query: string, country = "ZA") {
  const words = query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
  return entities
    .filter((e) => e.country === country)
    .map((e) => ({
      entity: e,
      score: words.reduce(
        (n, w) =>
          n +
          (e.name.toLowerCase().includes(w)
            ? 5
            : e.description.toLowerCase().includes(w)
              ? 1
              : 0),
        0,
      ),
    }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((e) => e.entity)
    .slice(0, 8);
}
export function getSources(ids: string[]) {
  return sources.filter((s) => ids.includes(s.id));
}
export function descendants(root: string) {
  const found = new Set([root]);
  const adjacency = new Map<string, string[]>();
  relationships.forEach((r) =>
    adjacency.set(r.source, [...(adjacency.get(r.source) ?? []), r.target]),
  );
  const pending = [root];
  while (pending.length) {
    for (const target of adjacency.get(pending.shift()!) ?? []) {
      if (!found.has(target)) {
        found.add(target);
        pending.push(target);
      }
    }
  }
  return [...found];
}
export function entityConnections(id: string) {
  return relationships.filter((r) => r.source === id || r.target === id);
}
