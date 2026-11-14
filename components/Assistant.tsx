"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  CornerDownLeft,
  LoaderCircle,
  Plus,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import {
  domains,
  entityById,
  getSources,
  entityConnections,
  relationships,
} from "@/lib/knowledge";
import { visibleEntityIds } from "@/lib/visibility";
import { useExplorer } from "@/lib/store";
import { municipalById } from "@/lib/geography";
import { referenceArea } from "@/lib/country-profiles";
import { validateActions, type CanvasAction } from "@/lib/actions";
type Message = {
  role: "user" | "assistant";
  content: string;
  sourceIds?: string[];
  actions?: CanvasAction[];
  error?: boolean;
};
export default function Assistant({
  close,
  hidden = false,
}: {
  close: () => void;
  hidden?: boolean;
}) {
  const s = useExplorer(),
    [messages, setMessages] = useState<Message[]>([]),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [engine, setEngine] = useState("Checking connection"),
    [tab, setTab] = useState<"assistant" | "details">("assistant");
  const skipDetailsFor = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null),
    bottom = useRef<HTMLDivElement>(null);
  const selected = entityById(s.selectedEntity ?? "");
  const selectedLink = relationships.find(
    (r) => r.id === s.selectedRelationship,
  );
  const connections = selected ? entityConnections(selected.id) : [];
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((r) =>
        setEngine(r.ai === "configured" ? "AI configured" : "Local guide"),
      )
      .catch(() => setEngine("Connection unavailable"));
    return () => controller.current?.abort();
  }, []);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);
  useEffect(() => {
    if (selected && selected.id !== skipDetailsFor.current) setTab("details");
    skipDetailsFor.current = null;
  }, [selected, selectedLink]);
  async function send(text: string) {
    if (!text.trim() || busy) return;
    setInput("");
    setBusy(true);
    setTab("assistant");
    const past = messages
      .filter((m) => !m.error)
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [
      ...m,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);
    const update = (patch: Partial<Message>) =>
      setMessages((m) =>
        m.map((v, i) => (i === m.length - 1 ? { ...v, ...patch } : v)),
      );
    controller.current = new AbortController();
    let content = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: past,
          context: {
            country: s.country.code,
            countryName: s.country.name,
            domain: s.domain,
            mode: s.mode,
            selectedEntity: s.selectedEntity,
            visibleEntities: visibleEntityIds({
              countryCode: s.country.code,
              domain: s.domain,
              mode: s.mode,
              expanded: s.expanded,
              markerLayer: s.markerLayer,
              provinceLayer: s.provinceLayer,
              canvas: s,
            }),
            region: s.region,
          },
        }),
        signal: controller.current.signal,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "The assistant could not respond.");
      }
      const reader = res.body!.getReader(),
        decoder = new TextDecoder();
      let pending = "";
      while (true) {
        const { value, done } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        const lines = pending.split("\n");
        pending = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);
          if (event.type === "delta") {
            content += event.text;
            update({ content });
          }
          if (event.type === "done") {
            const actions = validateActions(event.actions, s.country.code);
            skipDetailsFor.current =
              actions
                .flatMap((a) =>
                  a.type === "OPEN_ENTITY" || a.type === "FOCUS_REGION"
                    ? [a.payload.entityId]
                    : [],
                )
                .at(-1) ?? null;
            s.applyActions(actions);
            update({ sourceIds: event.sourceIds, actions });
            if (event.engine) setEngine(event.engine);
          }
          if (event.type === "error") throw new Error(event.message);
        }
        if (done) break;
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError")
        update({ content: content || "Response stopped." });
      else
        update({
          content:
            content +
            "\n" +
            (e instanceof Error ? e.message : "Connection failed. Try again."),
          error: true,
        });
    } finally {
      setBusy(false);
      controller.current = null;
    }
  }
  const prompts = [
    "Explain the government structure",
    "Show how electricity reaches homes",
    "Explore Census 2022 population",
  ];
  return (
    <aside
      hidden={hidden}
      className="assistant-panel"
      aria-label="Intelligence assistant"
    >
      <div className="panel-tabs">
        <button
          className={tab === "assistant" ? "active" : ""}
          onClick={() => setTab("assistant")}
        >
          <Sparkles size={14} /> Assistant
        </button>
        <button
          className={tab === "details" ? "active" : ""}
          onClick={() => setTab("details")}
        >
          <BookOpen size={14} /> Details
        </button>
        <button
          className="icon-button panel-close"
          onClick={close}
          aria-label="Close assistant"
        >
          <X size={16} />
        </button>
      </div>
      {tab === "details" ? (
        <div className="entity-details">
          {selected ? (
            <>
              <span className="eyebrow">ENTITY PROFILE</span>
              <div className="entity-symbol">
                <BookOpen size={23} />
              </div>
              <h2>{selected.name}</h2>
              <span className="entity-type">{selected.type}</span>
              <p>{selected.description}</p>
              {selected.asOf && (
                <p className="evidence-date">
                  Record snapshot: {selected.asOf}
                </p>
              )}
              {selected.attributes &&
                Object.keys(selected.attributes).length > 0 && (
                  <dl className="entity-attributes">
                    {Object.entries(selected.attributes).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              {selectedLink && (
                <section
                  className="relationship-evidence"
                  aria-label="Relationship evidence"
                >
                  <span className="eyebrow">RELATIONSHIP EVIDENCE</span>
                  <h3>
                    {entityById(selectedLink.source)?.name} →{" "}
                    {entityById(selectedLink.target)?.name}
                  </h3>
                  <strong>
                    {selectedLink.type.toLowerCase().replaceAll("_", " ")}
                  </strong>
                  <p>{selectedLink.description}</p>
                  <p className="evidence-date">
                    {selectedLink.asOf
                      ? "Reported as of " + selectedLink.asOf
                      : "No dated ownership claim"}
                    {selectedLink.validFrom
                      ? " · Effective " + selectedLink.validFrom
                      : ""}
                    {selectedLink.validTo ? " to " + selectedLink.validTo : ""}
                  </p>
                  {getSources(selectedLink.sourceIds).map((source) => (
                    <a
                      key={source.id}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.publisher} · {source.title} ↗
                    </a>
                  ))}
                </section>
              )}
              <div className="detail-rule" />
              <h4>Explore further</h4>
              <button
                className="detail-link"
                onClick={() => {
                  s.selectDomain(selected.domain);
                  s.openEntity(selected.id);
                }}
              >
                Open in knowledge canvas <ArrowUpRight size={14} />
              </button>
              {(selected.coordinates || selected.region) && (
                <button
                  className="detail-link"
                  onClick={() =>
                    s.applyActions([
                      {
                        type: "FOCUS_REGION",
                        payload: { entityId: selected.id },
                      },
                    ])
                  }
                >
                  {referenceArea(selected.id)
                    ? "View administrative area"
                    : municipalById(selected.id)
                      ? "View historical municipality boundary"
                      : selected.coordinates
                        ? "Locate on map"
                        : "View province · site coordinates unavailable"}{" "}
                  <ArrowUpRight size={14} />
                </button>
              )}
              {selected.coordinateNote && (
                <p className="data-note">{selected.coordinateNote}</p>
              )}
              {connections.length > 0 && (
                <>
                  <h4>Connected records ({connections.length})</h4>
                  <div className="evidence-connections">
                    {connections.map((link) => (
                      <button
                        key={link.id}
                        className={
                          s.selectedRelationship === link.id ? "active" : ""
                        }
                        onClick={() => s.openRelationship(link.id)}
                      >
                        <span>
                          {
                            entityById(
                              link.source === selected.id
                                ? link.target
                                : link.source,
                            )?.name
                          }
                        </span>
                        <small>
                          {link.type.toLowerCase().replaceAll("_", " ")}
                          {link.asOf ? " · " + link.asOf : ""}
                        </small>
                      </button>
                    ))}
                  </div>
                  <button
                    className="detail-link"
                    onClick={() => {
                      s.toggleNode(selected.id);
                      s.setMode("relationships");
                    }}
                  >
                    Show or hide outgoing connections <ArrowUpRight size={14} />
                  </button>
                </>
              )}
              <h4>Source references</h4>
              {getSources(selected.sourceIds).map((source) => (
                <a
                  className="source-card"
                  href={source.url}
                  key={source.id}
                  target="_blank"
                  rel="noreferrer"
                >
                  <BookOpen size={14} />
                  <span>
                    <strong>{source.title}</strong>
                    <small>{source.publisher}</small>
                  </span>
                  <ArrowUpRight size={13} />
                </a>
              ))}
              <p className="data-note">
                Record reviewed {selected.updatedAt}. Curated evidence; not a
                live feed.
              </p>
              <button
                className="primary-button"
                onClick={() => send("Explain " + selected.name)}
              >
                Ask about this entity <Sparkles size={14} />
              </button>
            </>
          ) : (
            <div className="details-empty">
              <BookOpen size={30} />
              <h3>Follow your curiosity.</h3>
              <p>
                Select a marker, entity or connection to see its details and
                sources here.
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="assistant-status">
            <span className="live-dot" />
            {engine}
            <span className="context-tag">{s.country.code}</span>
          </div>
          <div className="conversation" aria-live="polite" aria-busy={busy}>
            {messages.length === 0 ? (
              <div className="assistant-welcome">
                <div className="sparkle-emblem">
                  <Sparkles size={25} strokeWidth={1.2} />
                </div>
                <span className="eyebrow">YOUR EXPLORATION PARTNER</span>
                <h2>Connect the dots.</h2>
                <p>
                  Ask a question. Unpack a system.
                  <br />
                  See the bigger picture.
                </p>
                <div className="context-box">
                  <span className="tiny-label">CURRENT CONTEXT</span>
                  <strong>{s.country.name}</strong>
                  <span>
                    {domains.find((d) => d.id === s.domain)?.short}{" "}
                    <span>·</span> {s.mode === "geographic" ? "Map" : s.mode}
                  </span>
                </div>
                <span className="tiny-label try-label">A PLACE TO START</span>
                {prompts.map((p, i) => (
                  <button className="prompt" onClick={() => send(p)} key={p}>
                    <span>
                      {i === 0
                        ? "How is power organized?"
                        : i === 1
                          ? "From power station to home"
                          : "The people behind the numbers"}
                    </span>
                    <ArrowUpRight size={14} />
                  </button>
                ))}
                <p className="guide-note">
                  Your guide explores curated records. Detailed knowledge
                  coverage starts with South Africa.
                </p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  className={
                    "message " + m.role + (m.error ? " message-error" : "")
                  }
                  key={i}
                >
                  {m.role === "assistant" && (
                    <span className="message-author">
                      <Sparkles size={13} /> Civic Intelligence
                    </span>
                  )}
                  <div className="message-text">
                    {m.content || (
                      <span className="thinking">
                        <LoaderCircle size={14} /> Exploring the knowledge base…
                      </span>
                    )}
                  </div>
                  {!!m.actions?.length && (
                    <span className="action-receipt">
                      <Check size={12} /> Canvas updated · {m.actions.length}{" "}
                      actions
                    </span>
                  )}
                  {!!m.sourceIds?.length && (
                    <details className="message-sources">
                      <summary>
                        <BookOpen size={12} /> Retrieved sources (
                        {m.sourceIds.length}) <ChevronDown size={12} />
                      </summary>
                      {getSources(m.sourceIds).map((source) => (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          key={source.id}
                        >
                          {source.publisher} <ArrowUpRight size={11} />
                        </a>
                      ))}
                    </details>
                  )}
                </div>
              ))
            )}
            <div ref={bottom} />
          </div>
          <div className="composer-area">
            {messages.length > 0 && (
              <button
                className="new-chat"
                disabled={busy}
                onClick={() => setMessages([])}
              >
                <Plus size={12} /> New conversation
              </button>
            )}
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <textarea
                aria-label="Ask Civic Intelligence"
                placeholder={"Ask about " + s.country.name + "…"}
                rows={2}
                maxLength={2000}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
              />
              <div>
                <span>
                  <CornerDownLeft size={11} /> to send
                </span>
                {busy ? (
                  <button
                    type="button"
                    className="send-button"
                    onClick={() => controller.current?.abort()}
                    aria-label="Stop response"
                  >
                    <Square size={13} />
                  </button>
                ) : (
                  <button
                    className="send-button"
                    disabled={!input.trim()}
                    aria-label="Send message"
                  >
                    <ArrowUp size={16} />
                  </button>
                )}
              </div>
            </form>
            <p>AI can make mistakes. Follow the sources.</p>
          </div>
        </>
      )}
    </aside>
  );
}
