"use client";
import { useState } from "react";
import { entities, countryRegions } from "@/lib/knowledge";
import { useExplorer } from "@/lib/store";
import type { Domain } from "@/lib/types";
export default function KnowledgeTree({
  domain,
  root,
  onSelect,
}: {
  domain: Domain;
  root: string;
  onSelect: () => void;
}) {
  const s = useExplorer();
  const regions = countryRegions(s.country.code);
  const [filter, setFilter] = useState("");
  const [region, setRegion] = useState("all");
  const records = entities.filter(
    (e) =>
      e.domain === domain &&
      e.country === s.country.code &&
      e.id !== root &&
      (region === "all" || e.region === region) &&
      (e.name + " " + e.type).toLowerCase().includes(filter.toLowerCase()),
  );
  const groups = [...new Set(records.map((e) => e.type))];
  return (
    <div className="domain-children knowledge-tree">
      <input
        aria-label="Filter domain entities"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Find an entity…"
      />
      {domain === "government" && (
        <select
          aria-label={
            s.country.code === "ZA"
              ? "Filter explorer province"
              : "Filter explorer administrative area"
          }
          value={region}
          onChange={(e) => setRegion(e.target.value)}
        >
          <option value="all">
            {s.country.code === "ZA"
              ? "All provinces / national"
              : "All areas / national"}
          </option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      )}
      {groups.map((group) => (
        <details key={group} open={!!filter || undefined}>
          <summary>
            {group}
            <small>{records.filter((e) => e.type === group).length}</small>
          </summary>
          {records
            .filter((e) => e.type === group)
            .map((entity) => (
              <button
                key={entity.id}
                className={s.selectedEntity === entity.id ? "active" : ""}
                onClick={() => {
                  s.openEntity(entity.id);
                  onSelect();
                }}
              >
                {entity.name}
              </button>
            ))}
        </details>
      ))}
      {!records.length && <p>No records match this filter.</p>}
    </div>
  );
}
