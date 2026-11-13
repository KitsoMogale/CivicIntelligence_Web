# Local verification — 13 November 2026

The application was checked locally using Node 22, Next.js 16, a workspace-local Python 3.12 environment, Microsoft Edge, and Docker PostgreSQL with PostGIS and pgvector. The production frontend used an isolated `.next-verify` build on port 3100, leaving the existing port 3000 development server alone.

| Check | Result |
| --- | --- |
| Production build, TypeScript and static page generation | Passed |
| Application logic, data integrity, agent and canvas contracts | 41 tests passed |
| FastAPI validation, catalogue, retrieval and embedding contracts | 11 tests passed |
| Desktop and mobile browser workflows | 22 checks passed; no uncaught page errors or hidden-attribution warnings |
| Canvas layer, selection, overlay, camera and mobile workflows | Nine focused checks passed; no browser or map-layer errors |
| Final presentation, legacy bookmark and report-reference checks | Four targeted checks passed |
| Exported HTML report and printable PDF | Rendered offline; screenshot visually reviewed; valid PDF generated |
| Seed-backed and database-backed HTTP routes and frontend gateway | Passed |
| PostgreSQL migrations and repeated seed loading | Passed |
| All nine PostGIS province geometries | Valid, with positive area |
| Country-filtered pgvector ranking | Passed with a temporary test vector; transaction rolled back |
| Production Compose configuration | Validated without starting production services |
| Source formatting | Passed |

The checked catalogue contains 390 entities, 393 relationships, 79 sources, nine provinces, two Census datasets, two World Bank indicators and seven dated events. Its SHA-256 revision is `4aac40a1d4bd7efd9a7d15ae603a301b5d8de56837a2f8e0566edecd15248e99`. Relationships include directory and contextual connections as well as ownership and operational evidence.

Browser checks cover province boundaries and overlays, compact marker clusters, infrastructure locators, responsive layouts, hierarchy attribution, dated mining ownership, relationship graphs, the four-stage electricity flow, credential-free guide actions, both Census datasets, common-year comparisons and historical observations, timeline date precision, investigation notes and restore/import/export, visual reports, directory navigation, source review and proposal validation, reload persistence, and recoverable service failures.

The canvas pass additionally checks independent native layers, reordering and opacity, Census 2011 map colours, province filtering, Ctrl-click graph selection, chart/table selection, real map panning followed by keyboard undo, density, camera preservation across modes, source-linked isolation and tracing, overlay layouts, full investigation state after export/reload, and mobile layer panels. Screenshots were reviewed to catch and correct a welcome card covering mobile controls and crowded relationship labels. A marker/popup event guard prevents record clicks from also selecting a province underneath.

The API, database, Compose and PDF results above were established in the preceding data milestone; those backend components are unchanged by this canvas work. The frontend build, application tests, catalogue check and browser workflows were rerun for the canvas implementation.

Screenshots, exported examples and the machine-readable browser report are in the ignored `test-results` directory. Test-provider responses are mocked; no paid AI calls are made by these checks.

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
node scripts/smoke.mjs
```

For the optional HTTP bridge, start FastAPI on `127.0.0.1:8000` and set `KNOWLEDGE_API_URL=http://127.0.0.1:8000` on the frontend process, then run `node scripts/smoke.mjs --with-api`.

For database verification, start the project database with `docker compose -p civic-intelligence-local up -d db`, wait for it to be ready, then run `node scripts/db-check.mjs`. This applies migrations, seeds twice, verifies all catalogue counts and the release digest, checks geometry and vector ranking, and exercises database-backed FastAPI reads. It does not delete the data volume.

## Verification limits

Live AI requests and real embedding generation were deferred because credentials will be supplied later. Streaming, function calls, refusal handling, dataset retrieval, citations and action validation were checked with mocked provider responses. The local guide was exercised through the real application.

Mobile checks use an emulated touch viewport in desktop Edge. Native WebView embedding and physical devices were not tested. A Starlette/httpx deprecation warning remains in the Python test dependencies; all API tests pass.

Single and map-overlay layouts are implemented. Split view, live-provider planning and its expanded tool adapter remain deferred. The [canvas implementation notes](canvas-implementation.md) document geometry coverage and density limits.

Netlify configuration is prepared; no deployment was performed. The optional Python service requires a separate Python/container host in production. Data snapshots have explicit reporting/retrieval dates and coverage limits; verification does not make them live feeds or a comprehensive world register.

Temporary verification services were stopped after the checks. The local Docker database was stopped with its data volume retained. The existing port 3000 preview was left running.
