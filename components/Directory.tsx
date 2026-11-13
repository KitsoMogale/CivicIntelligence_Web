"use client";
import { useState } from "react";
import Link from "next/link";
import { entities, regions } from "@/lib/knowledge";
import municipal from "@/data/provenance/municipalities.json";
export default function Directory() {
  const [query, setQuery] = useState(""),
    [region, setRegion] = useState("all"),
    [type, setType] = useState("municipal"),
    [page, setPage] = useState(0),
    [history, setHistory] = useState(false);
  const records = history
    ? municipal.municipalities
        .filter((m) => m.historical)
        .map((m) => ({
          id: m.code,
          name: m.name,
          type: "Former municipality",
          region: m.province,
          code: m.code,
          historical: true,
        }))
    : entities
        .filter((e) =>
          type === "municipal"
            ? e.type.includes("municipality")
            : e.type === "National department" ||
              e.type === "National public body",
        )
        .map((e) => ({
          id: e.id,
          name: e.name,
          type: e.type,
          region: regions.find((r) => r.id === e.region)?.name ?? "National",
          code: String(e.attributes?.["Municipality code"] ?? ""),
          historical: false,
        }));
  const filtered = records.filter(
    (e) =>
      (region === "all" || e.region === region) &&
      (e.name + " " + e.code).toLowerCase().includes(query.toLowerCase()),
  );
  const shown = filtered.slice(page * 25, (page + 1) * 25);
  return (
    <main className="review-page directory-page">
      <header className="review-header">
        <Link href="/">← World explorer</Link>
        <span className="eyebrow">SOUTH AFRICAN DIRECTORY</span>
        <Link href="/review">Source review ↗</Link>
      </header>
      <div className="review-intro">
        <span className="eyebrow">INSTITUTIONS & LOCAL GOVERNMENT</span>
        <h1>Find the public institution.</h1>
        <p>
          257 municipalities and 43 entries from the national departments
          directory. Municipality records follow the Treasury snapshot updated
          22 October 2026; historical codes are listed separately.
        </p>
      </div>
      <div className="analysis-controls">
        <label>
          Directory
          <select
            aria-label="Directory type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(0);
              setHistory(false);
            }}
          >
            <option value="municipal">Municipalities</option>
            <option value="national">Departments & national bodies</option>
          </select>
        </label>
        <label>
          Province
          <select
            aria-label="Directory province"
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">All provinces / national</option>
            {regions.map((r) => (
              <option key={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
        <label>
          Find by name or code
          <input
            aria-label="Search directory"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="e.g. eThekwini or Health"
          />
        </label>
        {type === "municipal" && (
          <label className="inline-check">
            <input
              type="checkbox"
              checked={history}
              onChange={(e) => {
                setHistory(e.target.checked);
                setPage(0);
              }}
            />
            Show former municipality codes
          </label>
        )}
      </div>
      <p role="status">
        {filtered.length} matching records
        {history ? " · historical codes, excluded from the active graph" : ""}
      </p>
      <div className="table-scroll">
        <table className="evidence-table">
          <thead>
            <tr>
              <th>Institution</th>
              <th>Type</th>
              <th>Province / sphere</th>
              <th>Code</th>
              <th>Explore</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e) => (
              <tr key={e.id}>
                <td>{e.name}</td>
                <td>{e.type}</td>
                <td>{e.region}</td>
                <td>{e.code || "—"}</td>
                <td>
                  {!e.historical ? (
                    <Link href={"/?entity=" + encodeURIComponent(e.id)}>
                      Open on canvas ↗
                    </Link>
                  ) : (
                    "Historical reference"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="directory-pagination">
        <button
          className="outline-button"
          disabled={!page}
          onClick={() => setPage(page - 1)}
        >
          ← Previous
        </button>
        <span>
          Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / 25))}
        </span>
        <button
          className="outline-button"
          disabled={(page + 1) * 25 >= filtered.length}
          onClick={() => setPage(page + 1)}
        >
          Next →
        </button>
      </div>
      <p className="data-method">
        Sources:{" "}
        <a
          href="https://municipaldata.treasury.gov.za/api/cubes/municipalities/facts"
          target="_blank"
          rel="noreferrer"
        >
          National Treasury Municipal Money
        </a>{" "}
        (metadata updated 22 October 2026), its{" "}
        <a
          href="https://municipaldata.treasury.gov.za/api/cubes/demarcation_changes/facts"
          target="_blank"
          rel="noreferrer"
        >
          demarcation change history
        </a>
        , and the{" "}
        <a
          href="https://www.gov.za/about-government/contact-directory/national-government"
          target="_blank"
          rel="noreferrer"
        >
          government national directory
        </a>
        . No official endorsement is implied.
      </p>
    </main>
  );
}
