export type Mode =
  | "geographic"
  | "hierarchy"
  | "relationships"
  | "flow"
  | "data"
  | "compare"
  | "timeline";
export type Domain =
  "government" | "economy" | "industry" | "infrastructure" | "law" | "society";
export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  retrievedAt: string;
  publishedAt?: string;
  license?: string;
  note?: string;
}
export interface Entity {
  id: string;
  name: string;
  type: string;
  country: string;
  domain: Domain;
  description: string;
  sourceIds: string[];
  updatedAt: string;
  region?: string;
  coordinates?: [number, number];
  attributes?: Record<string, string | number>;
  asOf?: string;
  coordinateNote?: string;
}
export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: string;
  description: string;
  sourceIds: string[];
  asOf?: string;
  validFrom?: string;
  validTo?: string;
  ownershipPercent?: number;
}
export interface Country {
  code: string;
  name: string;
  continent: string;
  center: [number, number];
  zoom: number;
  iso3?: string;
  status?: string;
  sovereignty?: string;
  providerId?: string;
}
export interface Dataset {
  id: string;
  name: string;
  unit: string;
  sourceIds: string[];
  points: { name: string; value: number }[];
  country?: string;
  period?: string;
  note?: string;
}
export interface Region {
  id: string;
  name: string;
  country: string;
  entityId: string;
  center: [number, number];
  capital?: string;
  sourceIds: string[];
}
export interface Indicator {
  code: string;
  name: string;
  unit: string;
  description: string;
  sourceIds: string[];
  observations: { country: string; year: number; value: number | null }[];
}
export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  country: string;
  entityIds: string[];
  sourceIds: string[];
}
