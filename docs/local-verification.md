# Local verification — 13 November 2026

The application was checked locally using Node 22, Next.js 16, a workspace-local Python 3.12 environment, Microsoft Edge, and Docker PostgreSQL with PostGIS and pgvector. The production frontend used an isolated `.next-verify` build on port 3100, leaving the existing port 3000 development server alone.

| Check                                                                              | Result                                                                                                              |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Production build, TypeScript and static page generation                            | Passed                                                                                                              |
| Application logic, data integrity, agent and canvas contracts                      | 55 tests passed                                                                                                     |
| FastAPI validation, catalogue, retrieval and embedding contracts                   | 14 tests passed                                                                                                     |
| Desktop and mobile browser workflows                                               | 22 checks passed; no uncaught page errors or hidden-attribution warnings                                            |
| Canvas layer, selection, overlay, camera and mobile workflows                      | Nine focused checks passed; no browser or map-layer errors                                                          |
| Split, municipality, network, provincial report and facility workflows             | Six feature browser checks passed                                                                                   |
| Streets, revised ward geometry, selection, persistence, mobile access and recovery | Eight accuracy checks passed with no uncaught errors                                                                |
| Full MDB 2026 display geometry audit                                               | 4,750 geometries valid with positive area; ward interior points inside declared parents; one documented ring repair |
| Final presentation, legacy bookmark and report-reference checks                    | Four targeted checks passed                                                                                         |
| Exported HTML report and printable PDF                                             | Rendered offline; screenshot visually reviewed; valid PDF generated                                                 |
| Seed-backed and database-backed HTTP routes and frontend gateway                   | Passed                                                                                                              |
| PostgreSQL migrations and repeated seed loading                                    | Passed                                                                                                              |
| All nine province and 257 municipality PostGIS geometries                          | Valid, with positive area                                                                                           |
| Country-filtered pgvector ranking                                                  | Passed with a temporary test vector; transaction rolled back                                                        |
| Production Compose configuration                                                   | Validated without starting production services                                                                      |
| Source formatting                                                                  | Passed                                                                                                              |

The checked catalogue contains 396 entities, 399 relationships, 92 sources, nine provinces, 257 unique municipality identities and 4,485 revised MDB wards, two Census datasets, two World Bank indicators, six provincial measures (54 observations) and seven dated events. Its SHA-256 revision is `8bf92dcc9685cfda6697fcd19a20e4962286e65f1fa8260f1b4732f59506603c`. Relationships include directory and contextual connections as well as ownership and operational evidence.

Browser checks cover province boundaries and overlays, compact marker clusters, infrastructure locators, responsive layouts, hierarchy attribution, dated mining ownership, relationship graphs, the four-stage electricity flow, credential-free guide actions, both Census datasets, common-year comparisons and historical observations, timeline date precision, investigation notes and restore/import/export, visual reports, directory navigation, source review and proposal validation, reload persistence, and recoverable service failures.

The canvas pass additionally checks independent native layers, reordering and opacity, Census 2011 map colours, province filtering, Ctrl-click graph selection, chart/table selection, real map panning followed by keyboard undo, density, camera preservation across modes, source-linked isolation and tracing, overlay layouts, full investigation state after export/reload, and mobile layer panels. Screenshots were reviewed to catch and correct a welcome card covering mobile controls and crowded relationship labels. A marker/popup event guard prevents record clicks from also selecting a province underneath.

The split/municipality/network milestone reran the application tests, production build, catalogue integrity checks, 14 API tests, repeated database seed and all 266 geometry validity checks. Browser tests exercise both municipality levels, source precision, statistical periods and denominators, metric-specific HTML figures, pointer and keyboard divider resizing, undo/redo, persisted ratios, directed shortest paths and mobile stacking. Province measures remain on province geometry. PDF and production Compose checks were established in the preceding milestone.

Screenshots, exported examples and the machine-readable browser report are in the ignored `test-results` directory. Test-provider responses are mocked; no paid AI calls are made by these checks.

The streets and wards milestone uses the revised official MDB 2026 source: 213 local/metro features, 52 district/metro features, 257 identities and 4,485 wards. Source DATE fields are 4 November 2026; retrieval was 13 November. The Kopanong stay and official numbering gaps are retained. One self-intersecting publisher ring (Alfred Duma Ward 5) has a pinned ST_MakeValid display repair with unchanged unique coordinates and measured geodesic area; its original is downloadable and the ward UI/report disclose the processing. Asset SHA-256 digests are checked against the release.

The new browser suite tests native ward highlighting and polygon clicks, scoped requests, sources and repair evidence, saved investigation/report output, zoom 19 reload persistence, edition/country isolation, mobile selector occlusion, split layouts and failed street/ward recovery. General regression suites and final focused map checks cover 49 browser checks. Street tiles are synthetic in automated runs, following OSM public-server policy. One ordinary Pretoria tile request was independently checked successfully during source research; road completeness and physical-device navigation accuracy are not asserted.

MapLibre is pinned to 6.1.0 to include the upstream raster retry and request-cancellation fixes reproduced by the offline tests ([release notes](https://github.com/maplibre/maplibre-gl-js/releases/tag/v6.1.0)). Mobile geographic selections keep the map accessible while choosing wards. The historical PostGIS seed remains 266 province/municipality geometries; the 4,750-feature current-edition audit uses a separate temporary table.

Four additional source-panel checks verify the MDB/historical edition citations and the active unemployment/Census references. Boundary requests are limited to four concurrent files; changing scope aborts obsolete downloads. The ward browser test deliberately stalls a province file and verifies cancellation before loading the chosen municipality.

## Reproduce

For normal development:

```powershell
npm.cmd run dev
```

Open <http://127.0.0.1:3000>. If that server was already running before these changes, stop it with Ctrl+C and restart it. The local guide and bundled catalogue work without credentials or a database.

For a production build:

```powershell
npm.cmd run build
npm.cmd start
```

For an isolated verification build while preserving the regular `.next` directory:

```powershell
npm.cmd run build:verify
npm.cmd run start:verify
```

This serves <http://127.0.0.1:3100>. Set `TEST_BASE_URL=http://127.0.0.1:3100` when running browser and smoke scripts against it.

```powershell
npm.cmd run data:check
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:api
npm.cmd run format:check
npm.cmd run test:browser
npm.cmd run test:canvas
npm.cmd run test:features
npm.cmd run test:accuracy
npm.cmd run test:sources
node scripts/smoke.mjs
```

For the optional HTTP bridge, start FastAPI on `127.0.0.1:8000` and set `KNOWLEDGE_API_URL=http://127.0.0.1:8000` on the frontend process, then run `node scripts/smoke.mjs --with-api`.

For database verification, start the project database with `docker compose -p civic-intelligence-local up -d db`, wait for it to be ready, then run `node scripts/db-check.mjs`. This applies migrations, seeds twice, verifies all catalogue counts and the release digest, checks geometry and vector ranking, and exercises database-backed FastAPI reads. It does not delete the data volume.

## Verification limits

Live AI requests and real embedding generation were deferred because credentials will be supplied later. Streaming, function calls, refusal handling, dataset retrieval, citations and action validation were checked with mocked provider responses. The local guide was exercised through the real application.

Mobile checks use an emulated touch viewport in desktop Edge. Native WebView embedding and physical devices were not tested. A Starlette/httpx deprecation warning remains in the Python test dependencies; all API tests pass.

Single, map-overlay and resizable split layouts are implemented. Live-provider planning and its expanded tool adapter remain deferred. The [canvas implementation notes](canvas-implementation.md) document geometry coverage, historical municipality vintages, network bounds and density limits.

Netlify configuration is prepared; no deployment was performed. The optional Python service requires a separate Python/container host in production. Data snapshots have explicit reporting/retrieval dates and coverage limits; verification does not make them live feeds or a comprehensive world register.

Temporary verification services were stopped after the checks. The local Docker database was stopped with its data volume retained. The existing port 3000 preview was left running.
