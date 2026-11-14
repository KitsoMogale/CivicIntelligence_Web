# Civic Intelligence — Canvas & Map Interaction Architecture

## 1. Product principle

Civic Intelligence is an **AI-directed, interactive knowledge canvas** for understanding countries. The map is the geographical foundation, not the entire interface. The product combines:

- **Knowledge structure:** country → regions → domains → entities → relationships → evidence.
- **Five visualization modes:** geographical map, hierarchy, relationship graph, system flow, and data/timeline charts.
- **AI canvas controller:** interprets user intent, retrieves sourced knowledge, selects a suitable view, and issues validated display actions with explanations.

The user must be able to perform the same core navigation and manipulation manually. AI is an orchestrator, not a replacement for controls.

```text
User interaction / natural language
              ↓
      AI Canvas Controller
  intent → retrieval → plan → actions
              ↓
    Shared Exploration State
              ↓
Map | Hierarchy | Graph | Flow | Charts
```

## 2. Five composable map layers

Treat map layers as independently enabled, reordered, filtered, and styled components.

| Layer                         | Data                                                              | Rendering and interactions                                                                                        |
| ----------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1. Geography                  | Countries, provinces, municipalities, cities, boundaries          | Vector polygons, labels, hover/select, drill-down, fly-to                                                         |
| 2. Statistical overlays       | Population, GDP, employment, healthcare, education, etc.          | Choropleths, heatmaps, proportional markers, legends, time and metric filters                                     |
| 3. Entities and assets        | Mines, hospitals, institutions, power stations, businesses, ports | Points/polygons, clustering, search, selection, details                                                           |
| 4. Networks and relationships | Roads, rail, transmission, pipelines, supply links, dependencies  | Geographical line networks when routes are known; abstract relationship edges only when explicitly differentiated |
| 5. Knowledge and AI overlays  | Annotations, evidence, explanations, selections, comparisons      | Floating panels, highlights, callouts, traces, contextual cards                                                   |

Every layer should expose: `id`, `type`, `visible`, `opacity`, `zIndex`, `filters`, `style`, `sourceId`, `legend`, and `minZoom`/`maxZoom` where relevant. Preserve provenance and time validity of displayed features.

### Map controls

- Pan, zoom, rotate (where supported), reset bearing, fit selection, and fly-to location.
- Country/region/city selection with breadcrumbs and back/forward history.
- Toggle/reorder layers, adjust opacity, choose a metric and time period.
- Search and filter by geographical region, industry, entity type, relationship, and date.
- Click/hover markers, polygons, lines, and clusters; inspect details and sources.
- Isolate/highlight a selection and trace known relationships.
- Save and restore view state.
- On mobile/WebView, support touch pan/pinch, accessible controls, and bottom sheets.

## 3. Semantic zoom and information density

Zooming should change **which knowledge is displayed**, not merely scale icons.

| Geographic scope | Default content                                               |
| ---------------- | ------------------------------------------------------------- |
| World            | Countries, boundaries, high-level indicators                  |
| Country          | Provinces, major cities, national systems                     |
| Province/region  | Municipalities, industrial clusters, infrastructure corridors |
| City/district    | Individual institutions, businesses, facilities               |
| Entity           | Detailed entity record, documented relationships, evidence    |

Implement geographic scope and information density as **separate controls**. Users can choose `overview`, `regional`, or `detailed` density, subject to performance and data availability. Use feature clustering, label collision management, viewport-based loading, and progressively detailed geometry. Do not imply exact locations or relationships when data is unavailable.

## 4. Five primary visualization modes

### A. Geographic map

Question: **Where is something?**

MapLibre GL JS renders geographic features, thematic overlays, markers, and known spatial networks. Supports country/region drill-down and geographic filtering.

### B. Hierarchy diagram

Question: **How is it organized?**

React Flow renders parent-child structures (government → ministries → departments, company → divisions). Support collapse/expand, node details, fit view, and layout direction.

### C. Relationship graph

Question: **What is connected, and how?**

Cytoscape.js (or a suitable graph renderer) shows ownership, regulation, supply, dependency, and other typed edges. Support neighbors, path highlighting, filtering, and evidence inspection. Avoid rendering huge unfiltered graphs.

### D. System flow

Question: **How does it work or move?**

Render process steps, material/energy/money flows, inputs/outputs, and dependencies. Use directional edges, labels, and quantities only when sourced. A Sankey or flow layout may be selected according to the data.

### E. Data and timeline

Question: **How much, how different, or how has it changed?**

ECharts renders time series, comparisons, bars, distributions, and timelines. Show units, source, period, and missing-data treatment.

### Synchronized view layouts

1. **Single:** replace the main canvas while preserving exploration context.
2. **Overlay:** float charts, hierarchies, or entity panels over the map.
3. **Split:** show synchronized map + graph/chart side by side (later phase).

Selection, geographical context, filters, and time should carry across modes. Selecting a mine on a map should highlight that same entity in a graph, when present.

## 5. AI-directed canvas manipulation

The AI translates requests into **validated, declarative actions**. It never sends executable UI code.

| Action family | Examples                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------ |
| Navigation    | `FLY_TO`, `FOCUS_REGION`, `FIT_VIEW`, `RESET_VIEW`                                         |
| Layers        | `ADD_LAYER`, `REMOVE_LAYER`, `SET_LAYER_VISIBILITY`, `SET_LAYER_OPACITY`, `REORDER_LAYERS` |
| Filtering     | `SET_FILTERS`, `SET_TIME_RANGE`, `SET_INFORMATION_DENSITY`                                 |
| Selection     | `SELECT_ENTITIES`, `HIGHLIGHT_RELATIONSHIPS`, `ISOLATE_ENTITIES`, `CLEAR_SELECTION`        |
| Visualization | `SET_VISUALIZATION_MODE`, `LOAD_HIERARCHY`, `LOAD_GRAPH`, `LOAD_FLOW`, `CREATE_CHART`      |
| Layout        | `SET_LAYOUT`, `OPEN_DETAIL_PANEL`, `FIT_CANVAS`                                            |
| Explanation   | `ADD_ANNOTATION`, `SHOW_SOURCES`, `TRACE_DEPENDENCY`                                       |
| History       | `UNDO`, `REDO`, `RESTORE_VIEW`                                                             |

### Example: platinum mines and electricity

User: “Show platinum mining operations around Rustenburg and how they depend on electricity infrastructure.”

1. Resolve Rustenburg and focus the map on its area.
2. Enable mining and power infrastructure layers.
3. Filter operations by commodity and geography.
4. Retrieve **documented** infrastructure dependencies.
5. Highlight verified connections, distinguish uncertain/inferred relationships, and avoid inventing transmission routes.
6. Open a relationship graph as an overlay or split view.
7. Explain the result with sources and identify missing information.

Actions must be reversible, with loading/error states and clear user feedback.

## 6. Shared exploration state

Keep map rendering, graph rendering, and AI orchestration separate. Use a central state store (e.g., Zustand) with a common entity ID system.

```ts
type VisualizationMode = "map" | "hierarchy" | "graph" | "flow" | "chart";
type CanvasLayout = "single" | "split" | "overlay";
type InformationDensity = "overview" | "regional" | "detailed";

type CanvasState = {
  geography: {
    countryId: string | null;
    regionId: string | null;
    center: [number, number]; // longitude, latitude
    zoom: number;
  };
  visualization: {
    mode: VisualizationMode;
    layout: CanvasLayout;
    density: InformationDensity;
  };
  layers: Array<{
    id: string;
    visible: boolean;
    opacity: number;
    zIndex: number;
    filters: Record<string, unknown>;
  }>;
  selection: {
    entityIds: string[];
    relationshipIds: string[];
  };
  time: {
    year: number | null;
    range: [string, string] | null;
  };
};
```

A backend AI response should contain an explanation, citations, and a list of schema-validated actions. Resolve identifiers and check authorization, bounds, and supported operations before applying any action. Never let an LLM run arbitrary JavaScript or write directly to the client state.

## 7. Architecture and responsibilities

```text
Next.js + React + TypeScript
  ├─ Map renderer: MapLibre GL JS
  ├─ Hierarchy / flow renderer: React Flow
  ├─ Relationship renderer: Cytoscape.js
  ├─ Charts renderer: Apache ECharts
  ├─ Shared exploration state: Zustand
  └─ AI interaction + action dispatcher
                │
                ▼
FastAPI backend
  ├─ Knowledge / geographic / statistical APIs
  ├─ Source retrieval and evidence handling
  ├─ AI intent planner and tool orchestration
  └─ Action schema validation
                │
                ▼
PostgreSQL + PostGIS + pgvector
  ├─ Country and regional geometries
  ├─ Entities, domains, relationships
  ├─ Datasets, dates, source provenance
  └─ Retrieval indexes
```

Design the responsive website for future React Native WebView embedding. Use mobile-friendly gesture handling and avoid unnecessarily heavy rendering.

## 8. Codex implementation priorities

### Phase 1 — Canvas foundation

- Build responsive workspace shell with top toolbar, left knowledge explorer, central canvas, and collapsible AI/detail panel.
- Implement MapLibre world map and country selection.
- Add South Africa and its administrative hierarchy from sourced geodata.
- Implement map camera controls, selection, and breadcrumbs.
- Establish shared `CanvasState` and action dispatcher.

### Phase 2 — Layer and semantic zoom engine

- Add layer registry and layer controls (visibility, order, opacity, filters).
- Add entity markers, clustering, statistical overlays, and source legends.
- Implement scope-dependent loading and information-density modes.
- Add geographic drill-down and synchronized entity selection.

### Phase 3 — Five visualization modes

- Add hierarchy, graph, flow, and chart renderers.
- Implement mode switching without losing country, selection, or filters.
- Add floating detail panels and overlay layouts.
- Add split layout after single and overlay modes are stable.

### Phase 4 — AI canvas controller

- Expose safe read-only knowledge retrieval tools.
- Define typed, validated canvas action schemas.
- Implement AI planning → retrieve → explain → action sequence.
- Show sources, missing data, and action history.
- Add tests for invalid action payloads and context preservation.

## 9. Acceptance criteria

- A user can select South Africa, drill down to a region, and return without losing state.
- A user can independently toggle two thematic layers and change density.
- Entity selections persist across map and graph views.
- A hierarchy can be expanded/collapsed and a graph can highlight typed relationships.
- A chart shows data units, time range, and sources.
- AI can change the visible layers and mode using only allowed actions.
- Unsupported or unsourced relationships are not presented as verified facts.
- The interface is usable on desktop and touch devices.

## 10. Guiding principle

**The map is the permanent geographical reference, not a forced container for all information.** Physical assets belong on the map; institutional structures belong in hierarchies; ownership and dependencies belong in graphs; processes belong in flows; and measurements belong in charts.

Civic Intelligence's defining capability is transforming the **same sourced knowledge** into different, synchronized, interactive visual representations, with AI directing those transformations and explaining them.

## 11. Country learning topics and AI orchestration

The [country learning design](docs/country-learning/README.md) develops ten learning topics: geography, people, government, administrative divisions, economy, history, laws and rights, public services, infrastructure, and international relations.

Each topic describes categories, interactive learning, an AI-orchestrated example, evidence requirements, current support and proposed additions. The shared [AI orchestration guide](docs/country-learning/ai-orchestration.md) defines the question → retrieval → display → explanation loop; the [integration guide](docs/country-learning/integration-and-delivery.md) maps it to the existing code and delivery stages.

These documents specify future learning capabilities without treating them as implemented features. They preserve country-specific structures, source dates, reversible display changes, manual exploration and details on demand.
