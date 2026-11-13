import { indicators } from "./knowledge";
import type { Indicator } from "./types";

export function commonYears(indicator: Indicator, countries: string[]) {
  const years = [...new Set(indicator.observations.map((o) => o.year))];
  return years
    .filter((year) =>
      countries.every((country) =>
        indicator.observations.some(
          (o) => o.year === year && o.country === country && o.value !== null,
        ),
      ),
    )
    .sort((a, b) => b - a);
}
export function comparisonRows(
  code: string,
  countries: string[],
  requestedYear?: number | null,
) {
  const indicator = indicators.find((i) => i.code === code);
  if (!indicator) return null;
  const years = commonYears(indicator, countries);
  const year = requestedYear == null ? years[0] : requestedYear;
  return {
    indicator,
    year: year ?? null,
    years,
    rows: countries.map((country) => ({
      country,
      year: year ?? null,
      value:
        indicator.observations.find(
          (o) => o.country === country && o.year === year,
        )?.value ?? null,
    })),
  };
}
export function formatStatistic(value: number | null, unit: string) {
  if (value === null || !Number.isFinite(value)) return "Not available";
  return (
    new Intl.NumberFormat("en-ZA", {
      maximumFractionDigits: unit === "people" ? 0 : 2,
    }).format(value) +
    (unit === "%" ? "%" : unit === "current US$" ? " US$" : "")
  );
}
