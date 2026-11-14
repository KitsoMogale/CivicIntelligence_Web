# Country profiles and world reference geography

The map registry contains 237 countries and areas from Natural Earth v5.1.2. These are provider/application codes and a de facto reference worldview, not a statement about recognition or legal borders. Uncoded disputed features retain their publisher identifiers. Australia combines its multiple map features without overwriting the country record.

Every registered country has a profile with capabilities, sources, administrative terminology and coverage status. South Africa retains the existing detailed provincial, municipal, ward and statistical implementation. Botswana and Namibia add initial sourced national institutions and separate administrative, electoral and traditional schemes. Other countries currently have geographic reference directories; their current government institutions have not been curated.

## Boundary coverage

214 countries/areas have 3,382 first-level reference polygons. Most use geoBoundaries gbOpen ADM1, with the publisher's original properties, simplification, source year and licence retained. Natural Earth divisions provide an explicitly labelled fallback. These polygons do not imply a current legal structure or automatically supply local councils, municipalities, wards or statistical values. Countries without reviewed subnational geometry still have a country map and an explicit coverage note.

The source audit in `data/world-source-audit.json` records exclusions and count exceptions. The gbOpen Namibia file was excluded because its roster contains historical regions and an Angolan feature. Its replacement is the 14-region gbHumanitarian/NSA/HDX reference dataset under CC BY 3.0 IGO. Its publisher metadata says 2011 despite containing names introduced in 2013; this conflict is shown in the profile and reports. It is not presented as a verified 2026 boundary edition. The original Karas property remains intact, with the display alias //Kharas.

Botswana's ten 2017 reference districts are distinct from its current local authority, census and electoral schemes. Namibia's regional constituencies and municipal/town/village local authorities are separate schemes. Traditional authorities are described separately in both countries.

Each dataset has its own licence, including ODbL and share-alike terms. Consult `public/data/world/LICENSES.json`, the per-country source record and its original licence link before redistribution. Natural Earth is public domain. Required attribution remains on the map.

## Comparisons

World Bank population and GDP growth observations cover 2014–2024 for mapped economies where published. Regional aggregates are excluded. Null values stay null, and comparisons use a common year. Retrieval date (14 November 2026) does not change the observation year or make these live values.

## Reproduce and validate

Source metadata, exact World Bank snapshots and download checksums are committed under `data/provenance`. Geometry downloads are pinned to specific upstream commits. No API credential is required.

```sh
node scripts/fetch-world.mjs
node scripts/import-world.mjs
npm run data:release
npm run data:check
npm test
npm run test:api
npm run build:verify
```

Downloads are cached in ignored `.research/world`; the fetcher checks existing inputs before downloading. It uses four concurrent source requests and never requests map tiles. The importer checks input hashes, coordinate ranges, source identifiers and publisher counts before generating profiles, country files and area files. Data review checks asset digests, entity joins, profile coverage and retained snapshot hashes.

`scripts/audit-world-geometry.py` provides a separate Shapely topology audit. All 3,382 reference polygons passed with no invalid or empty geometries in the initial batch. No additional local simplification or geometry repair was applied.

## Local interface checks

Start the isolated production preview with `npm run start:verify` after building, then run `node scripts/country-browser-test.mjs`. Browser tests mock street tiles to avoid automated public tile traffic. The regular canvas and accuracy suites cover the existing South African implementation.

Country structure and coverage opens on demand. Reference polygons can be focused through the area selector or a map click. Entity dots retain accessible names and click selection; permanent name cards and hover name cards have been removed, including power stations. Cluster counts remain visible.
