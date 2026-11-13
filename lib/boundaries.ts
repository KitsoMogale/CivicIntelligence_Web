import official from "@/data/municipal-geography-2026.json";
import wardIndex from "@/data/ward-index.json";
import { municipalGeography, type MunicipalGeometry } from "./geography";
import { regions } from "./knowledge";
export type BoundaryEdition = "legacy-2020" | "mdb-2026";
export const officialMunicipalities =
  official as unknown as MunicipalGeometry[];
export type Ward = {
  id: string;
  number: number;
  municipalityId: string;
  municipalityCode: string;
  provinceId: string;
  bounds: [number, number, number, number];
  center: [number, number];
  sourceId: string;
  geometryNote?: string;
  originalGeometryFile?: string;
};
export const wards = wardIndex as unknown as Ward[];
const byWard = new Map(wards.map((w) => [w.id, w]));
export function wardById(id: string | null | undefined) {
  return id ? byWard.get(id) : undefined;
}
export function municipalityRecords(edition: BoundaryEdition) {
  return edition === "mdb-2026" ? officialMunicipalities : municipalGeography;
}
export function boundaryMunicipality(
  id: string | null,
  edition: BoundaryEdition,
) {
  return municipalityRecords(edition).find((m) => m.entityId === id);
}
export function municipalityWards(id: string | null) {
  return wards
    .filter((w) => w.municipalityId === id)
    .sort((a, b) => a.number - b.number);
}
export function boundaryTitle(edition: BoundaryEdition) {
  return edition === "mdb-2026"
    ? "MDB 2026 published edition"
    : "Historical representative 2020 geometry";
}
export function municipalFile(
  edition: BoundaryEdition,
  level: "local" | "district",
) {
  return (
    "/data/" +
    (edition === "mdb-2026"
      ? "za-municipalities-2026-adm"
      : "za-municipalities-adm") +
    (level === "district" ? 2 : 3) +
    ".geojson"
  );
}
export function municipalFilesFor(
  edition: BoundaryEdition,
  level: "local" | "district",
  regionId: string | null,
) {
  if (edition === "legacy-2020") return [municipalFile(edition, level)];
  const selected = boundaryMunicipality(regionId, edition),
    province =
      selected?.region ?? regions.find((r) => r.entityId === regionId)?.id;
  if (!province) return [];
  const records = officialMunicipalities.filter(
    (m) =>
      (level === "district" ? m.category !== "B" : m.category !== "C") &&
      m.region === province,
  );
  const scoped =
    selected && records.some((m) => m.entityId === selected.entityId)
      ? records.filter((m) => m.entityId === selected.entityId)
      : records;
  return scoped.map(
    (m) =>
      "/data/za-municipalities-2026/" +
      level +
      "/" +
      m.municipalityCode +
      ".geojson",
  );
}
export function wardFile(municipalityId: string | null) {
  const code = officialMunicipalities.find(
    (m) => m.entityId === municipalityId && m.category !== "C",
  )?.municipalityCode;
  return code ? "/data/za-wards-2026/" + code + ".geojson" : null;
}
export function boundsCamera(bounds: Ward["bounds"]) {
  const latitude = (bounds[1] + bounds[3]) / 2,
    span = Math.max(
      bounds[2] - bounds[0],
      (bounds[3] - bounds[1]) / Math.cos((latitude * Math.PI) / 180),
    );
  return {
    center: [(bounds[0] + bounds[2]) / 2, latitude] as [number, number],
    zoom: Math.max(
      4.5,
      Math.min(17, Math.log2(360 / Math.max(span, 0.00001) / 2.5)),
    ),
    bearing: 0,
    pitch: 0,
  };
}
