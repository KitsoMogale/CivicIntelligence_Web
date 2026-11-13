"use client";
import { useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
  type NodeProps,
  type Node,
  type Edge,
} from "@xyflow/react";
import {
  ChevronDown,
  ChevronRight,
  Landmark,
  Zap,
  Building2,
  ArrowUpRight,
} from "lucide-react";
import { descendants, domains, entities, relationships } from "@/lib/knowledge";
import { useExplorer } from "@/lib/store";
import { visibleEntityIds } from "@/lib/visibility";
import { canvasLinks } from "@/lib/map-data";
type KnowledgeNode = Node<
  {
    label: string;
    kind: string;
    entityId: string;
    expandable: boolean;
    expanded: boolean;
    domain: string;
    horizontal: boolean;
  },
  "knowledge"
>;
function EntityNode({ data, selected }: NodeProps<KnowledgeNode>) {
  const open = useExplorer((s) => s.openEntity),
    toggle = useExplorer((s) => s.toggleNode);
  const Icon =
    data.domain === "infrastructure"
      ? Zap
      : data.kind.includes("government")
        ? Landmark
        : Building2;
  return (
    <div
      className={"knowledge-node " + (selected ? "is-selected" : "")}
      data-domain={data.domain}
    >
      <Handle
        type="target"
        position={data.horizontal ? Position.Left : Position.Top}
      />
      <button
        className="node-main"
        onClick={(event) => {
          event.stopPropagation();
          if (event.ctrlKey || event.metaKey || event.shiftKey) {
            const state = useExplorer.getState();
            state.applyActions([
              {
                type: "SELECT_ENTITIES",
                payload: {
                  ids: [...new Set([...state.selectionIds, data.entityId])],
                },
              },
            ]);
          } else open(data.entityId);
        }}
        aria-label={"View " + data.label}
      >
        <span className="node-icon">
          <Icon size={17} />
        </span>
        <span>
          <small>{data.kind}</small>
          <strong>{data.label}</strong>
        </span>
        <ArrowUpRight size={14} />
      </button>
      {data.expandable && (
        <button
          className="node-expand"
          onClick={(event) => {
            event.stopPropagation();
            toggle(data.entityId);
          }}
          aria-label={(data.expanded ? "Collapse " : "Expand ") + data.label}
        >
          {data.expanded ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronRight size={12} />
          )}{" "}
          {data.expanded ? "Collapse connections" : "Explore connections"}
        </button>
      )}
      <Handle
        type="source"
        position={data.horizontal ? Position.Right : Position.Bottom}
      />
    </div>
  );
}
const nodeTypes = { knowledge: EntityNode };
function Canvas() {
  const s = useExplorer(),
    flow = useReactFlow();
  const graph = useMemo(() => {
    const root = domains.find((d) => d.id === s.domain)!.root,
      ids = new Set<string>(
        visibleEntityIds({
          countryCode: s.country.code,
          domain: s.domain,
          mode: s.mode,
          expanded: s.expanded,
          canvas: s,
        }),
      ),
      all = descendants(root),
      relevant = canvasLinks(s).filter((r) => all.includes(r.source));
    const list = entities.filter((e) => ids.has(e.id)),
      levels: Record<string, number> = { [root]: 0 };
    for (let n = 0; n < list.length; n++)
      relevant.forEach((r) => {
        if (levels[r.source] !== undefined && levels[r.target] === undefined)
          levels[r.target] = levels[r.source] + 1;
      });
    const groups: Record<number, string[]> = {};
    list.forEach((e) => (groups[levels[e.id] ?? 1] ??= []).push(e.id));
    const offsets: Record<number, number> = {};
    let offset = 0;
    Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((level) => {
        offsets[level] = offset;
        offset += Math.ceil(groups[level].length / 6) * 175;
      });
    const nodes: KnowledgeNode[] = list.map((e) => {
      const level = levels[e.id] ?? 1,
        peers = groups[level];
      return {
        id: e.id,
        type: "knowledge",
        position:
          s.mode === "flow"
            ? { x: level * 310, y: 120 }
            : {
                x:
                  ((peers.indexOf(e.id) % 6) -
                    (Math.min(peers.length, 6) - 1) / 2) *
                  285,
                y: offsets[level] + Math.floor(peers.indexOf(e.id) / 6) * 175,
              },
        selected: s.selectionIds.includes(e.id),
        data: {
          label: e.name,
          kind: e.type,
          entityId: e.id,
          expandable: relevant.some((r) => r.source === e.id),
          expanded: s.expanded.includes(e.id),
          domain: e.domain,
          horizontal: s.mode === "flow",
        },
      };
    });
    const edges: Edge[] = relevant
      .filter((r) => ids.has(r.source) && ids.has(r.target))
      .map((r) => ({
        id: r.id,
        source: r.source,
        target: r.target,
        selected:
          s.selectedRelationship === r.id ||
          s.highlightedRelationshipIds.includes(r.id),
        label:
          r.type === "INDEPENDENT_JUDICIARY"
            ? "independent"
            : s.mode === "flow" || s.domain === "industry"
              ? r.type.toLowerCase().replaceAll("_", " ")
              : undefined,
        type: "smoothstep",
        animated: s.mode === "flow",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#405757" },
        style: {
          stroke:
            s.selectedRelationship === r.id ||
            s.highlightedRelationshipIds.includes(r.id)
              ? "#bce2bc"
              : "#405757",
          strokeWidth:
            s.selectedRelationship === r.id ||
            s.highlightedRelationshipIds.includes(r.id)
              ? 2.5
              : 1.5,
        },
        labelStyle: { fill: "#99aeaa", fontSize: 10 },
      }));
    return { nodes, edges };
  }, [
    s.country.code,
    s.domain,
    s.mode,
    s.expanded,
    s.selectedEntity,
    s.selectedRelationship,
    s.selectionIds,
    s.highlightedRelationshipIds,
    s.filters,
    s.region,
    s.timeRange,
    s.isolatedEntityIds,
  ]);
  useEffect(() => {
    const t = setTimeout(
      () => flow.fitView({ padding: 0.22, duration: 350, maxZoom: 1.1 }),
      80,
    );
    return () => clearTimeout(t);
  }, [s.fitVersion, s.domain, s.mode, graph.nodes.length, flow]);
  return (
    <ReactFlow
      nodes={graph.nodes}
      edges={graph.edges}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.2}
      maxZoom={1.8}
      onNodeClick={(e, n) =>
        e.ctrlKey || e.shiftKey
          ? s.applyActions([
              {
                type: "SELECT_ENTITIES",
                payload: { ids: [...new Set([...s.selectionIds, n.id])] },
              },
            ])
          : s.openEntity(n.id)
      }
      onEdgeClick={(_, e) => s.openRelationship(e.id)}
      nodesDraggable={false}
      colorMode="dark"
    >
      <Background color="#283137" gap={24} size={1} />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor="#3d6f66"
        maskColor="rgba(12,17,20,.8)"
        pannable
        zoomable
      />
    </ReactFlow>
  );
}
export default function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}
