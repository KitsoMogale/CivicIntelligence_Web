"use client";
import { useEffect, useMemo, useRef } from "react";
import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  type Node,
} from "@xyflow/react";
import type { Core } from "cytoscape";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import dynamic from "next/dynamic";
import { useTeaching } from "@/lib/teaching-store";
import type { TeachingComponent } from "@/lib/teaching";
const TeachingMap = dynamic(() => import("./TeachingMap"), { ssr: false });
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);
function select(c: TeachingComponent, elementId: string) {
  useTeaching
    .getState()
    .apply([{ type: "select_canvas", componentId: c.id, elementId }]);
}
export function visibleTeachingNodes(c: TeachingComponent) {
  const hidden = new Set<string>(),
    pending = [...c.collapsed],
    visited = new Set<string>();
  while (pending.length) {
    const parent = pending.shift()!;
    if (visited.has(parent)) continue;
    visited.add(parent);
    for (const e of c.edges.filter((e) => e.source === parent)) {
      if (!c.collapsed.includes(e.target)) hidden.add(e.target);
      pending.push(e.target);
    }
  }
  return c.nodes.filter(
    (n) =>
      !hidden.has(n.id) &&
      (!c.filter ||
        (n.label + " " + n.detail)
          .toLowerCase()
          .includes(c.filter.toLowerCase())),
  );
}
function Diagram({ c }: { c: TeachingComponent }) {
  const visible = useMemo(() => visibleTeachingNodes(c), [c]);
  const ids = new Set(visible.map((n) => n.id));
  const nodes: Node[] = visible.map((n, i) => ({
    id: n.id,
    position: { x: (i % 2) * 220, y: Math.floor(i / 2) * 110 },
    data: { label: n.label + (c.collapsed.includes(n.id) ? " +" : "") },
    style: {
      width: 185,
      background: c.highlighted.includes(n.id) ? "#355c42" : "#203438",
      borderColor: "#7ba493",
      color: "#ecf1ec",
      fontSize: 12,
      padding: 12,
    },
  }));
  return (
    <div className="teaching-visual nodrag nowheel">
      <ReactFlowProvider>
        <ReactFlow
          id={"diagram-" + c.id}
          nodes={nodes}
          edges={c.edges
            .filter((e) => ids.has(e.source) && ids.has(e.target))
            .map((e) => ({
              ...e,
              label: e.label,
              animated: c.highlighted.includes(e.id),
              labelStyle: { fill: "#a8bdb4" },
              labelBgStyle: { fill: "#132629" },
              style: {
                stroke: c.highlighted.includes(e.id) ? "#eac277" : "#7ba493",
              },
            }))}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          nodesDraggable={false}
          nodesConnectable={false}
          deleteKeyCode={null}
          onNodeClick={(event, n) => {
            event.stopPropagation();
            select(c, n.id);
          }}
          onEdgeClick={(event, e) => {
            event.stopPropagation();
            select(c, e.id);
          }}
          onPaneClick={(event) => event.stopPropagation()}
          minZoom={0.2}
          maxZoom={2}
          colorMode="dark"
        >
          <Background gap={24} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
function Relationship({ c }: { c: TeachingComponent }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false,
      graph: Core | undefined,
      observer: ResizeObserver | undefined;
    import("cytoscape").then(({ default: cytoscape }) => {
      if (cancelled || !ref.current) return;
      const nodes = visibleTeachingNodes(c),
        ids = new Set(nodes.map((n) => n.id));
      graph = cytoscape({
        container: ref.current,
        elements: [
          ...nodes.map((n) => ({
            data: { id: n.id, label: n.label },
            classes: c.highlighted.includes(n.id) ? "highlight" : "",
          })),
          ...c.edges
            .filter((e) => ids.has(e.source) && ids.has(e.target))
            .map((e) => ({
              data: { ...e },
              classes: c.highlighted.includes(e.id) ? "highlight" : "",
            })),
        ],
        layout: { name: "cose", animate: false, padding: 25 },
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "background-color": "#76a38d",
              color: "#e3ebe3",
              "font-size": 11,
              "text-wrap": "wrap",
              "text-max-width": "100px",
              "text-valign": "bottom",
              "text-margin-y": 5,
            },
          },
          {
            selector: "edge",
            style: {
              label: "data(label)",
              width: 1.5,
              "line-color": "#678d87",
              "target-arrow-color": "#678d87",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              "font-size": 9,
              color: "#b5c8c0",
            },
          },
          {
            selector: ".highlight",
            style: {
              "background-color": "#e9c17b",
              "line-color": "#e9c17b",
              "target-arrow-color": "#e9c17b",
              width: 4,
            },
          },
        ],
      });
      graph.on("tap", "node,edge", (event) => select(c, event.target.id()));
      observer = new ResizeObserver(() => graph?.resize());
      observer.observe(ref.current);
    });
    return () => {
      cancelled = true;
      observer?.disconnect();
      graph?.destroy();
    };
  }, [c.nodes, c.edges, c.collapsed, c.filter, c.highlighted]);
  return (
    <div
      ref={ref}
      className="teaching-visual nodrag nowheel"
      aria-label={c.title + " relationship graph"}
    />
  );
}
function Chart({ c }: { c: TeachingComponent }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current),
      series = c.series.map((s) => ({
        ...s,
        points: s.points.filter(
          (p) =>
            !c.filter || p.label.toLowerCase().includes(c.filter.toLowerCase()),
        ),
      }));
    const labels = [
      ...new Set(series.flatMap((s) => s.points.map((p) => p.label))),
    ];
    chart.setOption({
      backgroundColor: "transparent",
      textStyle: { color: "#b8ccc1" },
      tooltip: {
        trigger: c.chartType === "pie" ? "item" : "axis",
        renderMode: "richText",
      },
      legend: { type: "scroll", textStyle: { color: "#b8ccc1" } },
      grid: { left: 65, right: 25, top: 40, bottom: 65 },
      ...(c.chartType === "pie"
        ? {}
        : {
            xAxis: {
              type: "category",
              data: labels,
              axisLabel: { rotate: 25 },
            },
            yAxis: { type: "value", name: series[0]?.unit || "" },
          }),
      series: (c.chartType === "pie" ? series.slice(0, 1) : series).map(
        (s) => ({
          name: s.name + (s.unit ? " (" + s.unit + ")" : ""),
          type: c.chartType,
          connectNulls: false,
          ...(c.chartType === "pie"
            ? {
                radius: ["20%", "65%"],
                data: s.points
                  .filter((p) => p.value !== null)
                  .map((p) => ({ name: p.label, value: p.value })),
              }
            : {
                data: labels.map(
                  (label) =>
                    s.points.find((p) => p.label === label)?.value ?? null,
                ),
              }),
        }),
      ),
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [c.series, c.chartType, c.filter]);
  return (
    <>
      <div
        ref={ref}
        className="teaching-visual"
        role="img"
        aria-label={c.title + " chart"}
      />
      <details className="teaching-data-table">
        <summary>View chart values</summary>
        <table>
          <thead>
            <tr>
              <th>Series</th>
              <th>Label</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {c.series.flatMap((s) =>
              s.points.map((p) => (
                <tr key={s.name + p.label}>
                  <td>{s.name}</td>
                  <td>{p.label}</td>
                  <td>
                    {p.value === null
                      ? "Unavailable"
                      : p.value.toLocaleString()}{" "}
                    {s.unit}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </details>
    </>
  );
}
export default function TeachingVisual({
  component: c,
}: {
  component: TeachingComponent;
}) {
  if (c.kind === "map") return <TeachingMap component={c} />;
  if (c.kind === "hierarchy" || c.kind === "flow")
    return c.nodes.length ? (
      <Diagram c={c} />
    ) : (
      <p className="teaching-placeholder">
        Ask AI to build a diagram about your topic.
      </p>
    );
  if (c.kind === "relationships")
    return c.nodes.length ? (
      <Relationship c={c} />
    ) : (
      <p className="teaching-placeholder">Ask AI to show connections.</p>
    );
  if (c.kind === "chart")
    return c.series.length ? (
      <Chart c={c} />
    ) : (
      <p className="teaching-placeholder">
        Ask AI for a sourced comparison or trend.
      </p>
    );
  return (
    <ol className="teaching-timeline">
      {c.events
        .filter(
          (e) =>
            !c.filter ||
            (e.label + e.detail + e.date)
              .toLowerCase()
              .includes(c.filter.toLowerCase()),
        )
        .map((e) => (
          <li key={e.id}>
            <button
              className={c.highlighted.includes(e.id) ? "highlight" : ""}
              onClick={() => select(c, e.id)}
            >
              <time>{e.date}</time>
              <strong>{e.label}</strong>
              <span>{e.detail}</span>
            </button>
          </li>
        ))}
      {!c.events.length && <li>Ask AI to build a timeline.</li>}
    </ol>
  );
}
