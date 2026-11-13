import municipalities from "@/data/municipal-geography.json";
export type MunicipalGeometry = {
  entityId: string;
  id: string;
  name: string;
  sourceName: string;
  municipalityCode: string;
  category: string;
  region: string;
  adminLevel: number;
  boundaryVintage: string;
  bounds: [number, number, number, number];
  center: [number, number];
  sourceIds: string[];
};
export const municipalGeography: MunicipalGeometry[] = municipalities.map(
  (m) => ({
    ...m,
    bounds: m.bounds as [number, number, number, number],
    center: m.center as [number, number],
  }),
);
export function municipalById(id: string | null) {
  return municipalGeography.find((m) => m.entityId === id);
}
