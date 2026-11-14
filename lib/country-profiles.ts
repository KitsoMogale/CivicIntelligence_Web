import profiles from "@/data/country-profiles.json";
import regionData from "@/data/world-regions.json";
import type { Domain, Mode, Region } from "./types";
export type CountryProfile = {
  code: string;
  root: string;
  domainRoots: Partial<Record<Domain, string>>;
  modes: Mode[];
  defaultExpanded: string[];
  defaultSplitMode: Mode;
  institutions: "curated" | "initial-curated" | "not-curated";
  institutionCount: number;
  summary: string;
  schemes: { name: string; levels: string[]; note: string }[];
  sourceIds: string[];
  comparisonIndicators: string[];
  reviewedAt: string;
  boundary: {
    kind: string;
    year: string;
    count: number;
    file: string | null;
    sourceId: string;
    divisionLabel: string;
    note?: string;
  };
};
export type ReferenceArea = Region & {
  bounds: [number, number, number, number];
  sourceCode: string;
  boundaryYear: string;
};
export const countryProfiles = profiles as unknown as CountryProfile[];
export const referenceAreas = regionData as unknown as ReferenceArea[];
const byCountry = new Map(countryProfiles.map((p) => [p.code, p]));
const byArea = new Map(referenceAreas.map((r) => [r.entityId, r]));
export function countryProfile(code: string) {
  const profile = byCountry.get(code);
  if (!profile) throw new Error("Unknown country profile");
  return profile;
}
export function referenceArea(id: string | null | undefined) {
  return id ? byArea.get(id) : undefined;
}
export function countryAreas(code: string) {
  return referenceAreas.filter((r) => r.country === code);
}
export function domainRoot(code: string, domain: Domain) {
  return byCountry.get(code)?.domainRoots[domain];
}
export function supportsCountryMode(code: string, mode: Mode) {
  return byCountry.get(code)?.modes.includes(mode) ?? false;
}
export function countryCoverage(code: string) {
  const p = countryProfile(code);
  return p.institutions === "curated"
    ? "Curated knowledge coverage"
    : p.institutions === "initial-curated"
      ? "Initial institutions · dated reference geography"
      : p.boundary.file
        ? "Reference geography · institutions pending"
        : "Country map · institutions pending";
}
