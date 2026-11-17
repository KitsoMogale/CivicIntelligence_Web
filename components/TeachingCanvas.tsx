"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  NodeResizer,
  Position,
  ReactFlow,
  applyNodeChanges,
  useReactFlow,
  type Node,
  type NodeProps,
  type NodeChange,
} from "@xyflow/react";
import {
  X,
  ArrowLeft,
  ArrowRight,
  Download,
  LayoutGrid,
  Columns2,
  Plus,
  Focus,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useTeaching } from "@/lib/teaching-store";
import {
  componentKind,
  newTeachingComponent,
  type TeachingComponent,
} from "@/lib/teaching";
const Visual = dynamic(() => import("./TeachingVisual"), {
  ssr: false,
  loading: () => <p>Preparing visual…</p>,
});
type VisualNode = Node<{ component: TeachingComponent }, "visual">;
function ComponentNode({ data, selected }: NodeProps<VisualNode>) {
  const c = data.component,
    board = useTeaching();
  const [text, setText] = useState(c.text);
  useEffect(() => setText(c.text), [c.text]);
  const commit = (patch: Partial<TeachingComponent>) =>
    board.apply([{ type: "upsert_component", component: { ...c, ...patch } }]);
  const element = [...c.nodes, ...c.markers, ...c.events, ...c.edges].find(
    (e) =>
      e.id ===
      (board.document.selectedComponent === c.id
        ? board.document.selectedElement
        : null),
  );
  const marker = c.markers.find((e) => e.id === element?.id);
  return (
    <section
      className={"teaching-component" + (selected ? " is-selected" : "")}
      aria-label={c.title}
    >
      <NodeResizer
        minWidth={300}
        minHeight={240}
        maxWidth={1600}
        maxHeight={1200}
        isVisible={selected}
        onResizeEnd={(_, p) =>
          commit({ x: p.x, y: p.y, width: p.width, height: p.height })
        }
      />
      <Handle type="target" position={Position.Left} />
      <header className="teaching-drag-handle">
        <span>{c.kind}</span>
        <strong>{c.title}</strong>
        <button
          className="nodrag icon-button"
          aria-label={"Close " + c.title}
          onClick={() => board.apply([{ type: "remove_component", id: c.id }])}
        >
          <X size={15} />
        </button>
      </header>
      <div className="teaching-content nodrag nowheel nopan">
        {!["panel", "annotation"].includes(c.kind) && (
          <input
            className="teaching-filter"
            aria-label={"Filter " + c.title}
            placeholder="Filter elements…"
            value={c.filter}
            maxLength={200}
            onChange={(e) =>
              board.apply([
                {
                  type: "filter_elements",
                  componentId: c.id,
                  query: e.target.value,
                },
              ])
            }
          />
        )}
        {["panel", "annotation"].includes(c.kind) ? (
          <textarea
            aria-label={"Edit " + c.title}
            value={text}
            maxLength={1200}
            placeholder="Write a note, or ask AI to explain something here."
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              if (text !== c.text) commit({ text });
            }}
          />
        ) : (
          <>
            <Visual component={c} />
            {c.text && <p className="teaching-explanation">{c.text}</p>}
          </>
        )}
        {element && (
          <div className="teaching-inspector">
            <strong>{element.label}</strong>
            {"detail" in element && <p>{element.detail}</p>}
            {marker && (
              <p>
                {marker.precision === "approximate"
                  ? "Approximate location"
                  : "Published site coordinates"}{" "}
                ·{" "}
                <a href={marker.sourceUrl} target="_blank" rel="noreferrer">
                  Location source
                </a>
              </p>
            )}
            <button
              onClick={() =>
                board.apply([
                  {
                    type: "highlight_elements",
                    componentId: c.id,
                    ids: c.highlighted.includes(element.id)
                      ? c.highlighted.filter((id) => id !== element.id)
                      : [...c.highlighted, element.id],
                  },
                ])
              }
            >
              {c.highlighted.includes(element.id)
                ? "Remove highlight"
                : "Highlight"}
            </button>
            {c.nodes.some((n) => n.id === element.id) && (
              <button
                onClick={() =>
                  commit({
                    collapsed: c.collapsed.includes(element.id)
                      ? c.collapsed.filter((id) => id !== element.id)
                      : [...c.collapsed, element.id],
                  })
                }
              >
                {c.collapsed.includes(element.id)
                  ? "Expand children"
                  : "Collapse children"}
              </button>
            )}
          </div>
        )}
      </div>
      <footer className="nodrag nowheel">
        <span>{c.asOf || "Date not specified"}</span>
        <details>
          <summary>Sources ({c.sources.length})</summary>
          {c.sources.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
              {s.title}
              {s.date ? " · " + s.date : ""}
            </a>
          ))}
          {!c.sources.length && (
            <p>
              Personal note or unsourced content. Ask AI for sources before
              treating it as fact.
            </p>
          )}
        </details>
      </footer>
      <Handle type="source" position={Position.Right} />
    </section>
  );
}
const nodeTypes = { visual: ComponentNode };
function FitOnRequest({ version }: { version: number }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (version) void fitView({ padding: 0.12, duration: 0 });
  }, [version, fitView]);
  return null;
}
export default function TeachingCanvas() {
  const s = useTeaching(),
    [nodes, setNodes] = useState<VisualNode[]>([]),
    [fit, setFit] = useState(0),
    [kind, setKind] = useState<TeachingComponent["kind"]>("annotation");
  useEffect(
    () =>
      setNodes(
        s.document.components.map((c) => ({
          id: c.id,
          type: "visual",
          position: { x: c.x, y: c.y },
          style: { width: c.width, height: c.height },
          width: c.width,
          height: c.height,
          data: { component: c },
          selected: s.document.selectedComponent === c.id,
          dragHandle: ".teaching-drag-handle",
        })),
      ),
    [s.document.components, s.document.selectedComponent],
  );
  const changeNodes = useCallback(
    (changes: NodeChange<VisualNode>[]) =>
      setNodes((ns) => applyNodeChanges(changes, ns)),
    [],
  );
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(s.document, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "civic-teaching-canvas.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="teaching-workspace">
      <nav className="teaching-toolbar" aria-label="Teaching canvas tools">
        <strong>Teaching canvas</strong>
        <button
          aria-label="Undo canvas change"
          disabled={!s.past.length}
          onClick={s.undo}
        >
          <ArrowLeft size={15} />
        </button>
        <button
          aria-label="Redo canvas change"
          disabled={!s.future.length}
          onClick={s.redo}
        >
          <ArrowRight size={15} />
        </button>
        <select
          aria-label="Visual type"
          value={kind}
          onChange={(e) => setKind(e.target.value as TeachingComponent["kind"])}
        >
          {componentKind.options.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <button
          disabled={s.document.components.length >= 12}
          onClick={() =>
            s.apply([
              {
                type: "upsert_component",
                component: newTeachingComponent(
                  kind,
                  s.document.components.length,
                ),
              },
            ])
          }
        >
          <Plus size={14} /> Add visual
        </button>
        <button
          aria-label="Arrange in grid"
          onClick={() => {
            s.apply([{ type: "arrange_canvas", layout: "grid" }]);
            setFit((v) => v + 1);
          }}
        >
          <LayoutGrid size={15} />
        </button>
        <button
          aria-label="Arrange side by side"
          onClick={() => {
            s.apply([{ type: "arrange_canvas", layout: "split" }]);
            setFit((v) => v + 1);
          }}
        >
          <Columns2 size={15} />
        </button>
        <button
          aria-label="Fit teaching canvas"
          onClick={() => setFit((v) => v + 1)}
        >
          <Focus size={15} />
        </button>
        <button aria-label="Export teaching canvas" onClick={download}>
          <Download size={15} />
        </button>
      </nav>
      <div
        className="teaching-board"
        data-component-count={s.document.components.length}
      >
        <ReactFlow<VisualNode>
          id="teaching-board"
          nodes={nodes}
          edges={s.document.connections.map((e) => ({
            ...e,
            style: { stroke: "#b3d8af" },
            labelStyle: { fill: "#d7e4de" },
            labelBgStyle: { fill: "#18292a" },
          }))}
          nodeTypes={nodeTypes}
          onNodesChange={changeNodes}
          viewport={s.document.viewport}
          onMoveEnd={(_, viewport) => {
            if (
              JSON.stringify(viewport) !==
              JSON.stringify(useTeaching.getState().document.viewport)
            )
              s.apply([{ type: "set_canvas_viewport", viewport }]);
          }}
          onNodeDragStop={(_, n) =>
            s.apply([
              {
                type: "upsert_component",
                component: {
                  ...n.data.component,
                  x: n.position.x,
                  y: n.position.y,
                },
              },
            ])
          }
          onNodeClick={(_, n) => {
            const live = useTeaching.getState();
            if (
              live.document.components.some((c) => c.id === n.id) &&
              live.document.selectedComponent !== n.id
            )
              live.apply([
                { type: "select_canvas", componentId: n.id, elementId: null },
              ]);
          }}
          onPaneClick={() => {
            if (s.document.selectedComponent)
              s.apply([
                { type: "select_canvas", componentId: null, elementId: null },
              ]);
          }}
          onConnect={(e) => {
            if (e.source && e.target)
              s.apply([
                {
                  type: "connect_components",
                  connection: {
                    id: "link-" + crypto.randomUUID(),
                    source: e.source,
                    target: e.target,
                    label: "Connected",
                  },
                },
              ]);
          }}
          minZoom={0.15}
          maxZoom={2}
          deleteKeyCode={null}
          colorMode="dark"
          preventScrolling
        >
          <Background gap={24} color="#304144" />
          <Controls showInteractive={false} />
          <FitOnRequest version={fit} />
        </ReactFlow>
        {!s.document.components.length && (
          <div className="teaching-empty">
            <strong>A blank board for your questions</strong>
            <p>
              Ask the assistant to explain a topic visually, or add a visual
              using the toolbar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
