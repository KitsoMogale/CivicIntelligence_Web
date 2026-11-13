"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import seed from "@/data/knowledge.json";
import { inspectBundle } from "@/lib/data-quality";
import { Download, ExternalLink, FileCheck2, Upload } from "lucide-react";
type Decision = {
  status: "needs-review" | "verified";
  note: string;
  reviewedAt: string;
};
const current = inspectBundle(seed);
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function DataReview() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [draft, setDraft] = useState<ReturnType<typeof inspectBundle> | null>(
    null,
  );
  const [message, setMessage] = useState("");
  useEffect(() => {
    try {
      const data = JSON.parse(
        localStorage.getItem("civic-source-review") || "{}",
      );
      if (data && typeof data === "object" && !Array.isArray(data))
        setDecisions(data);
    } catch {}
  }, []);
  function update(id: string, status: Decision["status"], note: string) {
    const next = {
      ...decisions,
      [id]: { status, note, reviewedAt: new Date().toISOString() },
    };
    try {
      localStorage.setItem("civic-source-review", JSON.stringify(next));
      setDecisions(next);
      setMessage("Review decision saved on this device");
    } catch {
      setMessage(
        "This browser could not save the review. Export your decisions to keep them.",
      );
    }
  }
  const refs = seed.sources.filter(
    (source) =>
      (source.title + " " + source.publisher)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "unreviewed"
          ? !decisions[source.id]
          : decisions[source.id]?.status === filter)),
  );
  const valid =
    !!draft?.bundle && !draft.issues.some((i) => i.severity === "error");
  return (
    <main className="review-page">
      <header className="review-header">
        <Link href="/">← World explorer</Link>
        <span className="eyebrow">SOURCE REVIEW</span>
        <Link href="/api/health" target="_blank">
          Service health <ExternalLink size={12} />
        </Link>
      </header>
      <div className="review-intro">
        <span className="eyebrow">EVIDENCE BEFORE EXPANSION</span>
        <h1>Keep the knowledge accountable.</h1>
        <p>
          Inspect references, record review notes, and validate proposed data.
          Decisions stay on this device; publishing a change requires the
          repository import and release workflow.
        </p>
      </div>
      <div className="quality-stats">
        {Object.entries(current.counts).map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
        <div>
          <strong>
            {current.issues.filter((i) => i.severity === "error").length}
          </strong>
          <span>validation errors</span>
        </div>
      </div>
      <section className="review-section">
        <h2>
          <FileCheck2 size={19} /> Dataset validation
        </h2>
        {current.issues.length ? (
          <ul className="quality-issues">
            {current.issues.map((issue, i) => (
              <li key={i} data-severity={issue.severity}>
                {issue.record}: {issue.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="success-note">
            All records have valid references, IDs, endpoints and metadata.
          </p>
        )}
        <label className="file-picker">
          <Upload size={15} /> Validate a proposed knowledge bundle
          <input
            type="file"
            accept=".json,application/json"
            aria-label="Validate knowledge bundle"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 8_000_000) {
                setMessage("Choose a JSON bundle smaller than 8 MB");
                return;
              }
              try {
                setDraft(inspectBundle(JSON.parse(await file.text())));
                setMessage("");
              } catch {
                setDraft(null);
                setMessage("This file is not valid JSON");
              }
              event.target.value = "";
            }}
          />
        </label>
        {draft && (
          <div className="draft-review">
            <h3>
              {valid
                ? "Proposal passes structural validation"
                : "Proposal needs corrections"}
            </h3>
            <p>
              Validation checks structure and references. A reviewer still needs
              to verify the factual claims against their sources.
            </p>
            {draft.bundle && (
              <table className="evidence-table">
                <thead>
                  <tr>
                    <th>Records</th>
                    <th>Current</th>
                    <th>Proposed</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(draft.counts).map(([key, value]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{current.counts[key]}</td>
                      <td>{value}</td>
                      <td>{value - current.counts[key]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {draft.issues.map((issue, i) => (
              <p
                key={i}
                className="validation-message"
                data-severity={issue.severity}
              >
                {issue.record}: {issue.message}
              </p>
            ))}
            {valid && (
              <button
                className="outline-button"
                onClick={() =>
                  download("civic-reviewed-proposal.json", draft.bundle)
                }
              >
                <Download size={14} /> Download validated proposal
              </button>
            )}
          </div>
        )}
      </section>
      <section className="review-section">
        <div className="section-heading">
          <h2>Source register</h2>
          <button
            className="outline-button"
            onClick={() =>
              download("civic-review-decisions.json", {
                exportedAt: new Date().toISOString(),
                decisions,
              })
            }
          >
            <Download size={14} /> Export review notes
          </button>
        </div>
        <div className="analysis-controls">
          <label>
            Find a source
            <input
              aria-label="Search source register"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Publisher or title"
            />
          </label>
          <label>
            Status
            <select
              aria-label="Filter source review status"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All sources</option>
              <option value="unreviewed">Not reviewed on this device</option>
              <option value="needs-review">Needs review</option>
              <option value="verified">Reviewed on this device</option>
            </select>
          </label>
          <span className="result-count">{refs.length} references</span>
        </div>
        <div className="source-register">
          {refs.map((source) => {
            const decision = decisions[source.id];
            const uses = [
              ...seed.entities,
              ...seed.relationships,
              ...seed.datasets,
            ].filter((r) => r.sourceIds.includes(source.id)).length;
            return (
              <article key={source.id}>
                <div>
                  <span className="eyebrow">{source.publisher}</span>
                  <h3>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title} <ExternalLink size={13} />
                    </a>
                  </h3>
                  <p>
                    Retrieved {source.retrievedAt} · {uses} cited records
                  </p>
                  {"note" in source && <p>{String(source.note)}</p>}
                  {"license" in source && (
                    <small>{String(source.license)}</small>
                  )}
                </div>
                <label>
                  Review status
                  <select
                    aria-label={"Review status for " + source.id}
                    value={decision?.status ?? "unreviewed"}
                    onChange={(e) => {
                      if (e.target.value !== "unreviewed")
                        update(
                          source.id,
                          e.target.value as Decision["status"],
                          decision?.note ?? "",
                        );
                    }}
                  >
                    <option value="unreviewed">Not reviewed</option>
                    <option value="needs-review">Needs review</option>
                    <option value="verified">Reviewed on this device</option>
                  </select>
                </label>
                <label>
                  Review note
                  <textarea
                    aria-label={"Review note for " + source.id}
                    maxLength={2000}
                    defaultValue={decision?.note ?? ""}
                    key={source.id + !!decision}
                    onBlur={(e) => {
                      if (e.target.value !== (decision?.note ?? ""))
                        update(
                          source.id,
                          decision?.status ?? "needs-review",
                          e.target.value,
                        );
                    }}
                    placeholder="Evidence to check or a correction to investigate"
                  />
                </label>
              </article>
            );
          })}
        </div>
      </section>
      {message && (
        <p className="review-notice" role="status">
          {message}
        </p>
      )}
    </main>
  );
}
