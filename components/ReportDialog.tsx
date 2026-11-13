"use client";
import { useMemo, useState, useEffect } from "react";
import type { FeatureCollection } from "geojson";
import { Download, X } from "lucide-react";
import { useExplorer } from "@/lib/store";
import { knowledgeSnapshot } from "@/lib/snapshot";
import { renderReport } from "@/lib/report";
import { getSources } from "@/lib/knowledge";
import { visibleEntityIds } from "@/lib/visibility";
import { layerById } from "@/lib/canvas";
import { metricById } from "@/lib/statistics";
export default function ReportDialog({ close }: { close: () => void }) {
  const s = useExplorer();
  const [geography, setGeography] = useState<FeatureCollection | null>(null),
    [mapStatus, setMapStatus] = useState("");
  useEffect(() => {
    if (s.mode !== "geographic" && s.layout === "single") return;
    let cancelled = false;
    setMapStatus("Preparing the map figure…");
    setGeography(null);
    fetch(
      s.country.code === "ZA"
        ? "/data/za-provinces.geojson"
        : "/data/countries.geojson",
    )
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((geo: FeatureCollection) => {
        if (cancelled) return;
        setGeography(
          s.country.code === "ZA"
            ? geo
            : {
                ...geo,
                features: geo.features.filter(
                  (f) => f.properties?.code === s.country.code,
                ),
              },
        );
        setMapStatus("");
      })
      .catch(() => {
        if (!cancelled)
          setMapStatus(
            "The map figure could not load. Evidence and tables can still be exported.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [s.mode, s.layout, s.country.code]);
  const [title, setTitle] = useState(
    s.country.name +
      " · " +
      (s.mode === "compare"
        ? "Country comparison"
        : s.mode === "timeline"
          ? "Historical timeline"
          : s.domain + " exploration"),
  );
  const [note, setNote] = useState("");
  const [scope, setScope] = useState("visible");
  const data = useMemo(() => {
    const full = knowledgeSnapshot(
      scope === "domain" ? { ...s, networkTrace: null } : s,
    );
    if (scope === "domain" || ["compare", "timeline", "data"].includes(s.mode))
      return full;
    const visible = new Set(
      visibleEntityIds({
        countryCode: s.country.code,
        domain: s.domain,
        mode: s.mode,
        expanded: s.expanded,
        markerLayer: s.markerLayer,
        provinceLayer: s.provinceLayer,
        canvas: s,
      }),
    );
    const links = full.relationships.filter((r) =>
      scope === "selection"
        ? r.source === s.selectedEntity || r.target === s.selectedEntity
        : visible.has(r.source) && visible.has(r.target),
    );
    const ids =
      scope === "selection"
        ? new Set([
            s.selectedEntity,
            ...links.flatMap((r) => [r.source, r.target]),
          ])
        : visible;
    const records = full.entities.filter((e) => ids.has(e.id));
    const refs = new Set(
      [...records, ...links, ...full.datasets].flatMap((r) => r.sourceIds),
    );
    if (
      (s.mode === "geographic" || s.layout !== "single") &&
      s.country.code === "ZA"
    ) {
      refs.add("province-boundaries");
      if (s.populationLayer !== "none") refs.add("census");
      if (layerById(s.layers, "municipalities").visible)
        refs.add("municipal-boundaries");
      metricById(layerById(s.layers, "statistics").metric)?.sourceIds.forEach(
        (id) => refs.add(id),
      );
    }
    full.provincialMetric?.sourceIds.forEach((id) => refs.add(id));
    return {
      ...full,
      entities: records,
      relationships: links,
      sources: getSources([...refs]),
    };
  }, [s, scope]);
  const html = useMemo(
    () =>
      renderReport(
        data,
        title,
        note,
        geography
          ? {
              geography,
              overlay: s.country.code === "ZA" ? s.populationLayer : "none",
              year: layerById(s.layers, "statistics").year,
              metricId:
                s.country.code === "ZA" &&
                layerById(s.layers, "statistics").visible
                  ? layerById(s.layers, "statistics").metric
                  : undefined,
            }
          : undefined,
      ),
    [data, title, note, geography, s.populationLayer],
  );
  function download() {
    const url = URL.createObjectURL(
      new Blob([html], { type: "text/html;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "civic-report-" + s.country.code.toLowerCase() + ".html";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="modal report-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Export visual report"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="icon-button modal-close"
          aria-label="Close report"
          onClick={close}
        >
          <X size={18} />
        </button>
        <span className="eyebrow">TAKE THE EVIDENCE WITH YOU</span>
        <h2>Export an exploration report.</h2>
        <div className="report-options">
          <label>
            Report title
            <input
              aria-label="Report title"
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Scope
            <select
              aria-label="Report scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="visible">Current view</option>
              <option value="selection" disabled={!s.selectedEntity}>
                Selected entity and connections
              </option>
              <option value="domain">
                {s.mode === "geographic"
                  ? "Entire country catalogue"
                  : "Entire knowledge domain"}
              </option>
            </select>
          </label>
          <label>
            Investigation notes
            <textarea
              aria-label="Report notes"
              maxLength={12000}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add your question, finding or follow-up"
            />
          </label>
        </div>
        <div className="report-summary">
          <span>{data.entities.length} entities</span>
          <span>{data.relationships.length} relationships</span>
          <span>{data.sources.length} references</span>
        </div>
        <p>
          A self-contained HTML report with diagrams, statistical figures and a
          source register. Open it in a browser and use Print to save a PDF.
        </p>
        {mapStatus && <p role="status">{mapStatus}</p>}
        <button
          className="primary-button"
          onClick={download}
          disabled={mapStatus === "Preparing the map figure…"}
        >
          <Download size={15} /> Download visual report
        </button>
        <details>
          <summary>Preview report</summary>
          <iframe title="Visual report preview" srcDoc={html} sandbox="" />
        </details>
      </section>
    </div>
  );
}
