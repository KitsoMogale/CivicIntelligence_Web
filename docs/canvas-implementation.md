# Canvas and map interaction implementation

The interaction architecture is implemented as a shared exploration store with a validated action reducer. AI credentials remain deferred. Manual controls use the same action types that a future controller can dispatch.

## Available controls

- **Layers:** nine registered layers span the five architectural families: country/province geography, Census statistics, cities/institutions/mining/stations, documented connections, and selection/evidence. Visibility, opacity, order and per-entity-layer search are independent. Point symbols, polygons and connection lines use native MapLibre layers; accessible HTML controls provide marker labels and cluster menus.
- **Statistics:** Census 2011 or 2022 provincial counts, or 2011–2022 change. The map and exported geographic figure use the selected census year. Other metrics require additional sourced datasets.
- **Scope and density:** camera zoom determines world, country, region or city scope. Overview, regional and detailed density remain separate choices. Marker budgets are 12, 60/120 and 250 respectively, with viewport culling and clustering. No markers appear at world scope. Province geometry loads when South Africa is selected and appears from zoom 3.
- **Shared context:** map camera (including bearing/pitch), province, selection, isolation, relationship highlights, filters and evidence dates persist across renderer changes. Ctrl/Shift-click map markers or graph nodes to add to a selection. Trace connections highlights documented one-hop neighbors; it does not infer dependencies.
- **Chart selection:** Census charts highlight selected province records. Their accessible table buttons update the same selection without changing the saved map camera.
- **Layouts:** single view and map plus a floating graph/chart/hierarchy overlay. On mobile the overlay moves below the map controls. Split view remains a later phase, as specified in the architecture.
- **History:** Back/Forward, Undo/Redo in the History menu, and Ctrl+Z / Ctrl+Shift+Z outside editable controls. Validated action batches form one undo step. Expansion and completed camera gestures are reversible; identical camera events do not add history. History is bounded to 40 steps in the current session.
- **Investigations:** save/import/export includes camera, all layer settings, layout, density, selections and filters. Earlier bookmark and exploration formats migrate to the registered layers. Knowledge exports include canvas context without transient undo history or store methods.

## Evidence and coverage

Dashed geographical connections link published endpoint locators and are explicitly abstract. No road, rail, pipeline or transmission route is generated. Links with missing or province-only coordinates are not drawn as precise spatial connections. Source references and coordinate-precision notes remain available on selected records.

Evidence-period filtering uses reporting dates as snapshots or recorded validity intervals. Undated connections are omitted when a period is active. This is not a reconstruction of the complete historical graph. Census layers retain their independently selected census period.

Country and province boundaries are simplified bundled geometry. Municipalities are available as sourced directory/hierarchy records; this release does not contain verified municipality polygons or individual facility positions for every record. Increasing density cannot create those missing data. The bundled geography has two available levels, country and province; a higher-resolution tile service is not configured.

The registry is closed to known layer IDs. Arbitrary remote layers, executable actions and unsupported layouts are rejected. Live AI planning and the provider's expanded canvas-tool adapter remain deferred with credentials. No deployment is performed by this work.

## Verification

Run the application tests with `npm.cmd test`. With the isolated production preview running on port 3100, run `npm.cmd run test:canvas`; the existing broader regression script is `npm.cmd run test:browser` (set `TEST_BASE_URL` when using port 3100).

Browser reports and screenshots are written under ignored `test-results/`. See [local verification](local-verification.md) for observed results and [README](../README.md) for startup commands.
