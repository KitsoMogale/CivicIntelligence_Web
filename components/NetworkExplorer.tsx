"use client";
import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import {
  entities,
  relationships,
  entityById,
  getSources,
} from "@/lib/knowledge";
import { useExplorer } from "@/lib/store";
import { traceNetwork, type NetworkQuery } from "@/lib/network";
export default function NetworkExplorer({ close }: { close: () => void }) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>("button")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
      if (event.key !== "Tab") return;
      const controls = [
        ...dialog.current!.querySelectorAll<HTMLElement>(
          "button:not([disabled]),select,input,a[href]",
        ),
      ];
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [close]);
  const s = useExplorer(),
    options = entities
      .filter((e) => e.country === s.country.code)
      .sort((a, b) => a.name.localeCompare(b.name));
  const [query, setQuery] = useState<NetworkQuery>(
    s.networkTrace ?? {
      startId: s.selectedEntity ?? options[0]?.id ?? "",
      targetId: null,
      depth: 3,
      direction: "both",
      relationshipType: s.filters.relationshipType,
      includeDirectory: false,
    },
  );
  const [error, setError] = useState("");
  const result = query.startId
    ? traceNetwork(query, s.country.code, s.timeRange)
    : null;
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        ref={dialog}
        className="modal network-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Explore documented networks"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="icon-button modal-close"
          aria-label="Close network explorer"
          onClick={close}
        >
          <X size={18} />
        </button>
        <span className="eyebrow">FOLLOW THE EVIDENCE</span>
        <h2>Explore a documented network.</h2>
        <p>
          Find neighbors across several steps or the shortest recorded path to
          another entity. Arrows retain their original meaning and direction.
          Search covers the active country; applying a trace resets region and
          entity filters.
        </p>
        <label>
          Start entity
          <select
            aria-label="Network start entity"
            value={query.startId}
            onChange={(e) => setQuery({ ...query, startId: e.target.value })}
          >
            {options.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Destination (optional)
          <select
            aria-label="Network destination"
            value={query.targetId ?? ""}
            onChange={(e) =>
              setQuery({ ...query, targetId: e.target.value || null })
            }
          >
            <option value="">Explore all reachable neighbors</option>
            {options.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <div className="network-form-row">
          <label>
            Maximum steps
            <select
              aria-label="Network maximum steps"
              value={query.depth}
              onChange={(e) => setQuery({ ...query, depth: +e.target.value })}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label>
            Traversal
            <select
              aria-label="Network direction"
              value={query.direction}
              onChange={(e) =>
                setQuery({
                  ...query,
                  direction: e.target.value as NetworkQuery["direction"],
                })
              }
            >
              <option value="both">Both directions</option>
              <option value="outgoing">Outgoing arrows</option>
              <option value="incoming">Incoming arrows</option>
            </select>
          </label>
        </div>
        <label>
          Relationship type
          <select
            aria-label="Network relationship type"
            value={query.relationshipType}
            onChange={(e) =>
              setQuery({ ...query, relationshipType: e.target.value })
            }
          >
            <option value="">All allowed connection types</option>
            {[...new Set(relationships.map((r) => r.type))].sort().map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            aria-label="Include directory connections"
            checked={query.includeDirectory}
            onChange={(e) =>
              setQuery({ ...query, includeDirectory: e.target.checked })
            }
          />
          Include directory and geographic-context connections
        </label>
        <p>
          {s.timeRange
            ? "Evidence period: " +
              s.timeRange.join(" through ") +
              ". Undated connections are omitted."
            : "All recorded reporting dates; each edge retains its own source date."}{" "}
          Traversing an arrow backwards establishes connectivity, not a reverse
          ownership or supply claim.
        </p>
        {result && (
          <div className="network-preview" role="status">
            {result.found
              ? result.nodeIds.length +
                " records · " +
                result.relationshipIds.length +
                " documented connections"
              : "No documented path within these filters and maximum steps."}
            {result.truncated &&
              " Search capped at 150 records / 200 connections; narrow the filters."}
          </div>
        )}
        {result?.path.length ? (
          <ol className="network-path">
            {result.path.map((step) => (
              <li key={step.relationship.id}>
                <strong>
                  {entityById(step.from)?.name} → {entityById(step.to)?.name}
                </strong>
                <span>
                  {step.relationship.type.replaceAll("_", " ")}{" "}
                  {step.reverse ? "· traversed against the arrow" : ""}{" "}
                  {step.relationship.asOf
                    ? "· " + step.relationship.asOf
                    : "· no reporting date"}
                </span>
                {getSources(step.relationship.sourceIds).map((source) => (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.publisher} ↗
                  </a>
                ))}
              </li>
            ))}
          </ol>
        ) : null}
        <button
          className="outline-button"
          disabled={!query.startId}
          onClick={() => {
            try {
              s.applyActions([
                {
                  type: "SET_FILTERS",
                  payload: {
                    ...s.filters,
                    relationshipType: query.relationshipType,
                  },
                },
                { type: "TRACE_NETWORK", payload: query },
              ]);
              close();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not trace this network",
              );
            }
          }}
        >
          Show network on canvas
        </button>
        {error && <p role="alert">{error}</p>}
      </section>
    </div>
  );
}
