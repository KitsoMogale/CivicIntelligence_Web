# Civic Intelligence — How the map, views and AI work together

The accepted direction is an AI teacher working on a flexible 2D chalkboard. GPT can research **any country or topic** through built-in web search and use validated tools to create, arrange and update maps, diagrams, graphs, charts, timelines, information panels and notes. The app does not require a predefined topic database. The implementation uses a responsive Next.js frontend, a FastAPI Responses API teacher, and `gpt-6-luna`.

See [the teaching canvas guide](docs/ai-teaching-canvas.md) for the implemented workflow, local startup, shared tools and remaining limits. The detailed map architecture below remains the reference-map subsystem; its saved topic examples are optional starting points. React Native WebView embedding is a later delivery step. The focus remains 2D interaction and visual teaching.

## 1. Main idea

Civic Intelligence helps people learn about countries by asking questions and exploring maps, diagrams and charts.

The map gives a sense of place. Other views explain organizations, connections, processes, numbers and history.

The main parts are:

- **Checked information:** countries, areas, topics, places, organizations, connections and sources.
- **Interactive views:** maps, organization diagrams, connection graphs, process diagrams and charts.
- **AI as the middleman:** understand the question, find checked facts, choose what to show and explain it.

Users can also explore with ordinary controls. They do not need AI for every click.

```text
User asks a question or clicks something
                 ↓
AI finds the facts and plans a useful view
                 ↓
The app checks the requested changes
                 ↓
Shared view settings are updated
                 ↓
Map | Organization | Connections | Process | Charts
```

## 2. Five groups of map layers

A layer is one set of information that can be shown on the map. Users should be able to switch layers on or off, change their order, filter them and make them more transparent.

| Layer group                 | What it contains                                          | What users can do                                        |
| --------------------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| Geography                   | Countries, regions, towns and boundaries                  | Select an area and explore smaller areas where supported |
| Statistics                  | Population, jobs, education and other figures             | Choose a measure and date; read the legend and source    |
| Places and organizations    | Mines, hospitals, public bodies, power stations and ports | Click a dot or shape to open checked details             |
| Networks and connections    | Roads, rail, utility lines and documented relationships   | Follow known routes or inspect explained connections     |
| Explanations and selections | Highlights, sources, notes and comparisons                | Understand the view and ask a follow-up question         |

Each layer needs a name, source, visibility setting, order, transparency and relevant filters. Explain its colours, dates and accuracy. Some layers should only appear at suitable zoom levels.

The app currently supports eleven known layer IDs within these groups. Adding a new layer type requires app changes as well as data.

### Map controls

- Move, zoom, rotate where supported, reset direction and fit a selection.
- Choose a country, area or place and follow the path back.
- Turn layers on or off, reorder them and adjust transparency.
- Choose dates, measures and filters.
- Click dots, areas, lines or groups of nearby dots to inspect details.
- Highlight a selection, hide unrelated items or follow documented links.
- Save and restore the current view.
- Support touch, keyboard controls and readable panels on phones.

Keep permanent entity name cards and hover name cards removed. Details open on click. Extra panels can be closed and reopened while keeping the selection and map position. Required map credits remain available.

## 3. Zoom and amount of detail

Zoom should help decide which information is useful, rather than only making symbols bigger.

| View of the map  | Useful information when available                   |
| ---------------- | --------------------------------------------------- |
| World            | Countries and basic comparisons                     |
| Country          | Main areas, major places and national systems       |
| Region           | Local areas, industries and infrastructure          |
| Town or district | Individual facilities, businesses and public bodies |
| Selected item    | Its details, documented connections and sources     |

Keep zoom separate from the amount of information shown. The existing choices are overview, regional and detailed. Explanation depth is another separate choice.

Group nearby dots and load more map detail only when needed. Do not invent exact locations or links when the source only supports a rough position.

## 4. Choosing the right view

### A. Map — where is it?

MapLibre draws places, boundaries, available statistics and known physical networks. Users can select areas, zoom in and filter the map.

### B. Organization diagram — how is it organized?

React Flow shows structures such as a ministry and its departments. Users can open or close parts of a diagram and inspect each item.

Only show a chain of authority where the source supports it. Keep independent bodies and separate systems distinct.

### C. Connection graph — what is linked?

Cytoscape shows links such as ownership, regulation and supply. Users can inspect a line, follow nearby connections and filter by type or date.

Explain what each arrow means. Keep large graphs focused on the question.

### D. Process diagram — how does it work?

Show steps such as producing electricity, moving it and delivering it to users. Use quantities only when there is a source.

A process diagram can explain a system without proving a particular physical route exists.

### E. Charts and timelines — how much, or what changed?

ECharts helps show comparisons, changes over time, totals and distributions. Always include units, dates, sources and missing values.

The app presents these view types through seven tabs: Map, Hierarchy, Relationships, System flow, Data, Compare and History.

### Ways to arrange views

1. **Single:** one main view.
2. **Overlay:** a closable diagram or chart above the map.
3. **Split:** the map beside a diagram or chart; stacked on smaller screens.

Keep the selected country, area, item, dates and filters when changing views. Selecting a mine on the map should select the same mine in a graph when it is present.

## 5. How AI changes the screen

AI sends allowed commands, and the app checks them before applying them. AI must not send code for the browser to run.

Examples from the wider app command rules:

| What needs to change    | Existing command examples                                                   |
| ----------------------- | --------------------------------------------------------------------------- |
| Country or map position | SELECT_COUNTRY, FLY_TO, FOCUS_REGION, RESET_VIEW, FIT_CANVAS                |
| Layers                  | SET_LAYER_VISIBILITY, SET_LAYER_OPACITY, REORDER_LAYERS                     |
| Filters and detail      | SET_FILTERS, SET_LAYER_FILTERS, SET_TIME_RANGE, SET_INFORMATION_DENSITY     |
| Selection               | SELECT_ENTITIES, HIGHLIGHT_RELATIONSHIPS, ISOLATE_ENTITIES, CLEAR_SELECTION |
| View or chart           | SET_VISUALIZATION_MODE, CREATE_CHART, EXPAND_NODE                           |
| Layout                  | SET_LAYOUT                                                                  |
| Connections             | TRACE_NETWORK                                                               |
| History                 | UNDO, REDO                                                                  |

The AI connection exposes only part of this list today. See [how AI connects everything](docs/country-learning/ai-orchestration.md) for the exact limits. New layers, document reading and lessons need further work.

### Example: mining and electricity

User: "Show platinum mines around Rustenburg and explain their electricity connections."

1. Find Rustenburg and focus the map.
2. Show the available mining and power information.
3. Find relevant operations and checked connections.
4. Highlight only links supported by sources.
5. Show a focused connection graph beside or above the map.
6. Explain the result, sources and missing facts.

Do not guess transmission routes or suppliers from nearby locations. Show loading and errors clearly, and let the user undo changes.

## 6. Shared view settings

All views should use the same saved settings for:

- Selected country, area and items.
- Map position, zoom and direction.
- View type, layout and amount of detail.
- Visible layers, their order and transparency.
- Filters, dates and comparisons.
- Selected connections and highlighted paths.

Each real place or organization needs one stable ID so every view refers to the same item. Keep display drawing separate from AI planning and information storage.

The actual field names are in [exploration.ts](lib/exploration.ts). The [store](lib/store.ts) keeps the current settings, and [command checks](lib/actions.ts) decide which changes are allowed.

An AI answer should include an explanation, sources and valid commands. Check the country, IDs, map limits and supported features before changing the screen. Reject old requests if the user has moved to another place or question.

## 7. Main software parts

| Part                          | Responsibility                                               |
| ----------------------------- | ------------------------------------------------------------ |
| Next.js, React and TypeScript | Website, controls and server routes                          |
| MapLibre                      | Map drawing                                                  |
| React Flow                    | Organization and process diagrams                            |
| Cytoscape                     | Connection graphs                                            |
| ECharts                       | Charts and comparisons                                       |
| Zustand                       | Shared view settings                                         |
| AI tools and command checks   | Find facts, explain them and request safe display changes    |
| Optional FastAPI service      | Read checked information from a separate Python service      |
| Optional PostgreSQL database  | Save country information, places, links, figures and sources |
| PostGIS and pgvector          | Support map data and searches by meaning in the database     |

The app can use its bundled information without the optional database. The current AI connection uses a Next.js server route.

Keep the website usable on phones and suitable for a future mobile app that displays the website inside it.

## 8. Build in stages

### Stage 1 — Basic workspace

Build the page layout, country selection, map controls, details panel and shared settings. Add checked country information using each country's own structure.

### Stage 2 — Layers and detail

Add layer controls, dots, charts on the map and clear legends. Load detail as users explore. Keep selections linked across views.

### Stage 3 — Other views

Add organization, connection, process and chart views. Support single, overlay and split layouts without losing the current selection.

### Stage 4 — AI coordinator

Connect tools that read checked facts. Add allowed display commands, source-based explanations, cancellation and undo. Check invalid requests and changes made while AI is loading.

Much of stages 1–3 is already built. Full AI coordination and the broader learning features still need work.

## 9. How to check the result

- Users can select a country, explore an available area and return without losing their place.
- Two layers can be controlled separately.
- The same item stays selected across maps and diagrams.
- Diagrams can open and close sections; graphs can explain their links.
- Charts show units, dates, sources and missing values.
- AI can use only supported commands and checked information.
- Missing or uncertain connections are explained honestly.
- Desktop, touch and keyboard controls work.

## 10. Main rule

Use the map to show places. Use other views when they explain something better.

The app should let people explore the same checked information in several connected ways, with AI helping them choose and understand the next step.

## 11. Learning topics

The [country learning guides](docs/country-learning/README.md) cover geography, people, government, country divisions, economy, history, laws and rights, public services, infrastructure and international relations.

Each explains what users can learn, how they can explore it, an example with AI, the information needed and what already works.

Read [the AI guide](docs/country-learning/ai-orchestration.md) for the question → facts → screen → explanation process. Read [the build guide](docs/country-learning/integration-and-delivery.md) for the work and code involved.
