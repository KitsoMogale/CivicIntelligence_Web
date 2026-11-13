"use client";
import { knowledgeSnapshot } from "@/lib/snapshot";
import {
  newInvestigation,
  readInvestigations,
  writeInvestigations,
  type Investigation,
} from "@/lib/investigations";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Compass,
  Expand,
  Globe2,
  Landmark,
  Layers3,
  Menu,
  Network,
  PanelLeftClose,
  PanelRightClose,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
  Scale,
  Factory,
  GitBranch,
  ChartNoAxesCombined,
  MapPin,
  RotateCcw,
  CalendarDays,
  FileText,
  ArrowLeftRight,
} from "lucide-react";
import {
  countries,
  domains,
  entities,
  entityById,
  relationships,
  searchKnowledge,
  sources,
} from "@/lib/knowledge";
import { useExplorer } from "@/lib/store";
import type { Domain, Mode } from "@/lib/types";
import Assistant from "./Assistant";
import KnowledgeTree from "./KnowledgeTree";
import CanvasTools from "./CanvasTools";
import SplitDivider from "./SplitDivider";
const Loading = () => (
  <div className="canvas-loading">
    <span className="loading-ring" />
    Preparing your workspace…
  </div>
);
const WorldMap = dynamic(() => import("./WorldMap"), {
  ssr: false,
  loading: Loading,
});
const GraphCanvas = dynamic(() => import("./GraphCanvas"), {
  ssr: false,
  loading: Loading,
});
const RelationshipCanvas = dynamic(() => import("./RelationshipCanvas"), {
  ssr: false,
  loading: Loading,
});
const DataCanvas = dynamic(() => import("./DataCanvas"), {
  ssr: false,
  loading: Loading,
});
const ComparisonCanvas = dynamic(() => import("./ComparisonCanvas"), {
  ssr: false,
  loading: Loading,
});
const TimelineCanvas = dynamic(() => import("./TimelineCanvas"), {
  ssr: false,
  loading: Loading,
});
const InvestigationsDialog = dynamic(() => import("./InvestigationsDialog"), {
  ssr: false,
});
const ReportDialog = dynamic(() => import("./ReportDialog"), { ssr: false });
const domainIcons = {
  government: Landmark,
  economy: TrendingUp,
  industry: Factory,
  infrastructure: Zap,
  law: Scale,
  society: Users,
};
const modes: { id: Mode; label: string; icon: typeof Globe2 }[] = [
  { id: "geographic", label: "Map", icon: Globe2 },
  { id: "hierarchy", label: "Hierarchy", icon: GitBranch },
  { id: "relationships", label: "Relationships", icon: Network },
  { id: "flow", label: "System flow", icon: Zap },
  { id: "data", label: "Data", icon: ChartNoAxesCombined },
  { id: "compare", label: "Compare", icon: ArrowLeftRight },
  { id: "timeline", label: "History", icon: CalendarDays },
];
type Saved = {
  name: string;
  country: (typeof countries)[number];
  domain: Domain;
  mode: Mode;
};
export default function Workspace() {
  const s = useExplorer(),
    [navOpen, setNavOpen] = useState(false),
    [aiOpen, setAiOpen] = useState(false),
    [query, setQuery] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [help, setHelp] = useState(false),
    [savedOpen, setSavedOpen] = useState(false),
    [saved, setSaved] = useState<Investigation[]>([]),
    [reportOpen, setReportOpen] = useState(false),
    [notice, setNotice] = useState(""),
    [countryList, setCountryList] = useState(countries),
    [expandedDomain, setExpandedDomain] = useState<Domain | null>(null),
    [mounted, setMounted] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const geographicSelection =
      s.selectedWardId ||
      s.selectedEntity?.startsWith("za-municipality-") ||
      entityById(s.selectedEntity ?? "")?.type === "Province";
    const choosingWards =
      s.layers.some((l) => l.id === "wards" && l.visible) &&
      (s.mode === "geographic" || s.layout !== "single");
    if (
      s.selectedEntity &&
      !(window.innerWidth <= 760 && geographicSelection && choosingWards)
    )
      setAiOpen(true);
  }, [s.selectedEntity]);
  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);
  useEffect(() => {
    setMounted(true);
    setAiOpen(window.innerWidth > 760);
    try {
      setSaved(readInvestigations());
    } catch {}
    setCountryList([...countries].sort((a, b) => a.name.localeCompare(b.name)));
    const entity = entityById(
      new URLSearchParams(window.location.search).get("entity") ?? "",
    );
    if (entity) {
      s.selectCountry(countries.find((c) => c.code === entity.country)!);
      s.selectDomain(entity.domain);
      s.openEntity(entity.id);
      window.history.replaceState(null, "", "/");
    }
  }, []);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const editing =
        e.target instanceof HTMLElement &&
        !!e.target.closest("input,textarea,select,[contenteditable=true]");
      if (!editing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) s.forward();
        else s.back();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInput.current?.focus();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setHelp(false);
        setSavedOpen(false);
        setNavOpen(false);
        setReportOpen(false);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(t);
  }, [notice]);
  const results = query.trim()
    ? searchKnowledge(query, s.country.code)
    : entities.filter((e) => e.country === s.country.code).slice(0, 5);
  const currentDomain = domains.find((d) => d.id === s.domain)!;
  const viewName =
    s.mode === "compare"
      ? "Country comparison"
      : s.mode === "timeline"
        ? "Historical timeline"
        : s.mode === "geographic"
          ? "Map exploration"
          : currentDomain.short;
  function save() {
    try {
      const item = newInvestigation(s);
      item.title = s.country.name + " · " + viewName;
      const next = [item, ...saved];
      writeInvestigations(next);
      setSaved(next);
      setNotice("Exploration saved on this device");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "This browser could not save the exploration",
      );
    }
  }
  function exportView() {
    const payload = knowledgeSnapshot(s);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download =
      "civic-" + s.country.code.toLowerCase() + "-" + s.domain + ".json";
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Knowledge snapshot exported");
  }
  function domainSelect(id: Domain) {
    s.selectDomain(id);
    setExpandedDomain(expandedDomain === id ? null : id);
    setNavOpen(false);
  }
  if (!mounted)
    return (
      <div className="boot-screen">
        <Globe2 size={30} />
        <span>Civic Intelligence</span>
        <small>Opening your world…</small>
      </div>
    );
  return (
    <div className={"app-shell " + (!aiOpen ? "assistant-hidden" : "")}>
      <header className="app-header">
        <Link href="/" className="brand" aria-label="Civic Intelligence home">
          <span className="brand-mark">
            <Globe2 size={24} strokeWidth={1.3} />
          </span>
          <span>
            CIVIC<span className="brand-light"> INTELLIGENCE</span>
            <small>THE WORLD, CONNECTED.</small>
          </span>
        </Link>
        <div className="header-trail">
          <span>Workspace</span>
          <ChevronRight size={12} />
          <strong>World explorer</strong>
        </div>
        <div className="global-search">
          <Search
            size={15}
            onClick={() => {
              setSearchOpen(true);
              searchInput.current?.focus();
            }}
          />
          <input
            ref={searchInput}
            placeholder="Search the knowledge base…"
            aria-label="Search knowledge"
            value={query}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
          />
          <kbd>Ctrl K</kbd>
          {searchOpen && (
            <>
              <button
                className="search-dismiss"
                aria-label="Dismiss search"
                onClick={() => setSearchOpen(false)}
              />
              <div className="search-results">
                <span className="tiny-label">
                  {query ? "SEARCH RESULTS" : "EXPLORE SOUTH AFRICA"}
                </span>
                {results.length ? (
                  results.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        s.selectDomain(e.domain);
                        s.openEntity(e.id);
                        setSearchOpen(false);
                        setAiOpen(true);
                        setQuery("");
                      }}
                    >
                      <BookOpen size={15} />
                      <span>
                        <strong>{e.name}</strong>
                        <small>{e.type}</small>
                      </span>
                      <ArrowUpRight size={13} />
                    </button>
                  ))
                ) : (
                  <p>No matching records in this country’s seed.</p>
                )}
              </div>
            </>
          )}
        </div>
        <div className="header-actions">
          <span className="build-badge">
            <span className="live-dot" /> EXPLORATION WORKSPACE
          </span>
          <button
            className="icon-button"
            aria-label="How to explore"
            onClick={() => setHelp(true)}
          >
            <CircleHelp size={18} />
          </button>
          <span className="avatar">CI</span>
        </div>
      </header>
      <div className="workspace-body">
        <nav className="icon-rail" aria-label="Workspace tools">
          <button
            className="rail-active"
            aria-label="World explorer"
            onClick={() => s.setMode("geographic")}
          >
            <Compass size={20} />
          </button>
          <button
            aria-label="Saved explorations"
            onClick={() => setSavedOpen(true)}
          >
            <Bookmark size={19} />
          </button>
          <button
            disabled={s.country.code !== "ZA"}
            aria-label="View population data"
            onClick={() => {
              s.selectDomain("society");
            }}
          >
            <ChartNoAxesCombined size={19} />
          </button>
          <div className="rail-spacer" />
          <Link
            href="/directory"
            className="rail-link"
            aria-label="South African directory"
            title="South African directory"
          >
            <BookOpen size={18} />
          </Link>
          <Link
            href="/review"
            className="rail-link"
            aria-label="Source review"
            title="Source review"
          >
            <ShieldCheck size={18} />
          </Link>
          <button aria-label="Workspace help" onClick={() => setHelp(true)}>
            <CircleHelp size={19} />
          </button>
          <button
            aria-label="Reset workspace"
            onClick={() => {
              s.reset();
              setNotice("Workspace reset to South Africa");
            }}
          >
            <RotateCcw size={17} />
          </button>
        </nav>
        {navOpen && (
          <button
            className="mobile-scrim"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          />
        )}
        <aside
          className={"knowledge-sidebar " + (navOpen ? "is-open" : "")}
          aria-label="Knowledge explorer"
        >
          <div className="sidebar-title">
            <span>EXPLORER</span>
            <button
              className="icon-button"
              onClick={() => setNavOpen(false)}
              aria-label="Close navigation"
            >
              <PanelLeftClose size={15} />
            </button>
          </div>
          <div className="country-select">
            <Globe2 size={17} />
            <select
              aria-label="Select country"
              value={s.country.code}
              onChange={(e) => {
                s.selectCountry(
                  countryList.find((c) => c.code === e.target.value)!,
                );
                setExpandedDomain(null);
              }}
            >
              {countryList.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} />
          </div>
          <div className="country-coverage">
            <span className="coverage-dot" />
            {s.country.code === "ZA"
              ? "Curated knowledge coverage"
              : "Map coverage · knowledge coming"}
          </div>
          <button
            className={
              "world-overview " + (s.mode === "geographic" ? "selected" : "")
            }
            onClick={() => {
              s.setMode("geographic");
              setNavOpen(false);
            }}
          >
            <Globe2 size={16} />
            <span>Country overview</span>
            <ArrowUpRight size={13} />
          </button>
          <div className="sidebar-divider" />
          <div className="sidebar-section-label">
            KNOWLEDGE DOMAINS{" "}
            <span>{s.country.code === "ZA" ? "06" : "00"}</span>
          </div>
          <div className="domain-list">
            {domains.map((d) => {
              const Icon = domainIcons[d.id];
              const active =
                s.domain === d.id &&
                !["geographic", "compare", "timeline"].includes(s.mode);
              return (
                <div key={d.id}>
                  <button
                    disabled={s.country.code !== "ZA"}
                    className={"domain-button " + (active ? "active" : "")}
                    onClick={() => domainSelect(d.id)}
                  >
                    <Icon size={16} />
                    <span>{d.name}</span>
                    {expandedDomain === d.id ? (
                      <ChevronDown size={13} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                  </button>
                  {expandedDomain === d.id && s.country.code === "ZA" && (
                    <KnowledgeTree
                      domain={d.id}
                      root={d.root}
                      onSelect={() => setAiOpen(true)}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="sidebar-bottom">
            <div className="seed-card">
              <span className="seed-card-icon">
                <Layers3 size={18} />
              </span>
              <strong>A starting point for discovery.</strong>
              <p>
                Follow a company to its operations, compare countries, or
                explore the provincial map.
              </p>
              <button onClick={() => setHelp(true)}>
                About this workspace <ArrowUpRight size={12} />
              </button>
            </div>
            <div className="sidebar-footer">
              <span className="live-dot" /> CURATED KNOWLEDGE <span>v0.2</span>
            </div>
          </div>
        </aside>
        <main className="main-workspace">
          <div className="workspace-toolbar">
            <div className="breadcrumb">
              <button
                className="icon-button mobile-nav-toggle"
                onClick={() => setNavOpen(true)}
                aria-label="Open knowledge explorer"
              >
                <Menu size={17} />
              </button>
              <button
                className="icon-button"
                disabled={!s.past.length}
                onClick={s.back}
                aria-label="Back"
              >
                <ArrowLeft size={15} />
              </button>
              <button
                className="icon-button"
                disabled={!s.future.length}
                onClick={s.forward}
                aria-label="Forward"
              >
                <ArrowRight size={15} />
              </button>
              <span className="toolbar-divider" />
              <button
                onClick={() =>
                  s.applyActions([
                    {
                      type: "SET_VISUALIZATION_MODE",
                      payload: { mode: "geographic" },
                    },
                    {
                      type: "FLY_TO",
                      payload: {
                        center: [15, 5],
                        zoom: 1.5,
                        bearing: 0,
                        pitch: 0,
                      },
                    },
                  ])
                }
              >
                World
              </button>
              <ChevronRight size={11} />
              <span>{s.country.continent}</span>
              <ChevronRight size={11} />
              <button
                onClick={() =>
                  s.navigate(
                    {
                      region: null,
                      mode: "geographic",
                      camera: {
                        center: s.country.center,
                        zoom: s.country.zoom,
                        bearing: 0,
                        pitch: 0,
                      },
                    },
                    "Country breadcrumb",
                  )
                }
              >
                {s.country.name}
              </button>
              {s.region && (
                <>
                  <ChevronRight size={11} />
                  <strong>{entityById(s.region)?.name}</strong>
                </>
              )}
            </div>
            <div className="workspace-actions">
              <button
                className="icon-button"
                aria-label="Export visual report"
                title="Export visual report"
                onClick={() => setReportOpen(true)}
              >
                <FileText size={15} />
              </button>
              <button
                className="icon-button"
                aria-label="Save exploration"
                title="Save exploration"
                onClick={save}
              >
                <Bookmark size={15} />
              </button>
              <button
                className="icon-button"
                aria-label="Export knowledge snapshot"
                title="Export JSON snapshot"
                onClick={exportView}
              >
                <ArrowDownToLine size={15} />
              </button>
              <button
                className={"icon-button " + (aiOpen ? "mint" : "")}
                aria-label={aiOpen ? "Hide assistant" : "Open assistant"}
                onClick={() => setAiOpen(!aiOpen)}
              >
                <PanelRightClose size={16} />
              </button>
            </div>
          </div>
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">WORLD KNOWLEDGE CANVAS</span>
              <h1>
                {s.country.name}
                <span className="country-code">{s.country.code}</span>
              </h1>
              <p>
                {s.mode === "geographic"
                  ? "Every place has a story. Explore how it connects."
                  : s.mode === "compare"
                    ? "Compare countries using shared indicators and years."
                    : s.mode === "timeline"
                      ? "Follow source-linked events through time."
                      : currentDomain.caption}
              </p>
            </div>
            <button className="outline-button" onClick={() => setAiOpen(true)}>
              <Sparkles size={14} />
              <span>Explore with AI</span>
            </button>
          </div>
          <div className="view-bar">
            <div
              className="view-tabs"
              role="tablist"
              aria-label="Visualization mode"
            >
              {modes.map((m) => (
                <button
                  role="tab"
                  aria-selected={s.mode === m.id}
                  disabled={
                    s.country.code !== "ZA" &&
                    !["geographic", "compare", "timeline"].includes(m.id)
                  }
                  key={m.id}
                  onClick={() => s.setMode(m.id)}
                  className={s.mode === m.id ? "active" : ""}
                >
                  <m.icon size={14} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
            <button className="fit-button" onClick={s.fit}>
              <Expand size={14} />
              <span>Fit view</span>
            </button>
          </div>
          <CanvasTools />
          <div
            style={
              {
                "--split-ratio": s.splitRatio + "%",
              } as import("react").CSSProperties
            }
            className={
              "canvas-container " +
              (s.layout === "split"
                ? "has-canvas-split"
                : s.layout === "overlay" && s.mode !== "geographic"
                  ? "has-canvas-overlay"
                  : "")
            }
          >
            <div
              className="persistent-map"
              hidden={s.mode !== "geographic" && s.layout === "single"}
            >
              <WorldMap />
            </div>
            {s.layout === "split" && <SplitDivider />}
            <div
              className={
                s.layout === "split"
                  ? "canvas-split-view"
                  : s.mode !== "geographic" && s.layout === "overlay"
                    ? "canvas-floating-view"
                    : "canvas-main-view"
              }
            >
              {s.mode === "geographic" ? (
                <>
                  {!s.region &&
                    !s.selectedEntity &&
                    s.populationLayer === "none" && (
                      <div className="country-overview-card">
                        <span className="eyebrow">
                          <span className="live-dot" />{" "}
                          {s.country.code === "ZA"
                            ? "YOUR EXPLORATION STARTS HERE"
                            : "A WORLD STILL TO EXPLORE"}
                        </span>
                        <h2>{s.country.name}</h2>
                        <p>
                          {s.country.code === "ZA"
                            ? "Explore the institutions, people and systems that shape a country. Follow a connection to see what lies beneath."
                            : "Country boundaries are available. Detailed institutional coverage has not yet been added. Historical comparison indicators are available for Botswana and Namibia in Compare."}
                        </p>
                        {s.country.code === "ZA" ? (
                          <>
                            <div className="overview-stats">
                              <div>
                                <strong>6</strong>
                                <span>Knowledge domains</span>
                              </div>
                              <div>
                                <strong>{entities.length}</strong>
                                <span>Curated entities</span>
                              </div>
                              <div>
                                <strong>{sources.length}</strong>
                                <span>References</span>
                              </div>
                            </div>
                            <button
                              onClick={() => s.selectDomain("government")}
                            >
                              Explore the government <ArrowRight size={14} />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => s.selectCountry(countries[0])}>
                            Explore South Africa <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    )}
                </>
              ) : s.mode === "compare" ? (
                <ComparisonCanvas />
              ) : s.mode === "timeline" ? (
                <TimelineCanvas />
              ) : s.mode === "data" ? (
                <DataCanvas />
              ) : s.mode === "relationships" ? (
                <RelationshipCanvas />
              ) : (
                <GraphCanvas />
              )}
            </div>
            {!["geographic", "data", "compare", "timeline"].includes(
              s.mode,
            ) && (
              <div className="canvas-caption">
                <span className="live-dot" />
                {currentDomain.short} <span>·</span>{" "}
                {s.mode === "flow"
                  ? "Simplified functional flow"
                  : s.mode === "relationships"
                    ? "Sourced connections"
                    : "Exploratory structure"}
                <span className="caption-hint">
                  Click an entity to investigate
                </span>
              </div>
            )}
          </div>
          <footer className="canvas-footer">
            <span>
              <ShieldCheck size={12} /> Independent exploration · source
              references included
            </span>
            <span>
              {s.country.code === "ZA"
                ? "SOUTH AFRICA SEED"
                : "LIMITED COVERAGE"}{" "}
              <span className="footer-dot" /> {s.mode.toUpperCase()}
            </span>
          </footer>
        </main>
        <Assistant hidden={!aiOpen} close={() => setAiOpen(false)} />
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={15} />
          {notice}
        </div>
      )}
      {savedOpen && (
        <InvestigationsDialog
          values={saved}
          onChange={setSaved}
          close={() => setSavedOpen(false)}
        />
      )}
      {reportOpen && <ReportDialog close={() => setReportOpen(false)} />}
      {help && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setHelp(false);
            setSavedOpen(false);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={help ? "About this workspace" : "Saved explorations"}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button modal-close"
              aria-label="Close dialog"
              onClick={() => {
                setHelp(false);
                setSavedOpen(false);
              }}
            >
              <X size={18} />
            </button>
            {help && (
              <>
                <span className="eyebrow">CIVIC INTELLIGENCE · MVP</span>
                <h2>Understand the connections.</h2>
                <p>
                  Select a country, choose a knowledge domain, then expand an
                  entity or ask the assistant to guide your exploration.
                </p>
                <ul>
                  <li>
                    <strong>Map:</strong> select countries, pan, zoom and locate
                    seeded entities.
                  </li>
                  <li>
                    <strong>Canvas:</strong> explore hierarchies, relationships
                    and system flows.
                  </li>
                  <li>
                    <strong>Evidence:</strong> inspect source references in the
                    Details panel.
                  </li>
                  <li>
                    <strong>Assistant:</strong> local guide without a key;
                    server-side AI when configured.
                  </li>
                </ul>
                <p>
                  Detailed institutional coverage starts with South Africa.
                  Compare historical World Bank population and GDP growth for
                  South Africa, Botswana and Namibia. Source dates and coverage
                  limits are shown throughout.
                </p>
                <div className="modal-links">
                  <Link href="/privacy">Privacy</Link>
                  <Link href="/terms">Terms</Link>
                  <Link href="/support">Support</Link>
                  <Link href="/directory">National & municipal directory</Link>
                  <Link href="/review">Source review</Link>
                  <Link href="/delete-account">Legacy account deletion</Link>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
