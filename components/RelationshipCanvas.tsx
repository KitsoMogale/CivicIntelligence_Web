"use client";
import { useEffect, useRef } from "react";
import { entities, relationships } from "@/lib/knowledge";
import { visibleEntityIds } from "@/lib/visibility";
import { useExplorer } from "@/lib/store";
import type { Core } from "cytoscape";
import { canvasLinks } from "@/lib/map-data";
import { traceNetwork } from "@/lib/network";
export default function RelationshipCanvas() {
  const s = useExplorer();
  const container = useRef<HTMLDivElement>(null),
    cy = useRef<Core | null>(null);
  const domain = useExplorer((s) => s.domain),
    selected = useExplorer((s) => s.selectedEntity),
    selectedLink = useExplorer((s) => s.selectedRelationship),
    expanded = useExplorer((s) => s.expanded),
    country = useExplorer((s) => s.country.code),
    fit = useExplorer((s) => s.fitVersion);
  useEffect(() => {
    let cancelled = false;
    import("cytoscape").then(({ default: cytoscape }) => {
      if (cancelled || !container.current) return;
      const ids = visibleEntityIds({
        countryCode: country,
        domain,
        mode: "relationships",
        expanded,
        canvas: s,
      });
      const tracedEdges = s.networkTrace
        ? new Set(
            traceNetwork(s.networkTrace, s.country.code, s.timeRange)
              .relationshipIds,
          )
        : null;
      const graph = cytoscape({
        container: container.current,
        elements: [
          ...entities
            .filter((e) => ids.includes(e.id))
            .map((e) => ({
              data: { id: e.id, label: e.name },
              selected: s.selectionIds.includes(e.id),
            })),
          ...(tracedEdges
            ? relationships.filter((r) => tracedEdges.has(r.id))
            : canvasLinks(s)
          )
            .filter(
              (r) =>
                ids.includes(r.source) &&
                ids.includes(r.target) &&
                (!tracedEdges || tracedEdges.has(r.id)),
            )
            .map((r) => ({
              selected:
                r.id === selectedLink ||
                s.highlightedRelationshipIds.includes(r.id),
              data: {
                id: r.id,
                source: r.source,
                target: r.target,
                label: r.type.toLowerCase().replaceAll("_", " "),
              },
            })),
        ],
        layout: {
          name: "cose",
          animate: false,
          padding: 80,
          nodeDimensionsIncludeLabels: true,
          componentSpacing: 160,
          nodeOverlap: 45,
          nodeRepulsion: () => 100000,
          idealEdgeLength: () => 170,
        },
        style: [
          {
            selector: "node",
            style: {
              "background-color": "#3d7565",
              label: "data(label)",
              color: "#d1ded8",
              "font-size": 12,
              "text-valign": "bottom",
              "text-margin-y": 12,
              "text-wrap": "wrap",
              "text-max-width": "130px",
              "text-background-color": "#10191e",
              "text-background-opacity": 0.9,
              "text-background-padding": "3px",
              width: 30,
              height: 30,
              "border-width": 2,
              "border-color": "#91c6ad",
            },
          },
          {
            selector: "edge",
            style: {
              width: 1.3,
              "line-color": "#42595a",
              "target-arrow-color": "#58776f",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              label: "data(label)",
              "font-size": 9,
              color: "#8da19b",
              "text-background-color": "#10191e",
              "text-background-opacity": 1,
              "text-background-padding": "3px",
            },
          },
          {
            selector: ":selected",
            style: { "background-color": "#bcf2d6", "border-color": "#e7fff1" },
          },
          {
            selector: "edge:selected",
            style: {
              "line-color": "#bce2bc",
              "target-arrow-color": "#bce2bc",
              width: 3,
            },
          },
        ],
        minZoom: 0.3,
        maxZoom: 2,
      });
      cy.current = graph;
      graph.on("tap", "node", (e) => {
        const state = useExplorer.getState(),
          event = e.originalEvent as MouseEvent;
        const id = e.target.id();
        if (event?.ctrlKey || event?.metaKey || event?.shiftKey)
          state.applyActions([
            {
              type: "SELECT_ENTITIES",
              payload: { ids: [...new Set([...state.selectionIds, id])] },
            },
          ]);
        else state.openEntity(id);
      });
      graph.on("tap", "edge", (e) =>
        useExplorer.getState().openRelationship(e.target.id()),
      );
      const observer = new ResizeObserver(() => {
        graph.resize();
        graph.fit(undefined, 70);
        if (graph.zoom() > 1.1) {
          graph.zoom(1.1);
          graph.center();
        }
      });
      observer.observe(container.current);
      graph.on("destroy", () => observer.disconnect());
    });
    return () => {
      cancelled = true;
      cy.current?.destroy();
      cy.current = null;
    };
  }, [
    domain,
    expanded,
    country,
    s.filters,
    s.region,
    s.timeRange,
    s.isolatedEntityIds,
    s.networkTrace,
  ]);
  useEffect(() => {
    cy.current?.nodes().unselect();
    for (const id of s.selectionIds) cy.current?.getElementById(id).select();
    cy.current?.edges().unselect();
    if (selectedLink) cy.current?.getElementById(selectedLink).select();
    for (const id of s.highlightedRelationshipIds)
      cy.current?.getElementById(id).select();
  }, [selected, selectedLink, s.selectionIds, s.highlightedRelationshipIds]);
  useEffect(() => {
    cy.current?.fit(undefined, 70);
  }, [fit]);
  return (
    <>
      <div className="relationship-tools">
        <span>
          {
            visibleEntityIds({
              countryCode: country,
              domain,
              mode: "relationships",
              expanded,
              canvas: s,
            }).length
          }{" "}
          visible entities
        </span>
        {selected && (
          <button onClick={() => useExplorer.getState().toggleNode(selected)}>
            {expanded.includes(selected)
              ? "Collapse selected connections"
              : "Expand selected connections"}
          </button>
        )}
      </div>
      {s.networkTrace && (
        <div className="network-result-note" role="status">
          {(() => {
            const result = traceNetwork(
              s.networkTrace,
              s.country.code,
              s.timeRange,
            );
            return result.found
              ? (s.networkTrace.targetId
                  ? "Shortest documented path"
                  : "Documented neighborhood") +
                  " · " +
                  result.relationshipIds.length +
                  " connections · max " +
                  s.networkTrace.depth +
                  " steps" +
                  (result.truncated ? " · capped" : "")
              : "No documented path within the current filters and step limit.";
          })()}
          <button
            onClick={() =>
              s.navigate(
                { networkTrace: null, highlightedRelationshipIds: [] },
                "Close network trace",
              )
            }
          >
            Close trace
          </button>
        </div>
      )}
      <div
        className="relationship-surface"
        ref={container}
        role="img"
        aria-label="Interactive entity relationship graph. Entity list is available in the knowledge explorer."
      />
    </>
  );
}
