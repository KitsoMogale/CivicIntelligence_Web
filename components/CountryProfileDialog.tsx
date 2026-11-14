"use client";
import { X } from "lucide-react";
import { countryProfile, countryCoverage } from "@/lib/country-profiles";
import { getSources } from "@/lib/knowledge";
import { useExplorer } from "@/lib/store";
export default function CountryProfileDialog({ close }: { close: () => void }) {
  const s = useExplorer(),
    p = countryProfile(s.country.code);
  const sources = getSources([...p.sourceIds, p.boundary.sourceId]);
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="modal country-profile-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Country structure and coverage"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="icon-button modal-close"
          aria-label="Close country profile"
          onClick={close}
        >
          <X size={18} />
        </button>
        <span className="eyebrow">{s.country.code} · STRUCTURE & COVERAGE</span>
        <h2>{s.country.name}</h2>
        <p>{countryCoverage(s.country.code)}</p>
        {s.country.status && (
          <p className="data-note">
            Publisher classification: {s.country.status}. Map naming and
            territorial presentation follow the cited reference publisher; they
            are not a legal determination.
          </p>
        )}
        <p>{p.summary}</p>
        {p.schemes.length ? (
          p.schemes.map((scheme) => (
            <section key={scheme.name}>
              <h3>{scheme.name}</h3>
              <ul>
                {scheme.levels.map((level) => (
                  <li key={level}>{level}</li>
                ))}
              </ul>
              <p>{scheme.note}</p>
            </section>
          ))
        ) : (
          <p>
            Current government structures have not yet been independently
            reviewed for this country or area. The reference-area directory does
            not express government authority.
          </p>
        )}
        <h3>Map coverage</h3>
        <p>
          {p.boundary.count
            ? `${p.boundary.count} ${p.boundary.divisionLabel.toLowerCase()} · ${p.boundary.year} source edition.`
            : "Country-level reference geography. Subdivision geometry is not available in this batch."}
        </p>
        <p>
          Detailed local and electoral boundaries are available only where
          separately verified. Administrative polygons do not imply population
          values, service coverage or institutional powers.
        </p>
        {p.boundary.note && <p className="data-note">{p.boundary.note}</p>}
        <p>
          {p.comparisonIndicators.length
            ? "Historical World Bank comparison observations are available for 2014–2024. Missing observations remain unavailable."
            : "Historical comparison observations are unavailable for this country or area."}
        </p>
        <h3>Sources, dates & licences</h3>
        {sources.map((source) => (
          <article key={source.id}>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.title} ↗
            </a>
            <p>
              {source.publisher} · retrieved {source.retrievedAt}
              {source.publishedAt ? ` · published ${source.publishedAt}` : ""}
            </p>
            {source.license && <p>{source.license}</p>}
            {source.note && <p className="data-note">{source.note}</p>}
          </article>
        ))}
      </section>
    </div>
  );
}
