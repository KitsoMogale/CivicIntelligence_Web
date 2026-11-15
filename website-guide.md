# Civic Intelligence — Website guide

Civic Intelligence helps people learn about countries through maps, diagrams, charts and questions.

The [original product brief](docs/product-brief.md) is kept for reference. The former marketing website's guide is [archived here](docs/website-guide.legacy.md).

The [country learning guides](docs/country-learning/README.md) explain ten topics, how users can explore them and how AI can connect questions to checked facts and useful views. They say what already works and what still needs to be built.

## What users can do today

The workspace has seven views:

- **Map:** explore countries, areas and known locations.
- **Hierarchy:** see how supported organizations are arranged.
- **Relationships:** inspect documented connections.
- **System flow:** follow a simple process, such as electricity supply.
- **Data:** explore supported statistics.
- **Compare:** compare published country figures.
- **History:** explore the available dated events.

Users can combine layers, change transparency, filter items and choose how much detail to show. The same selection and map position carry across views. Changes can be undone.

Single, overlay and resizable split layouts are available. In split view, the map stays beside a graph or chart. The [map interaction guide](docs/canvas-implementation.md) explains the controls in more detail.

## Information available

The collection contains 4,238 saved items, 4,007 connections and 301 sources. Connections include links used for navigation, as well as documented real-world relationships.

There are profiles for 237 countries and areas, with 3,382 dated smaller-area map shapes across 214 country files. South Africa has the most detail: nine provinces, 43 national-directory bodies, 257 municipalities, 4,485 wards, selected businesses and facilities, two Census collections, six provincial measures and seven events.

Botswana and Namibia have initial government profiles. Many other countries have reference maps while their government information still needs to be added.

Historical World Bank population and GDP-growth comparisons cover 2014–2024 where figures were published. Read [world information and its limits](docs/world-coverage.md) for dates, sources and known problems.

Open Country structure and coverage to see what is available for the selected country. Select an area to highlight its boundary.

## Maps, facts and sources

Natural Earth supplies country boundaries. Other boundary files and location entries keep their own sources, dates and accuracy notes.

Map layers include Census population, population change, cities, public bodies and selected mines and power facilities. Some locations identify only a province or project area. Duvha's exact location is withheld while the source's requested verification is pending.

Keep different meanings clear:

- Government levels can work together without forming one command chain.
- A company connection applies to the named companies and reporting date.
- Electricity arrows can explain stages without showing real power-line routes.
- Selected historical events do not recreate a complete picture of the past.
- Census counts and World Bank population estimates are different measures.

The source's 2011 provincial counts add up to one person more than its printed national total. The app keeps the published numbers and explains the difference.

## Detailed map controls

Choose **Layout → Split canvas** to keep the map beside another view. Drag the divider or use the keyboard to resize it. The layout is saved and can be undone.

Use **Layers → Municipal boundaries** for South Africa's local/metro and district/metro areas. The default uses the published MDB 2026 boundaries. The older 2020 version remains available separately.

For wards, turn on Ward boundaries, choose a local municipality or metro, then click a ward or use Focus ward. OpenStreetMap supplies online roads and street names through zoom 19.

Choose **Layers → Basemap → Satellite · 2016 overview** for real images of land, fields and built-up areas. This key-free view has about 10 m ground detail and shows its 2016 image year. It is not live and cannot promise clear views of individual buildings. A separate map key enables the detailed satellite option. See [satellite view](docs/satellite-view.md) for setup and sources. Switching basemaps preserves your map position and selection.

**Explore network** follows documented connections over several steps or finds a shortest saved path. Users can filter by arrow direction, connection type and reporting date. Navigation links are optional.

Provincial figures include unemployment, the share of working-age people in work, real GDP growth, adult education and medical-aid coverage. Legends and reports show what was measured, when, for whom and by which source.

Ward files keep official IDs and numbering gaps. The revised source keeps Kopanong at nine wards after the planned split was stayed. Source date fields say 4 November 2026; the files were collected on 13 November.

One faulty boundary shape in Alfred Duma Ward 5 has a documented display repair that keeps the measured area unchanged. The original can still be downloaded. Choosing a boundary version does not change the dates or detail of the statistics.

## Keeping the map clear

The map opens without welcome, shared-selection or permanent entity name cards. City and facility dots remain selectable. Details and sources open in the closable Details sidebar.

Ward controls, legends and error panels have an X to close and a small button to reopen. Closing them keeps the layers, selected item and map position. Escape can close a focused panel. An overlay's X returns to Map. Required map credits remain available.

## Saved work and source review

Saved investigations keep the view settings, selection, filters and notes. They can be exported and imported; older bookmarks are updated when loaded.

Reports contain maps or diagrams, tables, notes and sources. They can be printed to PDF.

The directory separates former municipality codes. Source review saves notes on the current device and checks the format of proposed updates. Applying information still goes through the project's review process, with backups and saved versions. The public review page does not write directly to the database.

## Software and hosting

The website uses Next.js, TypeScript, Tailwind, Zustand, MapLibre, React Flow, Cytoscape and ECharts.

It works with bundled checked information, without a database or AI key. The optional Python service uses FastAPI and PostgreSQL, with PostGIS for map data and pgvector for searching by meaning. SQLAlchemy and Alembic manage its database access and changes.

Netlify hosting is planned for the website. The optional Python service and database need a separate host. AI connection code is present, but live AI keys and full AI coordination remain planned for later. Nothing has been deployed.

## Run and maintain

See [README.md](README.md) for startup commands and checks, [data maintenance](docs/data-maintenance.md) for checking and updating information, [production setup](docs/production.md) for hosting, and [local verification](docs/local-verification.md) for recorded checks.
