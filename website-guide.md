# Civic Intelligence — Interactive World Knowledge Canvas

The original product brief is preserved in [docs/product-brief.md](docs/product-brief.md). This implementation replaces the old marketing website, whose guide is archived in [docs/website-guide.legacy.md](docs/website-guide.legacy.md).

## Implemented workspace

Next.js App Router, TypeScript, Tailwind, Zustand, MapLibre, React Flow, Cytoscape and ECharts provide a responsive knowledge workspace with seven views: Map, Hierarchy, Relationships, System flow, Data, Compare and History.

The [canvas interaction implementation](docs/canvas-implementation.md) adds independent ordered layers, opacity/filter controls, native map symbols, semantic scope with separate density, shared camera and selection, an overlay layout, and reversible validated actions. Existing saved investigations migrate to the expanded state. Split view and live AI orchestration remain deferred.

The curated catalogue includes 390 entities, 393 typed/navigation relationships, 79 sources, all nine South African provinces, 43 national-directory bodies, 257 municipalities, three mining groups with eight operations, four station assets, 13 representative city points, two Census datasets, two historical World Bank indicators and seven events.

Detailed institutional coverage focuses on South Africa. World Bank population and GDP-growth comparisons cover South Africa, Botswana and Namibia in 2014–2024. Other countries remain map-only.

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

## Run and maintain

See [README.md](README.md) for local startup and checks, [data maintenance](docs/data-maintenance.md) for curation, [production setup](docs/production.md) for deployment/monitoring, and [local verification](docs/local-verification.md) for observed results.
