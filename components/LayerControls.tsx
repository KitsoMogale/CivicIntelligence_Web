"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useExplorer } from "@/lib/store";
import { layerRegistry, layerById, type LayerId } from "@/lib/canvas";
import { entities, getSources, relationships } from "@/lib/knowledge";
import { provincialMetrics, type MetricId } from "@/lib/statistics";
export default function LayerControls({ close }: { close: () => void }) {
  const s = useExplorer(),
    ordered = [...s.layers].sort((a, b) => b.zIndex - a.zIndex),
    stats = layerById(s.layers, "statistics");
  const [from, setFrom] = useState(s.timeRange?.[0] ?? ""),
    [to, setTo] = useState(s.timeRange?.[1] ?? ""),
    [error, setError] = useState("");
  function reorder(id: LayerId, offset: number) {
    const ids = [...ordered].reverse().map((l) => l.id),
      index = ids.indexOf(id),
      target = index + offset;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    s.applyActions([{ type: "REORDER_LAYERS", payload: { ids } }]);
  }
  return (
    <section
      className="map-layers-panel canvas-layers-panel"
      aria-label="Map layer controls"
    >
      <header>
        <div>
          <span className="eyebrow">COMPOSE YOUR MAP</span>
          <h3>Layers & detail</h3>
        </div>
        <button
          className="icon-button"
          aria-label="Close map layers"
          onClick={close}
        >
          <X size={17} />
        </button>
      </header>
      <label>
        Information density
        <select
          aria-label="Information density"
          value={s.density}
          onChange={(e) =>
            s.applyActions([
              {
                type: "SET_INFORMATION_DENSITY",
                payload: { density: e.target.value as typeof s.density },
              },
            ])
          }
        >
          <option value="overview">Overview · fewer markers</option>
          <option value="regional">Regional · balanced</option>
          <option value="detailed">Detailed · available records</option>
        </select>
      </label>
      <p>
        Zoom changes geographic scope. Density controls the number of available
        records shown within it.
      </p>
      <details className="canvas-filter-controls">
        <summary>Filter this exploration</summary>
        <label>
          Search records
          <input
            aria-label="Filter canvas records"
            maxLength={120}
            value={s.filters.query}
            onChange={(e) =>
              s.applyActions([
                {
                  type: "SET_FILTERS",
                  payload: { ...s.filters, query: e.target.value },
                },
              ])
            }
          />
        </label>
        <label>
          Entity type
          <select
            aria-label="Filter entity type"
            value={s.filters.entityType}
            onChange={(e) =>
              s.applyActions([
                {
                  type: "SET_FILTERS",
                  payload: { ...s.filters, entityType: e.target.value },
                },
              ])
            }
          >
            <option value="">All entity types</option>
            {[...new Set(entities.map((e) => e.type))].sort().map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Connection type
          <select
            aria-label="Filter relationship type"
            value={s.filters.relationshipType}
            onChange={(e) =>
              s.applyActions([
                {
                  type: "SET_FILTERS",
                  payload: { ...s.filters, relationshipType: e.target.value },
                },
              ])
            }
          >
            <option value="">All relationship types</option>
            {[...new Set(relationships.map((r) => r.type))].sort().map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Relationship evidence period</legend>
          <label>
            From
            <input
              type="date"
              aria-label="Evidence from date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label>
            Through
            <input
              type="date"
              aria-label="Evidence through date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button
            className="outline-button"
            onClick={() => {
              try {
                if (!!from !== !!to) throw new Error("Incomplete date range");
                s.applyActions([
                  {
                    type: "SET_TIME_RANGE",
                    payload: { range: from && to ? [from, to] : null },
                  },
                ]);
                setError("");
              } catch {
                setError("Choose a valid start and end date, in order.");
              }
            }}
          >
            Apply evidence period
          </button>
        </fieldset>
        <p>
          Reporting dates filter documented snapshots. Undated connections are
          omitted when a period is set. Census layers keep their own census
          year.
        </p>
        <button
          className="outline-button"
          onClick={() => {
            s.applyActions([
              {
                type: "SET_FILTERS",
                payload: { query: "", entityType: "", relationshipType: "" },
              },
              { type: "SET_TIME_RANGE", payload: { range: null } },
            ]);
            setFrom("");
            setTo("");
          }}
        >
          Clear filters
        </button>
        {error && <p role="alert">{error}</p>}
      </details>
      <div className="canvas-layer-list">
        {ordered.map((layer, index) => {
          const meta = layerRegistry[layer.id],
            source = getSources([meta.sourceId])[0];
          const available =
            s.country.code === "ZA" ||
            ["countries", "evidence"].includes(layer.id);
          return (
            <article
              key={layer.id}
              data-layer-id={layer.id}
              className="canvas-layer-row"
            >
              <div className="canvas-layer-title">
                <label>
                  <input
                    type="checkbox"
                    aria-label={meta.name}
                    checked={layer.visible}
                    disabled={!available}
                    onChange={(e) =>
                      s.applyActions([
                        {
                          type: "SET_LAYER_VISIBILITY",
                          payload: { id: layer.id, visible: e.target.checked },
                        },
                      ])
                    }
                  />
                  <span
                    className="layer-swatch"
                    style={{ background: meta.style.color }}
                  />
                  {meta.name}
                </label>
                <button
                  aria-label={"Move " + meta.name + " up"}
                  disabled={index === 0}
                  onClick={() => reorder(layer.id, 1)}
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  aria-label={"Move " + meta.name + " down"}
                  disabled={index === ordered.length - 1}
                  onClick={() => reorder(layer.id, -1)}
                >
                  <ArrowDown size={13} />
                </button>
              </div>
              <details>
                <summary>
                  {meta.type} · {Math.round(layer.opacity * 100)}% opacity
                </summary>
                <label>
                  Opacity
                  <input
                    type="range"
                    min="0"
                    max="100"
                    aria-label={meta.name + " opacity"}
                    value={Math.round(layer.opacity * 100)}
                    onChange={(e) =>
                      s.applyActions([
                        {
                          type: "SET_LAYER_OPACITY",
                          payload: {
                            id: layer.id,
                            opacity: +e.target.value / 100,
                          },
                        },
                      ])
                    }
                  />
                </label>
                <p>{meta.legend}</p>
                {source && (
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.publisher} · source ↗
                  </a>
                )}
                {meta.type === "entities" && (
                  <label>
                    Filter this layer
                    <input
                      aria-label={meta.name + " filter"}
                      maxLength={120}
                      value={layer.filters.query}
                      onChange={(e) =>
                        s.applyActions([
                          {
                            type: "SET_LAYER_FILTERS",
                            payload: {
                              id: layer.id,
                              filters: {
                                ...layer.filters,
                                query: e.target.value,
                              },
                            },
                          },
                        ])
                      }
                    />
                  </label>
                )}
              </details>
            </article>
          );
        })}
      </div>
      <label>
        Municipal boundary level
        <select
          aria-label="Municipal boundary level"
          value={s.municipalityLevel}
          onChange={(e) =>
            s.navigate(
              {
                municipalityLevel: e.target.value as typeof s.municipalityLevel,
              },
              "Municipal boundary level",
            )
          }
        >
          <option value="local">Local municipalities + metros · 213</option>
          <option value="district">
            District municipalities + metros · 52
          </option>
        </select>
      </label>
      <p>
        Representative 2020 boundaries from a 2018 source, joined to the 2026
        directory. District and local areas overlap; eight metros occur at both
        levels. Source geometry is illustrative, not a current legal
        demarcation.
      </p>
      <label>
        Statistical measure
        <select
          aria-label="Map data overlay"
          value={stats.visible ? stats.metric : "none"}
          disabled={s.country.code !== "ZA"}
          onChange={(e) =>
            s.applyActions([
              {
                type: "SET_LAYER_VISIBILITY",
                payload: {
                  id: "statistics",
                  visible: e.target.value !== "none",
                },
              },
              {
                type: "SET_STATISTIC",
                payload: {
                  metric:
                    e.target.value === "none"
                      ? "population"
                      : (e.target.value as MetricId),
                  year: stats.year,
                },
              },
            ])
          }
        >
          <option value="none">No statistical overlay</option>
          <option value="population">Population count</option>
          <option value="change">Population change · 2011–2022</option>
          {provincialMetrics.map((metric) => (
            <option key={metric.id} value={metric.id}>
              {metric.name} · {metric.periodLabel}
            </option>
          ))}
        </select>
      </label>
      <label>
        Census year
        <select
          aria-label="Map census year"
          value={stats.year}
          disabled={stats.metric !== "population"}
          onChange={(e) =>
            s.applyActions([
              {
                type: "SET_STATISTIC",
                payload: {
                  metric: stats.metric,
                  year: +e.target.value as 2011 | 2022,
                },
              },
            ])
          }
        >
          <option value="2011">2011</option>
          <option value="2022">2022</option>
        </select>
      </label>
      <label>
        Marker preset
        <select
          aria-label="Map marker layer"
          value={s.markerLayer}
          onChange={(e) =>
            s.navigate(
              { markerLayer: e.target.value as typeof s.markerLayer },
              "Marker preset",
            )
          }
        >
          <option value="all">All available markers</option>
          <option value="institutions">Institutions</option>
          <option value="cities">Cities & towns</option>
          <option value="mining">Mining · province locators</option>
          <option value="infrastructure">
            Power stations · published locators
          </option>
          <option value="none">Hide markers</option>
        </select>
      </label>
    </section>
  );
}
