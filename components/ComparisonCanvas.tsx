"use client";
import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  countries,
  getSources,
  indicators,
  indicatorSnapshot,
} from "@/lib/knowledge";
import { comparisonRows, formatStatistic } from "@/lib/analytics";
import { useExplorer } from "@/lib/store";
echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);
const palette = ["#acd4ba", "#89accf", "#d3b786"];
export default function ComparisonCanvas() {
  const s = useExplorer();
  const container = useRef<HTMLDivElement>(null);
  const view = s.comparisonDisplay;
  const data = comparisonRows(
    s.indicatorCode,
    s.comparisonCountries,
    s.comparisonYear,
  );
  const available = countries.filter((c) =>
    indicators.some((i) => i.observations.some((o) => o.country === c.code)),
  );
  useEffect(() => {
    if (!container.current || !data) return;
    const chart = echarts.init(container.current);
    const years = [
      ...new Set(data.indicator.observations.map((o) => o.year)),
    ].sort();
    chart.setOption({
      backgroundColor: "transparent",
      color: palette,
      textStyle: { fontFamily: "Arial", color: "#a6b8b1" },
      tooltip: {
        trigger: "axis",
        renderMode: "richText",
        valueFormatter: (v: number) => formatStatistic(v, data.indicator.unit),
      },
      legend: {
        bottom: 0,
        textStyle: { color: "#b0bfba" },
        show: view === "history",
      },
      grid: { top: 30, right: 25, left: 75, bottom: 55 },
      xAxis: {
        type: "category",
        data:
          view === "history"
            ? years.map(String)
            : data.rows.map(
                (o) => countries.find((c) => c.code === o.country)?.name,
              ),
        axisLabel: { color: "#aebeb6" },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#233036" } },
        axisLabel: {
          formatter: (v: number) =>
            Math.abs(v) >= 1e6
              ? (v / 1e6).toFixed(0) + "m"
              : Math.abs(v) >= 1e3
                ? (v / 1e3).toFixed(0) + "k"
                : v,
        },
      },
      series:
        view === "snapshot"
          ? [
              {
                type: "bar",
                barMaxWidth: 70,
                data: data.rows.map((o, n) => ({
                  value: o.value,
                  itemStyle: { color: palette[n] },
                })),
                label: {
                  show: true,
                  position: "top",
                  color: "#c6d9ce",
                  formatter: (p: { value: number }) =>
                    formatStatistic(p.value, data.indicator.unit),
                },
              },
            ]
          : s.comparisonCountries.map((country) => ({
              type: "line",
              name: countries.find((c) => c.code === country)?.name,
              connectNulls: false,
              symbolSize: 6,
              data: years.map(
                (year) =>
                  data.indicator.observations.find(
                    (o) => o.country === country && o.year === year,
                  )?.value ?? null,
              ),
            })),
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [
    s.indicatorCode,
    s.comparisonCountries,
    s.comparisonYear,
    view,
    s.fitVersion,
  ]);
  if (!data)
    return (
      <div className="empty-panel">
        <h2>No comparison data available</h2>
        <p>Select an indicator with a published snapshot.</p>
      </div>
    );
  return (
    <section
      className="analysis-view comparison-view"
      aria-label="Country comparison"
    >
      <div className="analysis-heading">
        <div>
          <span className="eyebrow">COMPARE COUNTRIES</span>
          <h2>A shared measure. A clearer perspective.</h2>
          <p>
            Historical World Development Indicators · same indicator and year
          </p>
        </div>
      </div>
      <div className="analysis-controls">
        {s.comparisonCountries.map((country, n) => (
          <label key={n}>
            Country {n + 1}
            <select
              aria-label={"Comparison country " + (n + 1)}
              value={country}
              onChange={(e) =>
                s.navigate({
                  comparisonCountries: s.comparisonCountries.map((c, i) =>
                    i === n ? e.target.value : c,
                  ),
                  comparisonYear: null,
                })
              }
            >
              {available.map((c) => (
                <option
                  key={c.code}
                  value={c.code}
                  disabled={
                    s.comparisonCountries.includes(c.code) && country !== c.code
                  }
                >
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Indicator
          <select
            aria-label="Comparison indicator"
            value={s.indicatorCode}
            onChange={(e) =>
              s.navigate({
                indicatorCode: e.target.value,
                comparisonYear: null,
              })
            }
          >
            {indicators.map((i) => (
              <option key={i.code} value={i.code}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Year
          <select
            aria-label="Comparison year"
            value={s.comparisonYear ?? "latest"}
            onChange={(e) =>
              s.navigate({
                comparisonYear:
                  e.target.value === "latest" ? null : +e.target.value,
              })
            }
          >
            <option value="latest">
              Latest common ({data.years[0] ?? "none"})
            </option>
            {data.years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label>
          Display
          <select
            aria-label="Comparison display"
            value={view}
            onChange={(e) =>
              s.navigate({ comparisonDisplay: e.target.value as typeof view })
            }
          >
            <option value="snapshot">Compare one year</option>
            <option value="history">Historical trends</option>
          </select>
        </label>
      </div>
      <h3 className="chart-title">
        {data.indicator.name}{" "}
        <span>
          {data.indicator.unit} ·{" "}
          {view === "snapshot" ? (data.year ?? "No common year") : "2014–2024"}
        </span>
      </h3>
      {!data.years.length && (
        <p role="status">
          No shared year has values for both countries. Missing values are not
          treated as zero.
        </p>
      )}
      <div
        className="comparison-chart"
        ref={container}
        role="img"
        aria-label={
          data.indicator.name +
          " comparison chart; figures available in table below"
        }
      />
      <table className="evidence-table">
        <caption>
          Comparable observations · {data.year ?? "unavailable"}
        </caption>
        <thead>
          <tr>
            <th>Country</th>
            <th>{data.indicator.name}</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.country}>
              <td>{countries.find((c) => c.code === r.country)?.name}</td>
              <td>{formatStatistic(r.value, data.indicator.unit)}</td>
              <td>{data.indicator.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {view === "history" && (
        <details>
          <summary>View historical data table</summary>
          <table className="evidence-table">
            <thead>
              <tr>
                <th>Year</th>
                {s.comparisonCountries.map((c) => (
                  <th key={c}>
                    {countries.find((known) => known.code === c)?.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...new Set(data.indicator.observations.map((o) => o.year))]
                .sort((a, b) => b - a)
                .map((year) => (
                  <tr key={year}>
                    <td>{year}</td>
                    {s.comparisonCountries.map((country) => (
                      <td key={country}>
                        {formatStatistic(
                          data.indicator.observations.find(
                            (o) => o.country === country && o.year === year,
                          )?.value ?? null,
                          data.indicator.unit,
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </details>
      )}
      <p className="data-method">
        {data.indicator.description} Missing observations remain unavailable.
        Values are a downloaded snapshot, not a live feed. Retrieved{" "}
        {indicatorSnapshot}.
      </p>
      <div className="reference-links">
        {getSources(data.indicator.sourceIds).map((source) => (
          <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
            {source.publisher} · {source.title} ↗
          </a>
        ))}
      </div>
    </section>
  );
}
