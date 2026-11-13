"use client";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import {
  entities,
  entityById,
  getSources,
  timelineEvents,
} from "@/lib/knowledge";
import { useExplorer } from "@/lib/store";
export default function TimelineCanvas() {
  const s = useExplorer();
  const all = timelineEvents.filter(
    (event) => event.country === s.country.code,
  );
  const years = [...new Set(all.map((e) => +e.date.slice(0, 4)))].sort(
    (a, b) => b - a,
  );
  const events = all
    .filter(
      (event) =>
        (!s.timelineYear || +event.date.slice(0, 4) <= s.timelineYear) &&
        (!s.timelineEntity || event.entityIds.includes(s.timelineEntity)),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const options = entities.filter(
    (e) =>
      e.country === s.country.code &&
      all.some((event) => event.entityIds.includes(e.id)),
  );
  return (
    <section
      className="analysis-view timeline-view"
      aria-label="Historical timeline"
    >
      <div className="analysis-heading">
        <div>
          <span className="eyebrow">HISTORY & EVIDENCE</span>
          <h2>Follow what changed.</h2>
          <p>
            Dated, source-linked events. This is an event record, not a
            reconstruction of the entire graph at a past date.
          </p>
        </div>
        <CalendarDays size={25} />
      </div>
      <div className="analysis-controls">
        <label>
          Through year
          <select
            aria-label="Timeline through year"
            value={s.timelineYear ?? "all"}
            onChange={(e) =>
              s.navigate({
                timelineYear: e.target.value === "all" ? null : +e.target.value,
              })
            }
          >
            <option value="all">All recorded dates</option>
            {years.map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        </label>
        <label>
          Entity
          <select
            aria-label="Timeline entity"
            value={s.timelineEntity ?? "all"}
            onChange={(e) =>
              s.navigate({
                timelineEntity:
                  e.target.value === "all" ? null : e.target.value,
              })
            }
          >
            <option value="all">All recorded entities</option>
            {options.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
        </label>
        <span className="result-count">{events.length} documented events</span>
      </div>
      <div className="timeline-list">
        {events.map((event) => (
          <article key={event.id} className="timeline-event">
            <time dateTime={event.date}>
              {event.date.length === 4
                ? event.date
                : new Date(event.date + "T12:00:00Z").toLocaleDateString(
                    "en-ZA",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    },
                  )}
            </time>
            <div>
              <h3>{event.title}</h3>
              <p>{event.description}</p>
              <div className="timeline-entities">
                {event.entityIds.map((id) => (
                  <button
                    key={id}
                    onClick={() => {
                      const entity = entityById(id);
                      if (entity) {
                        s.selectDomain(entity.domain);
                        s.openEntity(id);
                      }
                    }}
                  >
                    {entityById(id)?.name}
                    <ArrowUpRight size={12} />
                  </button>
                ))}
              </div>
              <div className="reference-links">
                {getSources(event.sourceIds).map((source) => (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.publisher} · {source.title} ↗
                  </a>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
      {!events.length && (
        <div className="empty-panel">
          <h3>No events in this selection</h3>
          <p>
            Choose a later year or another entity. Historical records have not
            been added for every country.
          </p>
        </div>
      )}
    </section>
  );
}
