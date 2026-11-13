# Civic Intelligence

A local-first world knowledge workspace built with Next.js, MapLibre, React Flow, Cytoscape, ECharts and an optional FastAPI/PostgreSQL service. AI credentials are optional and remain deferred. Nothing has been deployed.

## Open locally on Windows

Dependencies and a project-local Python environment have already been installed in this checkout.

```powershell
npm.cmd run dev
```

Open http://127.0.0.1:3000. Keep the terminal running. If the preview was already running before these changes, stop it with Ctrl+C and restart it.

For a production preview, stop the development server, then:

```powershell
npm.cmd run build
npm.cmd start
```

A fresh checkout needs `npm.cmd ci` first. Use Node 22 or later. The default experience requires no API key, database, map-token or external tiles.

## What to explore

- **Map:** select countries, nine provinces and 257 municipality records. Enable Municipal boundaries and choose local/metro or district/metro geography. Boundaries are historical representative-2020 geometry. Five additional hospital, campus/building and harbour locators retain publisher precision notes.
- **Split canvas:** choose Layout → Split canvas to keep the map beside a graph or chart. Drag the divider or use its arrow keys; panels stack on mobile. Shared selection, camera, saved views and undo retain context.
- **Networks:** Explore network supports one to six steps, shortest documented paths, direction and relationship-type controls. Directory connections are optional. The shared evidence-date filter excludes undated edges. Reverse traversal indicates connectivity, not reverse ownership.
- **Provincial statistics:** Layers offers unemployment and absorption (Q3 2026), real GDP growth (2025), adult education (2022, ages 20+), and medical-aid coverage (2025), alongside Census population/change. Legends and reports retain definitions, denominators, periods and sources; no municipality estimates are interpolated.
- **Canvas controls:** combine independent layers, reorder them, change opacity and choose Census 2011/2022. Set information density separately from zoom. Shared selection, filters and camera survive view changes. Use Map + overlay for synchronized diagrams, Trace/Isolate for selections, and History for undo/redo. See [canvas implementation](docs/canvas-implementation.md).
- **Hierarchy / Relationships:** explore government spheres, provincial institutions, 43 national directory bodies, 257 municipalities, and three mining groups with eight operations. Select a connection for its evidence and reporting date.
- **System flow:** the simplified four-stage electricity supply path stays separate from the infrastructure asset catalogue.
- **Data:** Census 2011 and 2022 provincial counts, bar/donut charts, two-census comparison and accessible tables.
- **Compare:** matching-year World Bank population and GDP-growth observations for South Africa, Botswana and Namibia, 2014–2024. Missing data remain unavailable.
- **History:** source-linked events with year and entity filters. Events do not imply a complete historical reconstruction.
- **Investigations:** bookmarks preserve the full view, selection, expanded nodes, map/data filters and notes. Import/export investigations between browsers. Older bookmarks migrate automatically.
- **Reports:** download a self-contained HTML report with geographic or relationship figures, statistics, notes and references. Open it and use Print to save a PDF.
- **Directory:** [http://127.0.0.1:3000/directory](http://127.0.0.1:3000/directory) lists national bodies and municipalities. Former municipal codes are separated.
- **Source review:** [http://127.0.0.1:3000/review](http://127.0.0.1:3000/review) validates proposed bundles and stores review decisions on this device.

## Optional FastAPI and database

The frontend works independently from its reviewed bundle. To test the Python service:

```powershell
node scripts/bootstrap-python.mjs
npm.cmd run dev:api
```

Set `KNOWLEDGE_API_URL=http://127.0.0.1:8000` in a server-only `.env.local` and restart Next.js to use the knowledge gateway. The browser catalogue and database must use the same reviewed release.

For the isolated local database:

```powershell
docker compose -p civic-intelligence-local up -d db
node scripts/db-check.mjs
```

The database binds to loopback port 55432. The check applies migrations, seeds twice and verifies PostGIS, pgvector, catalog revisions and database-backed retrieval. The seed upserts reviewed records without deleting unrelated data. Database volumes are retained when the container is stopped.

## Verification

```powershell
npm.cmd run data:check
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:api
npm.cmd run build
npm.cmd run test:browser
node scripts/smoke.mjs
```

Browser tests use the installed Microsoft Edge through playwright-core. Set `BROWSER_EXECUTABLE` if needed and `TEST_BASE_URL` for a different local port. Screenshots and JSON reports go to ignored `test-results/`.

For an isolated production check while port 3000 is in use:

```powershell
npm.cmd run build:verify
npm.cmd run start:verify
```

That server uses `.next-verify` and http://127.0.0.1:3100, leaving the regular build directory separate. Point browser/smoke checks at that URL.

## Data and release workflow

The curated catalogue contains **396 entities, 399 relationships, 88 references, nine province regions, 257 municipal boundary identities, two Census datasets, two World Bank indicator series, six provincial metrics (54 observations) and seven dated events**. Navigation and geographic-context links are included in the relationship count.

See [data maintenance](docs/data-maintenance.md), [production setup](docs/production.md), [local verification](docs/local-verification.md), and the [product brief](docs/product-brief.md). `data/release.json` records the bundle digest used by database readiness checks.

## Netlify

`netlify.toml` checks the data and tests before building. Netlify's Next.js adapter serves the application and Node API routes. The optional persistent Python/database service needs a separate host. Production configuration and monitoring endpoints are prepared; no deployment has been performed.

## Scope and evidence

Institutional knowledge focuses on South Africa; statistical comparisons cover ZA/BW/NA. This is not a worldwide institutional register. The mining and station catalogues are curated examples, not exhaustive lists.

Ownership and operating interests retain their reporting dates and legal-entity level. No current officeholder list, interest rate, asset output or forecasts are invented. Census counts and World Bank midyear estimates are different measures. The published 2011 provincial integers sum to one more person than the release's printed national total; source values are preserved.

Country and province geography is simplified. City points and station project/fence points are representative locators, with precision notes. Mining points and Duvha use province locators where exact positions have not been verified. Licenses and attribution accompany geography and source records.

Investigations and review notes are browser-local; there is no account system or cloud synchronization. Review proposals are checked in the browser and applied through the repository workflow, not through an unauthenticated public write API. There is no collaboration, simulation or 3D view.

Live AI and embedding generation remain optional. Do not place server keys in `NEXT_PUBLIC_` variables or exported reports. The labelled local guide works now.
