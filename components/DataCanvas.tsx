"use client";
import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, PieChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { ECharts } from "echarts/core";
import { datasets, getSources, regions } from "@/lib/knowledge";
import { useExplorer } from "@/lib/store";
echarts.use([
  BarChart,
  PieChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);
export default function DataCanvas() {
  const container = useRef<HTMLDivElement>(null),
    chart = useRef<ECharts | null>(null);
  const datasetId = useExplorer((s) => s.datasetId),
    fit = useExplorer((s) => s.fitVersion);
  const type = useExplorer((s) => s.chartType),
    data = datasets.find((d) => d.id === datasetId) ?? datasets[0];
  const selection = useExplorer((s) => s.selectionIds);
  const selectedNames = regions
    .filter((r) => selection.includes(r.entityId))
    .map((r) => r.name);
  useEffect(() => {
    if (!container.current) return;
    const c = echarts.init(container.current);
    chart.current = c;
    c.setOption({
      backgroundColor: "transparent",
      textStyle: { fontFamily: "Arial", color: "#9caaa9" },
      tooltip: {
        trigger: type === "pie" ? "item" : "axis",
        renderMode: "richText",
        backgroundColor: "#1a252a",
        borderColor: "#344347",
        textStyle: { color: "#e7eeeb" },
        valueFormatter: (v: number) => Number(v).toLocaleString() + " people",
      },
      grid: {
        left: type === "trend" ? 75 : 115,
        right: 42,
        top: 20,
        bottom: type === "trend" ? 100 : 45,
      },
      legend: {
        show: type === "trend",
        bottom: 0,
        textStyle: { color: "#a6b8ae" },
        type: "scroll",
      },
      xAxis:
        type === "trend"
          ? { type: "category", data: ["2011", "2022"] }
          : type === "bar"
            ? {
                type: "value",
                splitLine: { lineStyle: { color: "#233036" } },
                axisLabel: { formatter: (v: number) => v / 1000000 + "m" },
              }
            : undefined,
      yAxis:
        type === "trend"
          ? {
              type: "value",
              axisLabel: { formatter: (v: number) => v / 1e6 + "m" },
              splitLine: { lineStyle: { color: "#233036" } },
            }
          : type === "bar"
            ? {
                type: "category",
                inverse: true,
                data: data.points.map((p) => p.name),
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { color: "#b0bfba" },
              }
            : undefined,
      series:
        type === "trend"
          ? data.points.map((point) => ({
              type: "line",
              name: point.name,
              symbolSize: 8,
              data: ["2011", "2022"].map(
                (year) =>
                  datasets
                    .find((d) => d.period === year)
                    ?.points.find((p) => p.name === point.name)?.value ?? null,
              ),
              connectNulls: false,
            }))
          : [
              type === "bar"
                ? {
                    type: "bar",
                    data: data.points.map((p) => p.value),
                    barWidth: 22,
                    itemStyle: { color: "#8dc7ad", borderRadius: [0, 3, 3, 0] },
                    emphasis: {
                      itemStyle: {
                        color: "#d8edb1",
                        borderColor: "#eff9df",
                        borderWidth: 2,
                      },
                    },
                  }
                : {
                    type: "pie",
                    radius: ["35%", "65%"],
                    data: data.points,
                    label: { color: "#b0bfba" },
                    itemStyle: { borderColor: "#10191e", borderWidth: 3 },
                    emphasis: {
                      itemStyle: {
                        color: "#d8edb1",
                        borderColor: "#eff9df",
                        borderWidth: 2,
                      },
                    },
                  },
            ],
      color: [
        "#9cd5b8",
        "#6eaa98",
        "#52857e",
        "#405e6c",
        "#6986a1",
        "#8b84a5",
        "#b5a07b",
        "#8f9e79",
        "#557e6e",
      ],
    });
    c.on("click", (params) => {
      const event = params as {
        name?: string;
        seriesName?: string;
        seriesType?: string;
      };
      const name = event.seriesType === "line" ? event.seriesName : event.name;
      const province = regions.find((r) => r.name === name);
      if (province)
        useExplorer.getState().navigate(
          {
            selectedEntity: province.entityId,
            selectionIds: [province.entityId],
            selectedRelationship: null,
          },
          "Select chart province",
        );
    });
    const observer = new ResizeObserver(() => c.resize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, [data, type]);
  useEffect(() => {
    const c = chart.current;
    if (!c) return;
    c.dispatchAction({ type: "downplay" });
    for (const province of regions.filter((r) =>
      selection.includes(r.entityId),
    )) {
      if (type === "trend")
        c.dispatchAction({ type: "highlight", seriesName: province.name });
      else
        c.dispatchAction({
          type: "highlight",
          seriesIndex: 0,
          dataIndex: data.points.findIndex((p) => p.name === province.name),
        });
    }
  }, [selection, type, data]);
  useEffect(() => {
    chart.current?.resize();
  }, [fit]);
  return (
    <div className="data-view">
      <div className="data-heading">
        <div>
          <span className="eyebrow">HISTORICAL DATASET</span>
          <h2>{data.name}</h2>
          <p>
            {type === "trend"
              ? "Two census observations · 2011 and 2022; no annual estimates implied"
              : "Provincial census counts · not current estimates"}
          </p>
        </div>
        <div className="dataset-controls">
          <select
            aria-label="Population dataset"
            value={datasetId}
            onChange={(e) =>
              useExplorer.getState().navigate({ datasetId: e.target.value })
            }
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Chart type"
            value={type}
            onChange={(e) =>
              useExplorer
                .getState()
                .navigate({ chartType: e.target.value as typeof type })
            }
          >
            <option value="bar">Bar chart</option>
            <option value="pie">Donut chart</option>
            <option value="trend">Census 2011 → 2022</option>
          </select>
        </div>
      </div>
      <div className="chart-surface" ref={container} />
      <p className="chart-source">
        {selectedNames.length > 0 && (
          <span className="chart-selection">
            Selected: {selectedNames.join(", ")} ·{" "}
          </span>
        )}
        Source:{" "}
        {getSources(data.sourceIds).map((s) => (
          <a href={s.url} target="_blank" rel="noreferrer" key={s.id}>
            {s.publisher} ↗
          </a>
        ))}{" "}
        · Census {type === "trend" ? "2011 and 2022" : data.period}
      </p>
      <p className="data-method">
        {data.note}
        {type === "trend"
          ? " The published 2011 provincial values sum to one more person than the printed national total. Source integers are preserved."
          : ""}
      </p>
      <details>
        <summary>View accessible data table</summary>
        <table>
          <thead>
            <tr>
              <th>Province</th>
              <th>Population ({data.period})</th>
              {type === "trend" && <th>Other census</th>}
            </tr>
          </thead>
          <tbody>
            {data.points.map((p) => (
              <tr
                key={p.name}
                className={
                  selectedNames.includes(p.name) ? "selected-data-row" : ""
                }
              >
                <td>
                  <button
                    className="chart-province-button"
                    aria-pressed={selectedNames.includes(p.name)}
                    onClick={() => {
                      const region = regions.find((r) => r.name === p.name);
                      if (region)
                        useExplorer.getState().navigate(
                          {
                            selectedEntity: region.entityId,
                            selectionIds: [region.entityId],
                            selectedRelationship: null,
                          },
                          "Select chart province",
                        );
                    }}
                  >
                    {p.name}
                  </button>
                </td>
                <td>{p.value.toLocaleString()}</td>
                {type === "trend" && (
                  <td>
                    {datasets
                      .find((d) => d.id !== data.id)
                      ?.points.find((point) => point.name === p.name)
                      ?.value.toLocaleString("en-ZA") ?? "Not available"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
