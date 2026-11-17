# Canvas and map interaction implementation

The app now has a [topic-independent teaching canvas](ai-teaching-canvas.md), controlled by users and a FastAPI AI teacher using `gpt-6-luna`. Its shared commands create and update maps, diagrams, graphs, charts, timelines, panels and notes. The detailed reference map workspace described below keeps its exploration store and validated action reducer.

## Available controls

- **Layers:** eleven registered layers span the five architectural families: country/province/municipal/ward geography, provincial statistics, cities/institutions/mining/stations, documented connections, and selection/evidence. Visibility, opacity, order and per-entity-layer search are independent. Point symbols, polygons and connection lines use native MapLibre layers; accessible HTML controls provide marker labels and cluster menus.
- **Statistics:** Census 2011 or 2022 provincial counts, or 2011–2022 change. The map and exported geographic figure use the selected census year. Six additional sourced province metrics retain their own periods and denominators.
- **Scope and density:** camera zoom determines world, country, region or city scope. Overview, regional and detailed density remain separate choices. Marker budgets are 12, 60/120 and 250 respectively, with viewport culling and clustering. No markers appear at world scope. Province geometry loads when South Africa is selected and appears from zoom 3.
- **Shared context:** map camera (including bearing/pitch), province, selection, isolation, relationship highlights, filters and evidence dates persist across renderer changes. Ctrl/Shift-click map markers or graph nodes to add to a selection. Trace connections highlights documented one-hop neighbors; it does not infer dependencies.
- **Chart selection:** Census charts highlight selected province records. Their accessible table buttons update the same selection without changing the saved map camera.
- **Layouts:** single view, map plus a floating graph/chart/hierarchy overlay, and a resizable split canvas. The split divider supports pointer, touch and keyboard interaction, 25–75% bounds, one undo entry per drag, and a saved ratio. Panels stack vertically on mobile. Selection and camera remain shared.
- **History:** Back/Forward, Undo/Redo in the History menu, and Ctrl+Z / Ctrl+Shift+Z outside editable controls. Validated action batches form one undo step. Expansion and completed camera gestures are reversible; identical camera events do not add history. History is bounded to 40 steps in the current session.
- **Investigations:** save/import/export includes camera, all layer settings, layout, density, selections and filters. Earlier bookmark and exploration formats migrate to the registered layers. Ward identifier, parent, boundary edition and basemap persist with the camera. Historical investigations retain their original edition. Knowledge exports include canvas context without transient undo history or store methods.

## Evidence and coverage

Dashed geographical connections link published endpoint locators and are explicitly abstract. No road, rail, pipeline or transmission route is generated. Links with missing or province-only coordinates are not drawn as precise spatial connections. Source references and coordinate-precision notes remain available on selected records.

Evidence-period filtering uses reporting dates as snapshots or recorded validity intervals. Undated connections are omitted when a period is active. This is not a reconstruction of the complete historical graph. Census layers retain their independently selected census period.

Country/province reference geometry remains simplified and historical. The default MDB 2026 edition contains 257 municipality identities across 213 local/metro and 52 district/metro features, and 4,485 ward features. Full WGS84 coordinates load by selected province/municipality; wards load only for one selected local municipality/metro. One known ring defect is documented and repaired without changing unique coordinates or measured area; its original is downloadable. Historical 2020 municipality geometry remains separately selectable. OpenStreetMap supplies online raster roads/labels through zoom 19 with visible attribution, browser caching and a reference-map fallback. No route or traffic data is inferred. Province-only marker proxies are omitted from zoom 9.

## Documented networks and provincial measures

Breadth-first traversal finds bounded neighborhoods or a shortest recorded path, with one to six steps, direction, type and reporting-date filters. Search is capped at 150 nodes / 200 edges. Directory and sector-navigation links are excluded unless enabled. Original arrow semantics and source dates remain visible; reverse traversal is labeled. Cross-country records are rejected. An active trace exports its actual records and edges.

Six provincial measures supplement Census population/change. Each has nine observations, periods, units, denominators, methods and caveats. Legends use equal intervals over the available province values; missing values are grey and negative values are retained. Provincial measures never become municipality estimates. Exports preserve definitions and attribution. Nine- and ten-layer saved investigations migrate to eleven layers while preserving existing styling and order.

MapLibre 6 uses a versioned, same-origin module worker and its shared module. The npm development/build hooks prepare these files from the installed package; generated files are ignored by Git. Keep the dependency version and `lib/map-runtime.ts` worker URL in sync. The worker preparation checks this match and preserves the upstream license. Automated browser suites use synthetic OSM tiles.

The registry is closed to known layer IDs. Arbitrary remote layers, executable actions and unsupported layouts are rejected. Live AI planning and the provider's expanded canvas-tool adapter remain deferred with credentials. No deployment is performed by this work.

## Verification

Run the application tests with `npm.cmd test`. With the isolated production preview running on port 3100, run `npm.cmd run test:accuracy; npm.cmd run test:canvas`; the existing broader regression script is `npm.cmd run test:browser` (set `TEST_BASE_URL` when using port 3100).

Browser reports and screenshots are written under ignored `test-results/`. See [local verification](local-verification.md) for observed results and [README](../README.md) for startup commands.
