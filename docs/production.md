# Production preparation for Netlify

The project remains local. These steps prepare a release; no site or infrastructure has been published.

## Frontend

Netlify uses the committed build command:

```text
npm run data:check && npm test && npm run build
```

Publish directory: `.next`. Node: 22. Netlify detects Next.js and supplies its adapter; see [Netlify's Next.js setup guide](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/). Do not add the old Vite SPA redirect or run a static export: server API routes are part of this app.

The reviewed seed and local guide work without AI credentials or a Python service. First validate the site in a Netlify deploy preview. Confirm map assets, dynamic APIs, downloads, legal pages, directory and source-review routes before making the production release.

Configure `APP_ORIGIN` to the deployed HTTPS origin without a trailing slash. Set `KNOWLEDGE_API_URL` only if the separately hosted FastAPI service is in use. These are server-side settings. No paid-AI configuration is required for this milestone.

Satellite overview works without a map key using the EOxCloudless 2016 mosaic. For detailed imagery, optionally set `NEXT_PUBLIC_MAPTILER_KEY` before the build. This is a public browser key, separate from private server credentials; restrict its allowed origins with MapTiler. Rebuild after changing it. See [satellite setup and image limits](satellite-view.md).

## Optional knowledge service

Netlify does not host the persistent FastAPI/PostgreSQL service. Use a separate container/Python host and PostgreSQL with PostGIS and pgvector, or run the included production Compose configuration on an appropriate host.

`compose.production.yaml` requires a non-default database password, database URL and site origin. Its database has no public port mapping and uses a separate production volume. The API binds to loopback for a host reverse proxy. Terminate HTTPS at the host proxy and expose only the intended API endpoint.

Deploy the same repository release to both services. Apply Alembic migrations and the reviewed seed before sending traffic. The seed records the catalogue digest. For larger installations, separate the migration credentials from the API's read-only database credentials and run migrations as a release job.

The API image runs as a non-root user, installs the locked Python dependencies, and has a readiness health check. The default production Compose startup applies migrations and seed, so it needs a database role with those permissions. A read-only runtime role requires performing the release job separately and starting Uvicorn directly.

## Monitoring

- `GET /api/health`: lightweight frontend liveness, version, catalogue digest and resource counts.
- `GET /api/health?deep=1`: checks the configured knowledge service and matching release, returning 503 when unavailable or mismatched. With no external service, the reviewed seed is ready.
- `GET /health`: backend liveness.
- `GET /health/ready`: database reachability, loaded catalogue and applied release.

Point the host's health probe or an external uptime monitor at the readiness endpoint. No external monitoring account has been connected.

Next.js instrumentation emits structured server-error events without request bodies or credentials. FastAPI emits request IDs and structured status/duration events for errors, slow requests, or all requests when `LOG_REQUESTS=1`. These structured events omit request bodies, query strings and authorization headers. Configure host and server access logs separately.

## Release checks

```powershell
npm.cmd run data:check
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:api
npm.cmd run build
npm.cmd run test:browser
node scripts/smoke.mjs --with-api
node scripts/db-check.mjs
```

Start the corresponding frontend, FastAPI and local database before their integration checks. Browser/smoke scripts accept `TEST_BASE_URL` for isolated local previews.

Smoke-test reports and investigation imports in the target browser. Confirm response headers, all nine province geometries, comparison-year consistency and the database digest. Inspect the source register for stale references and unresolved evidence notes.

## Persistence and rollback

Keep managed PostgreSQL backups or scheduled database dumps and verify restores in an isolated database. Preserve the previous frontend build and catalogue revision for rollback. A source-level bundle backup is not a database backup.

Investigations and review decisions are stored on each user's device. Their exported JSON files provide portability, not a hosted account or cloud backup. Static HTML reports include their evidence and work offline.

## Deferred

Live-provider AI testing, embedding generation, credential configuration and paid-AI shared rate limiting remain deferred. Account-based synchronization, collaborative editing, a globally comprehensive knowledge register, 3D and simulation are outside this milestone. Physical-device WebView testing remains separate from responsive browser checks.
