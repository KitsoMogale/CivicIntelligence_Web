"use client";
import { useExplorer } from "@/lib/store";
import { entityById } from "@/lib/knowledge";
import { canvasLinks } from "@/lib/map-data";
export default function CanvasTools() {
  const s = useExplorer();
  function trace() {
    const links = canvasLinks(s).filter(
      (r) =>
        s.selectionIds.includes(r.source) || s.selectionIds.includes(r.target),
    );
    const ids = [
      ...new Set([
        ...s.selectionIds,
        ...links.flatMap((r) => [r.source, r.target]),
      ]),
    ].slice(0, 200);
    s.applyActions([
      { type: "SELECT_ENTITIES", payload: { ids } },
      {
        type: "HIGHLIGHT_RELATIONSHIPS",
        payload: { ids: links.map((r) => r.id).slice(0, 200) },
      },
    ]);
  }
  return (
    <div className="canvas-tools" aria-label="Shared canvas controls">
      <label>
        Layout
        <select
          aria-label="Canvas layout"
          value={s.layout}
          onChange={(e) =>
            s.applyActions([
              {
                type: "SET_LAYOUT",
                payload: { layout: e.target.value as typeof s.layout },
              },
            ])
          }
        >
          <option value="single">Single view</option>
          <option value="overlay">Map + overlay</option>
        </select>
      </label>
      <span
        className="selection-status"
        title={s.selectionIds.map((id) => entityById(id)?.name).join(" · ")}
      >
        {s.selectionIds.length} selected
        {s.region ? " · " + entityById(s.region)?.name : ""}
      </span>
      <button disabled={!s.selectionIds.length} onClick={trace}>
        Trace connections
      </button>
      <button
        disabled={!s.selectionIds.length && !s.isolatedEntityIds.length}
        onClick={() =>
          s.applyActions([
            {
              type: "ISOLATE_ENTITIES",
              payload: {
                ids: s.isolatedEntityIds.length ? [] : s.selectionIds,
              },
            },
          ])
        }
      >
        {s.isolatedEntityIds.length ? "Show all" : "Isolate"}
      </button>
      <button
        disabled={!s.selectionIds.length}
        onClick={() =>
          s.applyActions([{ type: "CLEAR_SELECTION", payload: {} }])
        }
      >
        Clear
      </button>
      <details className="canvas-history">
        <summary>History · {s.past.length}</summary>
        <div>
          <strong>Reversible exploration</strong>
          <p>Use Back/Forward or Ctrl+Z / Ctrl+Shift+Z outside text fields.</p>
          <button disabled={!s.past.length} onClick={s.back}>
            Undo
          </button>
          <button disabled={!s.future.length} onClick={s.forward}>
            Redo
          </button>
          <ol>
            {s.pastLabels
              .slice(-10)
              .reverse()
              .map((label, i) => (
                <li key={i}>{label}</li>
              ))}
          </ol>
          {!s.past.length && <p>Your next canvas change will appear here.</p>}
        </div>
      </details>
    </div>
  );
}
