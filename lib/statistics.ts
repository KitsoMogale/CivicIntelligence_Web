import raw from "@/data/provincial-indicators.json";
import { z } from "zod";
export const metricSchema = z.enum([
  "population",
  "change",
  "za-unemployment-2026-q3",
  "za-absorption-2026-q3",
  "za-gdp-growth-2025",
  "za-no-schooling-2022",
  "za-post-school-2022",
  "za-medical-aid-2025",
]);
export type MetricId = z.infer<typeof metricSchema>;
export type ProvincialMetric = {
  id: string;
  name: string;
  theme: string;
  period: string;
  periodLabel: string;
  unit: string;
  precision: number;
  year: number;
  startDate: string;
  endDate: string;
  definition: string;
  denominator: string;
  method: string;
  sourceIds: string[];
  nationalValue: number | null;
  observations: {
    regionId: string;
    value: number | null;
    numerator?: number;
    denominator?: number;
  }[];
  caveats: string[];
};
export const provincialMetrics = raw.metrics as ProvincialMetric[];
export function metricById(id: string) {
  return provincialMetrics.find((m) => m.id === id);
}
export function metricValue(id: string, region: string) {
  return (
    metricById(id)?.observations.find((o) => o.regionId === region)?.value ??
    null
  );
}
export function metricExtent(metric: ProvincialMetric): [number, number] {
  const values = metric.observations.flatMap((o) =>
    o.value === null ? [] : [o.value],
  );
  return values.length ? [Math.min(...values), Math.max(...values)] : [0, 0];
}
export function metricColor(metric: ProvincialMetric, value: number | null) {
  if (value === null || !Number.isFinite(value)) return "#596460";
  const [min, max] = metricExtent(metric),
    index =
      max === min
        ? 2
        : Math.min(4, Math.floor((5 * (value - min)) / (max - min)));
  return ["#284e55", "#407578", "#78a294", "#a7c18f", "#d6dfa8"][
    Math.max(0, index)
  ];
}
export function formatMetric(value: number | null, precision = 1, unit = "%") {
  return value === null
    ? "Not available"
    : value.toLocaleString("en-ZA", {
        maximumFractionDigits: precision,
        minimumFractionDigits: precision,
      }) + (unit === "%" ? "%" : " " + unit);
}
