# CIVIC INTELLIGENCE
## AI-Powered Interactive World Knowledge Canvas

### 1. Project Overview

Build **Civic Intelligence**, a modern, AI-powered web application that allows users to visually explore, investigate, and understand countries, their institutions, economies, industries, infrastructure, systems, and relationships.

The application should function as an **interactive world knowledge canvas**, combining geographical exploration, structured knowledge, interactive diagrams, data visualizations, and a context-aware AI assistant.

The primary objective is to make complex real-world information easy to understand through visual exploration and AI assistance.

Users should be able to select any country on a world map, explore its knowledge domains, navigate connected entities, visualize systems, and ask an AI assistant to explain or manipulate the current canvas.

**Development approach:** Build a responsive web application first. It must be compatible with future embedding inside a React Native application using WebView.

---

### 2. Technology Stack

**Frontend**
- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- shadcn/ui
- MapLibre GL JS — interactive geographical maps
- React Flow (XYFlow) — interactive knowledge canvas
- Cytoscape.js — complex relationship graphs
- Apache ECharts — statistics and data visualization
- Zustand — application and canvas state
- Three.js / React Three Fiber — optional future 3D visualization

**Backend**
- Python + FastAPI
- PostgreSQL + PostGIS
- pgvector for semantic retrieval
- OpenAI API for AI reasoning and tool calling
- SQLAlchemy and Alembic for database management

**Architecture**
- Separate frontend and backend services.
- REST APIs for structured data and canvas operations.
- Streaming AI responses.
- Shared, structured data models.
- Modular components and services.
- Responsive layouts suitable for desktop and mobile.

---

### 3. Main Application Interface

The application should have four primary interface areas.

#### A. World Map

The world map is the main geographical navigation interface.

Capabilities:
- Display an interactive world map.
- Zoom, pan, and select countries.
- Highlight countries on hover and selection.
- Display country names and geographical boundaries.
- Zoom into selected countries.
- Navigate to provinces, states, regions, and cities where data exists.
- Display geographical data layers.
- Support map markers for entities and infrastructure.
- Open contextual information panels when geographical features are selected.

Selecting a country should update the application's active geographical context.

#### B. Knowledge Explorer

A collapsible sidebar containing structured knowledge domains for the selected country.

Initial domains:

1. Government & Politics
2. Economy & Finance
3. Industries & Businesses
4. Infrastructure & Systems
5. Law & Justice
6. People & Society

Each domain should contain expandable subcategories, entities, documents, systems, and datasets.

Example:

World
└── Africa
    └── South Africa
        ├── Government & Politics
        │   ├── National Government
        │   ├── Provincial Government
        │   ├── Local Government
        │   └── Public Finance
        ├── Economy & Finance
        │   ├── Economic Indicators
        │   ├── Employment
        │   ├── Trade
        │   └── Taxation
        ├── Industries & Businesses
        │   ├── Mining
        │   ├── Agriculture
        │   ├── Manufacturing
        │   └── Technology
        └── Infrastructure & Systems
            ├── Electricity
            ├── Water
            ├── Transport
            └── Telecommunications

Selecting an item should display its information in the central workspace.

#### C. Interactive Knowledge Canvas

The central workspace is a dynamic, zoomable canvas for visualizing structured information.

Supported visualization modes:

**1. Geographic View**
- Country, province, and city maps.
- Geographical markers.
- Regional boundaries.
- Data overlays and thematic layers.

**2. Hierarchy View**
- Government structures.
- Organizational structures.
- Institutional hierarchies.
- Parent-child relationships.

**3. Relationship Graph**
- Companies and subsidiaries.
- Institutions and regulators.
- Industries and infrastructure dependencies.
- Connected entities.

**4. System Flow View**
- Electricity supply chains.
- Government revenue and expenditure.
- Banking systems.
- Industrial production processes.
- Supply chains.

**5. Data Visualization View**
- Line charts.
- Bar charts.
- Pie charts.
- Timelines.
- Statistical comparisons.

Canvas interactions:
- Pan and zoom.
- Select nodes and connections.
- Expand or collapse nodes.
- Open entity detail panels.
- Switch between visualization modes.
- Navigate back and forward.
- Reset and fit the canvas.
- Highlight relationships.
- Preserve active exploration context.

The canvas should support programmatic manipulation by the AI agent.

#### D. AI Assistant

A collapsible AI assistant panel that understands the user's current exploration context.

The AI should know:
- Selected country.
- Selected geographical region.
- Active knowledge domain.
- Selected entity.
- Current visualization mode.
- Visible canvas entities.
- Relevant conversation history.

Users should be able to ask natural-language questions such as:

- "Explain how South Africa's government works."
- "Show me the structure of the Department of Health."
- "Visualize how electricity reaches households."
- "Compare South Africa and Botswana's economies."
- "Show the relationships between mining companies and their operations."
- "Expand this entity."
- "Focus on North West province."

The AI must be able to both **answer questions and control the canvas**.

---

### 4. AI Agent Architecture

Implement a tool-based AI agent that converts user requests into structured actions.

Example AI tools:

- `select_country(country_code)`
- `focus_region(region_id)`
- `open_entity(entity_id)`
- `get_entity_details(entity_id)`
- `get_entity_relationships(entity_id)`
- `search_knowledge(query, filters)`
- `create_hierarchy(root_entity_id)`
- `create_relationship_graph(entity_ids)`
- `create_system_flow(system_id)`
- `create_chart(dataset_id, chart_type)`
- `highlight_entities(entity_ids)`
- `expand_node(node_id)`
- `set_visualization_mode(mode)`
- `fit_canvas()`

Separate read-only retrieval tools from canvas manipulation tools.

The backend should validate AI-generated actions and return structured commands to the frontend.

The frontend should execute only recognized, validated canvas actions.

Example action response:

```json
{
  "message": "Showing South Africa's government structure.",
  "actions": [
    {
      "type": "SET_VISUALIZATION_MODE",
      "payload": {
        "mode": "hierarchy"
      }
    },
    {
      "type": "LOAD_HIERARCHY",
      "payload": {
        "rootEntityId": "za-national-government"
      }
    },
    {
      "type": "FIT_CANVAS",
      "payload": {}
    }
  ],
  "sources": []
}
```

Do not allow the AI to execute arbitrary JavaScript or directly modify application internals.

All AI-generated factual claims should be grounded in retrieved information. Show citations where available and clearly identify missing or unverified data.

---

### 5. Knowledge and Data Model

The platform should represent real-world knowledge through structured entities and relationships.

**Country**
- ID
- ISO country code
- Name
- Continent
- Geographical boundaries
- Metadata

**Region**
- ID
- Country ID
- Parent region ID
- Name
- Region type
- Geometry

**Knowledge Domain**
- ID
- Name
- Description
- Parent domain ID

**Entity**
- ID
- Name
- Entity type
- Description
- Country ID
- Region ID (optional)
- Domain ID
- Attributes
- Sources
- Last updated timestamp

Entity types may include:
- Government institution
- Department
- Company
- Industry
- Infrastructure asset
- Public organization
- Geographic location
- Law or policy
- Economic system

**Relationship**
- ID
- Source entity ID
- Target entity ID
- Relationship type
- Description
- Source references
- Validity dates

Example relationship types:
- PART_OF
- LOCATED_IN
- REGULATES
- OWNS
- OPERATES
- SUPPLIES
- DEPENDS_ON
- FUNDS
- CONNECTED_TO

**Source**
- ID
- Title
- Publisher
- URL
- Publication date
- Retrieval date
- Source type

**Dataset**
- ID
- Name
- Description
- Country ID
- Indicator
- Unit
- Time period
- Data points
- Source references

Store structured information separately from raw documents and AI-generated explanations.

---

### 6. User Workflows

#### Workflow 1: Explore a Country

1. User opens Civic Intelligence.
2. Interactive world map appears.
3. User selects South Africa.
4. Map zooms into South Africa.
5. Country overview and knowledge domains load.
6. User selects Government & Politics.
7. Canvas displays a structured government hierarchy.
8. User expands a department.
9. Entity information and relationships appear.

#### Workflow 2: AI-Assisted Exploration

1. User selects South Africa.
2. User asks: "Show me how the electricity system works."
3. Backend retrieves relevant system information.
4. AI produces an explanation and structured canvas actions.
5. Canvas switches to System Flow mode.
6. Electricity system components appear as connected nodes.
7. User clicks a component.
8. AI retains the selected component as context for follow-up questions.

#### Workflow 3: Investigate Relationships

1. User opens Industries & Businesses.
2. User selects Mining.
3. User selects a mining company.
4. Canvas displays its known relationships.
5. User expands a subsidiary or operation.
6. Canvas adds connected entities.
7. User asks the AI to explain a relationship.
8. AI retrieves relevant sources and provides an explanation.

---

### 7. UI/UX Requirements

Design the interface as a professional, modern intelligence workspace.

**Desktop layout**
- Left sidebar: geographical navigation and knowledge explorer.
- Center: interactive map or knowledge canvas.
- Right sidebar: AI assistant and contextual details.
- Top toolbar: search, breadcrumbs, visualization modes, and canvas controls.

**Mobile layout**
- Full-screen map/canvas.
- Collapsible navigation drawer.
- Bottom-sheet AI assistant.
- Touch-friendly controls.
- Pinch-to-zoom and drag gestures.
- Responsive entity detail panels.

**Design principles**
- Clean, minimal interface.
- Dark mode as the initial theme.
- Clear visual hierarchy.
- Smooth navigation transitions.
- Reusable components.
- Avoid cluttering the canvas.
- Display progressive detail as users zoom or expand entities.
- Provide loading, empty, and error states.
- Support keyboard and screen-reader accessibility where practical.

The canvas should feel like an exploratory environment, not a static dashboard.

---

### 8. Initial MVP Scope

Start with **South Africa** as the first deeply supported country.

Implement:

1. Interactive world map with selectable countries.
2. South Africa country overview.
3. Knowledge domain navigation.
4. Seeded South African government hierarchy.
5. Basic industries and infrastructure knowledge.
6. Interactive React Flow hierarchy and relationship diagrams.
7. Entity details panel.
8. Context-aware AI chat.
9. Validated AI-driven canvas actions.
10. Source references and basic search.
11. Responsive desktop and mobile interface.

Other countries can initially display a basic overview and a clear indication that detailed knowledge coverage is not yet available.

Use a small, curated seed dataset with real, sourced entities and relationships. Do not fabricate factual records to fill missing coverage.

---

### 9. Development Guidelines

- Use a modular, maintainable architecture.
- Separate map rendering, canvas rendering, knowledge retrieval, and AI orchestration.
- Define shared TypeScript schemas for canvas actions.
- Validate backend payloads before applying them.
- Keep application state independent of visualization components.
- Avoid unnecessarily loading large geographical datasets.
- Use viewport-based rendering and clustering for large datasets.
- Persist user exploration state where appropriate.
- Never expose OpenAI API keys in the frontend.
- Implement error handling, request timeouts, and rate limiting.
- Write tests for core APIs, data validation, and AI canvas actions.

**Implementation priority:** Deliver a functional, polished MVP before introducing advanced 3D graphics, large-scale knowledge ingestion, collaborative editing, or simulation features.

---

### 10. Long-Term Vision

Civic Intelligence should eventually support:

- Comprehensive worldwide country coverage.
- Cross-country comparisons.
- Historical knowledge and timeline navigation.
- Collaborative knowledge contributions.
- Community fact-checking and evidence discussions.
- AI-assisted investigations.
- Interactive economic and infrastructure analysis.
- Dependency graphs.
- Scenario exploration.
- Exportable visual reports.
- User workspaces and saved investigations.
- React Native mobile distribution through WebView.

### Final Product Goal

Build an AI-native world exploration platform where users can navigate from a country to its smallest documented entities, understand how institutions and systems operate, explore relationships, and investigate complex questions through an intelligent, interactive visual canvas.

**The world map is the entry point. The knowledge graph is the foundation. The interactive canvas is the workspace. The AI agent is the guide and investigator.**