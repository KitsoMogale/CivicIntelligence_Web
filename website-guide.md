# Civic Intelligence — Interactive World Knowledge Canvas

The original product brief is preserved in [docs/product-brief.md](docs/product-brief.md). This implementation replaces the old marketing website, whose guide is archived in [docs/website-guide.legacy.md](docs/website-guide.legacy.md).

The [country learning design](docs/country-learning/README.md) explains ten learning topics and how AI can orchestrate reviewed knowledge, interactive displays and user exploration. Its topic guides, orchestration model and integration roadmap distinguish current support from proposed learning features.

## Implemented workspace

Next.js App Router, TypeScript, Tailwind, Zustand, MapLibre, React Flow, Cytoscape and ECharts provide a responsive knowledge workspace with seven views: Map, Hierarchy, Relationships, System flow, Data, Compare and History.

The [canvas interaction implementation](docs/canvas-implementation.md) adds independent ordered layers, opacity/filter controls, native map symbols, semantic scope with separate density, shared camera and selection, an overlay layout, and reversible validated actions. Existing saved investigations migrate to the expanded state. Resizable split view is implemented; live AI orchestration remains deferred.

The catalogue includes 4,238 entities, 4,007 typed/navigation relationships and 301 sources. Country profiles cover 237 countries and areas, including 3,382 dated reference areas across 214 country files. South Africa retains nine provinces, 43 national-directory bodies, 257 municipalities, 4,485 revised MDB wards, curated industry and infrastructure examples, two Census datasets, six provincial measures and seven events.

Detailed institutional coverage focuses on South Africa, with initial sourced Botswana and Namibia profiles. Other countries show their geographic reference coverage and institution gaps. World Bank population and GDP-growth comparisons cover mapped economies where observations are published in 2014–2024. See [world coverage and source caveats](docs/world-coverage.md).

Country structure and coverage opens on demand. Dated administrative areas can be selected and highlighted. Entity dots remain selectable, with permanent and hover name cards removed, including power stations. Cluster counts remain visible.

## Geography and evidence

The map bundles Natural Earth country boundaries, simplified geoBoundaries province geometry and source-linked markers. Layers include Census 2022 counts, Census 2011–2022 change, cities, institutions, mining province locators and station/project locators. Coordinate precision is documented; Duvha's exact point is withheld pending the source's verification request.

Government spheres are distinct, interdependent and interrelated; navigation groups are not a chain of command. Company interests preserve legal-entity level and reporting date. Electricity-flow arrows represent the four functional stages; asset catalogue links carry their own meanings. Historical events do not reconstruct the entire past graph.

Census counts are not current estimates or World Bank midyear estimates. Source values, missing observations and the 2011 national/provincial one-person discrepancy are preserved.

## Investigations and review

Saved investigations preserve full exploration state, notes and filters, with import/export and migration of old bookmarks. Visual reports contain diagrams or map figures, data tables, notes and source references and can be printed to PDF.

The public directory separates former municipality codes. Source review records browser-local decisions and structurally validates proposed bundles. Repository imports are validated, backed up and versioned; there is no unauthenticated database write endpoint.

## Architecture and hosting

The Next frontend and same-origin Node routes are prepared for Netlify. The optional FastAPI service uses PostgreSQL, PostGIS, pgvector, SQLAlchemy and Alembic and needs a separate production host. It persists entities, relationships, sources, datasets, province geometry, indicator series, timeline events and catalogue revisions.

The default reviewed bundle works without a database or AI credentials. Streaming AI and embedding plumbing remain available for later credential configuration. No live-provider requests or deployments are part of this milestone.

Choose **Layout → Split canvas** to keep the map beside the active graph/chart, then drag or keyboard-resize the divider. Its ratio is saved and supports undo. **Layers → Municipal boundaries** offers local/metro and district/metro levels for 257 unique records. The default is the MDB 2026 published edition; historical representative-2020 geometry remains separately selectable. Enable Ward boundaries, choose a local municipality/metro, and select a ward. Online OpenStreetMap supplies roads and street labels through zoom 19. Five sourced facility points retain publisher precision.

**Explore network** finds multi-step neighborhoods or a shortest documented path, with direction, type, reporting-date filters and evidence links. Directory connections are optional. Provincial statistics include unemployment, employment absorption, real GDP growth, adult education and medical-aid coverage. Legends and reports preserve periods, denominators and attribution. Netlify deployment and live AI credentials remain deferred.

Ward files retain official identifiers and numbering gaps. The revised release reflects the stayed Kopanong split (nine wards). Source DATE fields are 4 November 2026; retrieval was 13 November. One publisher ring defect in Alfred Duma Ward 5 has a documented, area-preserving display repair and a downloadable original. Boundary editions do not change the dates or granularity of statistical observations.

## Run and maintain

The map opens without welcome, shared-selection or city cards. City points remain selectable; source-linked entity details are available in the closable Details sidebar. Ward controls, statistical legends and map error panels have an X to close and a compact button to reopen. Closing these panels preserves map layers and selection; Escape also closes a focused panel. Canvas overlays have an X that returns to Map. Required map attribution remains visible.

See [README.md](README.md) for local startup and checks, [data maintenance](docs/data-maintenance.md) for curation, [production setup](docs/production.md) for deployment/monitoring, and [local verification](docs/local-verification.md) for observed results.
