# Civic Intelligence

An app for learning about countries through maps, diagrams, charts and questions. It can run locally using its checked information. AI keys and deployment are planned for later.

The website uses Next.js, MapLibre, React Flow, Cytoscape and ECharts. A separate Python service and database are optional.

## Open locally on Windows

The required packages and a local Python environment have already been installed in this checkout.

```powershell
npm.cmd run dev
```

Open http://127.0.0.1:3000 and keep the terminal running. To restart the preview, stop it with Ctrl+C and run the command again.

For a production preview, stop the development server, then run:

```powershell
npm.cmd run build
npm.cmd start
```

A fresh checkout needs npm.cmd ci first. Use Node 22 or later. Basic use needs no AI key, database or map token. Online street detail comes from OpenStreetMap; bundled reference maps can work without internet access.

For real satellite images, choose **Layers → Basemap → Satellite · 2016 overview**. This key-free view shows land and built-up areas at about 10 m ground detail. Sharper MapTiler imagery can be enabled with a separate map key. See [satellite view and setup](docs/satellite-view.md) for image dates, detail limits and instructions.

## What to explore

- **Map:** online roads and street names, zoom through level 19, and South African municipality/ward boundaries. Turn on Ward boundaries, choose a province and local municipality/metro, then click a ward or use Focus ward. The published 2026 collection has 4,485 wards and 257 municipality IDs; older 2020 maps remain separate.
- **Split canvas:** choose Layout → Split canvas to keep the map beside a graph or chart. Drag the divider or use its arrow keys. Views stack on phones. Selection, map position and undo work across the views.
- **Networks:** Explore network follows one to six steps or finds a shortest documented path. Filter by arrow direction, connection type and reporting date. Navigation links are optional. Reading a path backwards does not reverse the meaning of ownership.
- **Provincial statistics:** use Layers for unemployment and the share of working-age people in work (Q3 2026), real GDP growth (2025), adult education (2022, ages 20+) and medical-aid coverage (2025). Census population and change are also available. The app keeps source definitions and does not invent municipality figures from province totals.
- **View controls:** combine layers, change their order and transparency, and choose Census 2011 or 2022. Choose the amount of detail separately from zoom. Selection, filters and map position stay with you. See [map controls](docs/canvas-implementation.md).
- **Hierarchy / Relationships:** explore government bodies, 43 national-directory bodies, 257 municipalities and three mining groups with eight operations. Select a connection to inspect its source and date.
- **System flow:** follow the four main stages of electricity supply. This explains a process; it is separate from the facility list.
- **Data:** explore Census 2011/2022 provincial counts through charts and tables.
- **Compare:** compare published country population and GDP-growth figures for 2014–2024. Missing figures stay unavailable.
- **History:** browse the available sourced events by year or selected item.
- **Investigations:** save the view, selected items, open diagram sections, filters and notes. Export or import them between browsers.
- **Reports:** download a report with maps or diagrams, figures, notes and sources. Open it in a browser and use Print to save a PDF.
- **Directory:** [open the local directory](http://127.0.0.1:3000/directory) for national bodies and municipalities. Former municipal codes are listed separately.
- **Source review:** [open the local review page](http://127.0.0.1:3000/review) to check proposed information and save review notes on this device.

Date filters leave out connections with no date. They do not recreate a complete historical network.

## Optional Python service and database

The website can use its bundled information on its own. To try the Python service:

```powershell
node scripts/bootstrap-python.mjs
npm.cmd run dev:api
```

Set KNOWLEDGE_API_URL=http://127.0.0.1:8000 in a server-only .env.local and restart Next.js. The browser's information and the database must use the same checked version.

For the separate local database:

```powershell
docker compose -p civic-intelligence-local up -d db
node scripts/db-check.mjs
```

The database listens only on this computer, at port 55432. The check applies database changes, loads the checked information twice and checks map support, searching by meaning, saved versions and reading information.

Loading information updates known entries without deleting unrelated ones. Stopping the database container keeps its stored data.

## Checks

```powershell
npm.cmd run data:check
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:api
npm.cmd run build
npm.cmd run test:browser
npm.cmd run test:accuracy
node scripts/smoke.mjs
```

Browser checks use Microsoft Edge through playwright-core. They use test street tiles instead of sending automated requests to the public map service. Set BROWSER_EXECUTABLE for another browser path and TEST_BASE_URL for another local address. Screenshots and results go into the ignored test-results folder.

Run `node scripts/satellite-browser-test.mjs` against a local preview for satellite switching, saved views, zoom limits, mobile credits and image-failure recovery. It uses test imagery tiles so checks do not generate traffic to the public image service.

With a MapTiler browser key configured, `node scripts/maptiler-browser-test.mjs` checks detailed imagery with simulated responses. Add `--live` only for a small real-service check over Cape Town, which uses the account's tile allowance. See [satellite checks](docs/satellite-view.md#checking-the-connection-locally).

To check a separate production preview while port 3000 is in use:

```powershell
npm.cmd run build:verify
npm.cmd run start:verify
```

This uses .next-verify and http://127.0.0.1:3100, separately from the normal build. Point browser and smoke checks at that address.

## Information and updates

The collection has **4,238 items, 4,007 connections, 301 sources, 237 country/area profiles, 3,382 smaller world reference areas, nine South African provinces, 257 municipality IDs and 4,485 wards**.

It also includes two Census collections, two World Bank measures, six provincial measures with 54 values and seven dated events. Connection counts include links used for navigation.

See [data maintenance](docs/data-maintenance.md), [hosting setup](docs/production.md), [recorded local checks](docs/local-verification.md) and the [product brief](docs/product-brief.md). The data/release.json file identifies the checked information version so the app can detect a database using a different version.

## Netlify

The netlify.toml file runs data checks and tests before building. Netlify's Next.js support serves the website and its Node routes. The optional Python service and database need a separate host. Setup and health checks are prepared; nothing has been deployed.

## Important limits

South Africa has the most government detail. Botswana and Namibia have initial profiles. Other countries show their dated maps and what government information is still missing. Historical country comparisons use published World Bank figures where available.

Mining and power facilities are checked examples, not complete national lists. Company links keep the exact companies and reporting dates. Current leaders, interest rates, facility output and forecasts are not invented.

Census counts and World Bank population estimates are different measures. The published 2011 province counts total one person more than the printed national total; the app keeps the source's numbers.

Country and province reference maps are simplified. The published MDB municipality and ward coordinates are kept in full, apart from a documented repair to a faulty shape in Alfred Duma Ward 5. The original is retained. See [map data](public/data/README.md).

Some city, project and facility points are approximate. Mining locations and Duvha use province-level markers where exact positions are unverified. Details explain the accuracy, sources and reuse terms.

Saved investigations and review notes stay in the current browser. Accounts, cloud syncing, collaboration, simulations and 3D views are not built. Proposed information updates go through project review; the public page does not write directly to the database.

The labelled local guide works now. Live AI and tools for searching by meaning can be connected later. Keep server keys out of NEXT_PUBLIC_ settings and exported reports.

## World country information

Profiles cover 237 countries and areas, with dated maps, initial Botswana/Namibia government information and historical country comparisons. See [what is available, its sources and how to rebuild it](docs/world-coverage.md).

## Country learning guides

The [learning guides](docs/country-learning/README.md) explain ten topics, what users can learn and how clicks, questions and views can help. They also explain AI's role, the work needed and which features already exist.
