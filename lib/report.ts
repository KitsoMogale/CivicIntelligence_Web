import { knowledgeSnapshot } from "./snapshot";
import { countries, entityById } from "./knowledge";
import { formatStatistic } from "./analytics";
import type { FeatureCollection, Position } from "geojson";
import { regions } from "./knowledge";
import {
  metricById,
  metricValue,
  metricColor,
  formatMetric,
  type MetricId,
} from "./statistics";
export function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol)
      ? escapeHtml(url.href)
      : "#";
  } catch {
    return "#";
  }
}
export type ReportSnapshot = ReturnType<typeof knowledgeSnapshot>;
export function geographySvg(
  collection: FeatureCollection,
  overlay: "none" | "population" | "change" = "none",
  year: 2011 | 2022 = 2022,
  metricId?: MetricId,
) {
  const metric = metricId ? metricById(metricId) : null;
  const shapes = collection.features.flatMap((feature) => {
    const geometry = feature.geometry;
    if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")
      return [];
    const rings: Position[][] =
      geometry.type === "Polygon"
        ? geometry.coordinates
        : geometry.coordinates.flat();
    return [
      {
        properties: feature.properties ?? {},
        rings: rings.filter((ring) =>
          ring.every(
            (point) => Number.isFinite(point[0]) && Number.isFinite(point[1]),
          ),
        ),
      },
    ];
  });
  const points = shapes.flatMap((shape) => shape.rings.flat());
  if (!points.length) return "";
  const west = Math.min(...points.map((p) => p[0])),
    east = Math.max(...points.map((p) => p[0])),
    south = Math.min(...points.map((p) => p[1])),
    north = Math.max(...points.map((p) => p[1]));
  const cosine = Math.max(
      0.2,
      Math.cos((((north + south) / 2) * Math.PI) / 180),
    ),
    scale = Math.min(
      900 / Math.max(0.01, (east - west) * cosine),
      700 / Math.max(0.01, north - south),
    );
  const project = (p: Position) => [
    (50 + (p[0] - west) * cosine * scale).toFixed(2),
    (35 + (north - p[1]) * scale).toFixed(2),
  ];
  const height = Math.ceil((north - south) * scale + 80);
  const paths = shapes
    .map((shape) => {
      const value = metric
        ? metricValue(metric.id, String(shape.properties.id))
        : Number(
            overlay === "change"
              ? shape.properties.changePercent
              : shape.properties["population" + year],
          );
      const numeric = value ?? Number.NaN;
      const color = metric
        ? metricColor(metric, value)
        : overlay === "population" && Number.isFinite(value)
          ? numeric < 3e6
            ? "#e0eee0"
            : numeric < 6e6
              ? "#b7d4b4"
              : numeric < 10e6
                ? "#87b58d"
                : numeric < 14e6
                  ? "#5d9775"
                  : "#306e54"
          : overlay === "change" && Number.isFinite(value)
            ? numeric < 10
              ? "#d5e4ee"
              : numeric < 15
                ? "#aecbd7"
                : numeric < 20
                  ? "#83b5bd"
                  : numeric < 25
                    ? "#629c96"
                    : "#366f69"
            : "#c8ddcc";
      const d = shape.rings
        .map(
          (ring) =>
            ring
              .map(
                (point, index) =>
                  (index ? "L" : "M") + project(point).join(","),
              )
              .join(" ") + "Z",
        )
        .join(" ");
      const name = String(shape.properties.name ?? "");
      const region = regions.find((r) => r.id === shape.properties.id);
      const label = region ? project(region.center) : null;
      return `<path d="${d}" fill="${color}" stroke="#567765" stroke-width="1.2" fill-rule="evenodd"><title>${escapeHtml(name)}${metric ? " · " + escapeHtml(formatMetric(value, metric.precision)) : overlay !== "none" && Number.isFinite(value) ? " · " + escapeHtml(value) : ""}</title></path>${label ? `<text x="${label[0]}" y="${label[1]}" text-anchor="middle" font-size="13" fill="#193c2d">${escapeHtml(name)}</text>` : ""}`;
    })
    .join("");
  return `<figure><svg role="img" aria-label="Illustrative geographic overview" viewBox="0 0 1000 ${height}" xmlns="http://www.w3.org/2000/svg">${paths}</svg><figcaption>Simplified geography for exploration.${metric ? " Colour shows " + escapeHtml(metric.name) + " · " + escapeHtml(metric.periodLabel) + ". Provincial observations only." : overlay === "population" ? " Colour shows provincial Census " + year + " population." : overlay === "change" ? " Colour shows population change between Census 2011 and 2022." : ""} Province geometry: 2020, geoBoundaries (CC BY 4.0), OCHA ROSEA / Municipal Demarcation Board (CC BY 3.0 IGO). Country geometry: Natural Earth, public domain.</figcaption></figure>`;
}
export function graphSvg(data: ReportSnapshot) {
  const nodes = data.entities.slice(0, 36);
  if (!nodes.length) return "";
  const height = Math.ceil(nodes.length / 4) * 115 + 30;
  const point = (id: string) => {
    const i = nodes.findIndex((e) => e.id === id);
    return i < 0
      ? null
      : { x: (i % 4) * 240 + 20, y: Math.floor(i / 4) * 115 + 15 };
  };
  const edges = data.relationships
    .map((r) => {
      const a = point(r.source),
        b = point(r.target);
      return a && b
        ? `<path d="M${a.x + 105},${a.y + 32} L${b.x + 105},${b.y + 32}" fill="none" stroke="#b6c8c0" stroke-width="1.4" marker-end="url(#arrow)"><title>${escapeHtml(r.type + ": " + r.description)}</title></path>`
        : "";
    })
    .join("");
  return `<figure><svg role="img" aria-label="Sourced entity connections" viewBox="0 0 1000 ${height}" xmlns="http://www.w3.org/2000/svg"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6" fill="#6c8e7e"/></marker></defs>${edges}${nodes
    .map((e) => {
      const p = point(e.id)!;
      return `<g><rect x="${p.x}" y="${p.y}" width="210" height="64" rx="5" fill="#f2f7f4" stroke="#739d89"/><text x="${p.x + 10}" y="${p.y + 25}" font-size="12" fill="#153a2c">${escapeHtml(e.name.length > 28 ? e.name.slice(0, 26) + "…" : e.name)}</text><text x="${p.x + 10}" y="${p.y + 45}" font-size="10" fill="#5c7466">${escapeHtml(e.type)}</text><title>${escapeHtml(e.name)}</title></g>`;
    })
    .join(
      "",
    )}</svg><figcaption>Connections in this domain. Arrows retain their recorded meaning; read the relationship evidence below.${data.entities.length > 36 ? " Diagram shows the first 36 entities; the complete records are listed below." : ""}</figcaption></figure>`;
}
function chartSvg(
  values: { name: string; value: number | null }[],
  unit: string,
) {
  const min = Math.min(0, ...values.map((v) => v.value ?? 0)),
    max = Math.max(1, ...values.map((v) => v.value ?? 0));
  const scale = 520 / (max - min),
    zero = 220 - min * scale,
    height = values.length * 44 + 25;
  return `<svg role="img" aria-label="Data comparison with a shared zero baseline" viewBox="0 0 1000 ${height}" xmlns="http://www.w3.org/2000/svg"><line x1="${zero}" x2="${zero}" y1="0" y2="${height}" stroke="#849c8e"/>${values
    .map((p, i) => {
      const width = Math.abs(p.value ?? 0) * scale,
        x = (p.value ?? 0) < 0 ? zero - width : zero;
      return `<text x="0" y="${i * 44 + 25}" font-size="13" fill="#284238">${escapeHtml(p.name)}</text><rect x="${x}" y="${i * 44 + 9}" width="${width}" height="23" fill="${(p.value ?? 0) < 0 ? "#bc7067" : "#6c9d80"}"/><text x="780" y="${i * 44 + 25}" font-size="12" fill="#284238">${escapeHtml(formatStatistic(p.value, unit))}</text>`;
    })
    .join("")}</svg>`;
}
function trendSvg(
  series: { name: string; points: { year: number; value: number | null }[] }[],
  unit: string,
) {
  const years = [
    ...new Set(series.flatMap((s) => s.points.map((p) => p.year))),
  ].sort((a, b) => a - b);
  const values = series.flatMap((s) =>
    s.points.flatMap((p) => (p.value === null ? [] : [p.value])),
  );
  if (!years.length || !values.length) return "";
  const min = Math.min(0, ...values),
    max = Math.max(1, ...values),
    range = max - min;
  const point = (year: number, value: number) => [
    90 + (years.indexOf(year) / Math.max(1, years.length - 1)) * 800,
    30 + ((max - value) / range) * 290,
  ];
  const colors = [
    "#47765c",
    "#507fa5",
    "#9d7650",
    "#9674a4",
    "#5f8d8d",
    "#8d944a",
    "#a06359",
    "#64875b",
    "#6c7b9b",
  ];
  const lines = series
    .map((s, n) => {
      let open = false;
      const path = s.points
        .sort((a, b) => a.year - b.year)
        .map((p) => {
          if (p.value === null) {
            open = false;
            return "";
          }
          const command = (open ? "L" : "M") + point(p.year, p.value).join(",");
          open = true;
          return command;
        })
        .join(" ");
      return `<path d="${path}" fill="none" stroke="${colors[n % colors.length]}" stroke-width="2.5"/>${s.points
        .filter((p) => p.value !== null)
        .map((p) => {
          const [x, y] = point(p.year, p.value!);
          return `<circle cx="${x}" cy="${y}" r="3" fill="${colors[n % colors.length]}"><title>${escapeHtml(s.name + " · " + p.year + ": " + formatStatistic(p.value, unit))}</title></circle>`;
        })
        .join(
          "",
        )}<text x="${90 + (n % 3) * 290}" y="${375 + Math.floor(n / 3) * 23}" fill="${colors[n % colors.length]}" font-size="12">${escapeHtml(s.name)}</text>`;
    })
    .join("");
  const labels = years
    .map((year, index) =>
      index === 0 || index === years.length - 1 || index % 5 === 0
        ? `<text x="${point(year, min)[0]}" y="345" text-anchor="middle" font-size="12" fill="#49604f">${year}</text>`
        : "",
    )
    .join("");
  return `<figure><svg role="img" aria-label="Historical trends with source observations" viewBox="0 0 1000 ${390 + Math.ceil(series.length / 3) * 23}" xmlns="http://www.w3.org/2000/svg"><path d="M90,30 V320 H890" fill="none" stroke="#b8cbbc"/><text x="5" y="35" font-size="11" fill="#49604f">${escapeHtml(formatStatistic(max, unit))}</text><text x="5" y="320" font-size="11" fill="#49604f">${escapeHtml(formatStatistic(min, unit))}</text>${lines}${labels}</svg><figcaption>Historical source observations; missing values are not interpolated.${years.length === 2 ? " This chart contains two census observations, not an annual time series." : ""}</figcaption></figure>`;
}
export function renderReport(
  data: ReportSnapshot,
  title: string,
  note: string,
  map?: {
    geography: FeatureCollection;
    overlay: "none" | "population" | "change";
    year?: 2011 | 2022;
    metricId?: MetricId;
  },
) {
  const h = escapeHtml;
  const references = (ids: string[]) =>
    ids
      .map((id) => {
        const s = data.sources.find((s) => s.id === id);
        return s ? `<a href="${safeUrl(s.url)}">[${h(id)}]</a>` : "";
      })
      .join(" ");
  const chart = data.comparison
    ? data.comparisonDisplay === "history"
      ? trendSvg(
          data.comparison.rows.map((r) => ({
            name:
              countries.find((c) => c.code === r.country)?.name ?? r.country,
            points: data
              .comparison!.indicator.observations.filter(
                (o) => o.country === r.country,
              )
              .map((o) => ({ year: o.year, value: o.value })),
          })),
          data.comparison.indicator.unit,
        )
      : chartSvg(
          data.comparison.rows.map((r) => ({
            name:
              countries.find((c) => c.code === r.country)?.name ?? r.country,
            value: r.value,
          })),
          data.comparison.indicator.unit,
        )
    : data.mode === "data" && data.datasets.length
      ? data.chartType === "trend"
        ? trendSvg(
            data.datasets[0].points.map((p) => ({
              name: p.name,
              points: data.datasets.map((d) => ({
                year: Number(d.period),
                value:
                  d.points.find((point) => point.name === p.name)?.value ??
                  null,
              })),
            })),
            "people",
          )
        : chartSvg(
            (
              data.datasets.find((d) => d.id === data.datasetId) ??
              data.datasets[0]
            ).points,
            (
              data.datasets.find((d) => d.id === data.datasetId) ??
              data.datasets[0]
            ).unit,
          )
      : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title>${h(title)} · Civic Intelligence</title><style>body{font:14px/1.65 Arial,sans-serif;color:#20382c;background:#fff;margin:0}main{max-width:1050px;margin:auto;padding:42px}h1{font-size:35px;line-height:1.2}h2{font-size:22px;margin-top:35px;border-bottom:1px solid #dae5dd;padding-bottom:8px}h3{font-size:16px}a{color:#226347;overflow-wrap:anywhere}p{white-space:pre-wrap}.eyebrow{font-size:11px;letter-spacing:2px;color:#558068}table{border-collapse:collapse;width:100%;margin:20px 0;font-size:12px}td,th{padding:10px;text-align:left;border-bottom:1px solid #dae5dd;vertical-align:top}small,figcaption{color:#567060}figure{margin:20px 0}svg{width:100%;height:auto}article{break-inside:avoid}.note{background:#f0f5f1;padding:18px;border-left:3px solid #739d89}.print-help{border:1px solid #ccdcd1;padding:12px;font-size:12px}@page{size:A4;margin:16mm}@media print{main{padding:0}.print-help{display:none}a{color:inherit}h2{break-after:avoid}thead{display:table-header-group}figure{break-inside:avoid}body{font-size:11px}table{font-size:10px}}</style></head><body><main><span class="eyebrow">CIVIC INTELLIGENCE · EXPLORATION REPORT</span><h1>${h(title)}</h1><p>${h(data.country.name)} · ${h(data.domain)} · ${h(data.mode)}<br>Exported ${h(data.exportedAt)}</p><p class="print-help">This self-contained report works offline. Use your browser’s Print command to save a PDF. Follow the numbered source links to verify claims.</p>${note ? `<h2>Investigation notes</h2><p class="note">${h(note)}</p>` : ""}
  ${data.comparison ? `<h2>${h(data.comparison.indicator.name)} · ${h(data.comparison.year ?? "no common year")}</h2><p>${h(data.comparison.indicator.description)} ${references(data.comparison.indicator.sourceIds)}</p>${chart}<table><thead><tr><th>Country</th><th>Value</th><th>Unit</th></tr></thead><tbody>${data.comparison.rows.map((r) => `<tr><td>${h(countries.find((c) => c.code === r.country)?.name ?? r.country)}</td><td>${h(formatStatistic(r.value, data.comparison!.indicator.unit))}</td><td>${h(data.comparison!.indicator.unit)}</td></tr>`).join("")}</tbody></table>` : ""}
  ${data.events.length ? `<h2>Historical events</h2>${data.events.map((event) => `<article><h3>${h(event.date)} · ${h(event.title)}</h3><p>${h(event.description)} ${references(event.sourceIds)}</p></article>`).join("")}` : ""}
  ${map ? `<h2>Geographic overview</h2>${geographySvg(map.geography, map.overlay, map.year, map.metricId)}` : ""}
  ${data.selectedWard ? `<h2>Ward ${h(data.selectedWard.number)} · ${h(entityById(data.selectedWard.municipalityId)?.name)}</h2><p>Publisher identifier: ${h(data.selectedWard.id.replace("ward-", ""))}. ${h(data.boundaryDescription)}. ${references([data.selectedWard.sourceId, "iec-kopanong-2026"])}</p><p>${h(data.selectedWard.geometryNote ?? "")} No ward population or service values are inferred. The province overview remains a separately sourced reference figure; online street tiles are not embedded in this offline report.</p>` : ""}
  ${data.provincialMetric ? `<h2>${h(data.provincialMetric.name)} · ${h(data.provincialMetric.periodLabel)}</h2><p>${h(data.provincialMetric.definition)} ${references(data.provincialMetric.sourceIds)}</p><p>Denominator: ${h(data.provincialMetric.denominator)} ${h(data.provincialMetric.caveats.join(" "))}</p><table><thead><tr><th>Province</th><th>Value</th><th>Period</th></tr></thead><tbody>${data.provincialMetric.observations.map((o) => `<tr><td>${h(regions.find((r) => r.id === o.regionId)?.name ?? o.regionId)}</td><td>${h(formatMetric(o.value, data.provincialMetric!.precision))}</td><td>${h(data.provincialMetric!.periodLabel)}</td></tr>`).join("")}</tbody></table><p>Provincial observations only; no municipal estimates. ${h(data.provincialMetric.method)}</p>` : ""}
  ${["compare", "timeline", "data"].includes(data.mode) ? "" : `<h2>Knowledge connections</h2>${graphSvg(data)}`}
  ${data.mode === "data" ? `<h2>Historical statistics</h2>${chart}${data.datasets.map((d) => `<h3>${h(d.name)}</h3><p>${h(d.note ?? "")} ${references(d.sourceIds)}</p><table><thead><tr><th>Name</th><th>Value (${h(d.unit)})</th></tr></thead><tbody>${d.points.map((p) => `<tr><td>${h(p.name)}</td><td>${h(p.value.toLocaleString("en-ZA"))}</td></tr>`).join("")}</tbody></table>`).join("")}` : ""}
  ${["compare", "timeline"].includes(data.mode) ? "" : `<h2>Entities</h2>${data.entities.map((e) => `<article><h3>${h(e.name)}</h3><small>${h(e.type)}${e.asOf ? " · Reported as of " + h(e.asOf) : ""}</small><p>${h(e.description)} ${references(e.sourceIds)}</p></article>`).join("")}<h2>Relationship evidence</h2><table><thead><tr><th>Connection</th><th>Evidence</th><th>Reporting date</th></tr></thead><tbody>${data.relationships.map((r) => `<tr><td>${h(data.entities.find((e) => e.id === r.source)?.name)} → ${h(data.entities.find((e) => e.id === r.target)?.name)}<br><small>${h(r.type)}</small></td><td>${h(r.description)} ${references(r.sourceIds)}</td><td>${h(r.asOf ?? "Not dated")}</td></tr>`).join("")}</tbody></table>`}
  <h2>Source register</h2>${data.sources.map((source) => `<article><h3>[${h(source.id)}] ${h(source.title)}</h3><p>${h(source.publisher)} · Retrieved ${h(source.retrievedAt)}${source.publishedAt ? " · Published " + h(source.publishedAt) : ""}<br><a href="${safeUrl(source.url)}">${h(source.url)}</a>${source.license ? "<br>" + h(source.license) : ""}${source.note ? "<br>" + h(source.note) : ""}</p></article>`).join("")}<hr><small>Curated records and historical statistical snapshots. No claim of exhaustive coverage or live accuracy. Ownership percentages describe the named direct relationship at its reporting date. Map geography: ${h(data.mapAttribution.publisher)}, ${h(data.mapAttribution.license)}.</small></main></body></html>`;
}
