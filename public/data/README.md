# Geography and attribution

Bundled reference assets render without external tiles, fonts or map keys. The street basemap uses online OpenStreetMap tiles. Reference country/province geometry is simplified; MDB 2026 municipal/ward coordinates are unsimplified. Source editions are shown explicitly.

## Countries

`countries.geojson` contains 177 Natural Earth 1:110m country features. Source: [Natural Earth](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/). [Terms](https://www.naturalearthdata.com/about/terms-of-use/): public domain. Small territories may be absent. 175 features have usable country codes. Refresh through `node scripts/fetch-geography.mjs`; review the generated map and small country metadata before release.

## South African provinces

`za-provinces.geojson` contains nine simplified 2020 province boundaries. Metadata, source and licenses are in `za-provinces.metadata.json`.

Pinned source: [geoBoundaries commit 9469f09](https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/ZAF/ADM1/geoBoundaries-ZAF-ADM1_simplified.geojson). [API metadata](https://www.geoboundaries.org/api/current/gbOpen/ZAF/ADM1/).

Attribution: **geoBoundaries (CC BY 4.0); original source OCHA ROSEA / South African Municipal Demarcation Board (CC BY 3.0 IGO), 2020 boundaries. Simplified for display.**

Changes: source spelling `Nothern Cape` corrected to `Northern Cape`; source province codes/names joined to the app's normalized IDs; unneeded source attributes removed; bounding boxes and Census 2011/2022 values from Stats SA Table 2.2 added for display. Geometry remains the source's simplified geometry.

Population and change layers refer to historical Census counts. Source: [Stats SA Census 2022 statistical release](https://www.gov.za/sites/default/files/P03014_Census_2022_Statistical_Release.pdf), Table 2.2, published 10 October 2023. They are not current estimates.

## MDB 2026 municipalities and wards

`za-municipalities-2026/local/` contains 213 local/metro files; `district/` contains 52 district/metro files (257 identities). `za-wards-2026/` contains 4,485 wards across 213 local/metro files from the revised September release. [MDB local source](https://www.arcgis.com/home/item.html?id=82c7a6d178454ddcb4dc1ef6bf2a4303), [district source](https://www.arcgis.com/home/item.html?id=ffd2fc85aec74f5594c670e6def67787), [revised ward source](https://www.arcgis.com/home/item.html?id=30b6e281a5074eddbf1a3f82aa00459e). Retrieved 13 November 2026; publisher DATE fields are 4 November 2026 and are not retrieval timestamps.

Attribution: **Municipal Demarcation Board; Civic Intelligence derived GeoJSON export, split by municipality.** Preserve publisher custom terms in `data/provenance/mdb-2026.json`; these are not CC0/CC BY. Full coordinates, source attributes and numbering gaps are retained. Navigation points and bounds are derived. No geometry simplification or invented ward numbers.

Publisher Ward 52308005 (Alfred Duma Ward 5) contains a ring self-intersection. Its display geometry uses PostGIS ST_MakeValid with all 163 unique coordinate pairs and measured geodesic area unchanged. The original feature is retained in `za-ward-original/52308005.geojson`; hashes, method and output are in `data/provenance/mdb-geometry-repairs.json`. The UI and reports identify the repair. All 4,750 display features undergo an independent PostGIS validity/area/parent audit.

The revised Kopanong dataset uses FS162 with nine wards and no proposed FS164 split, consistent with the [IEC court-stay statement](https://www.elections.org.za/pw/News-And-Media/News-List/News/News-Article/Electoral-Commission-publishes-the-2026-LGE-Election-Timetable?a=AISDGvpz75ps1usOfX7oilaW%2B%2F86AfW3IllIjMkcvPs%3D).

## Online streets

Roads and street labels come from [OpenStreetMap contributors](https://www.openstreetmap.org/copyright). The raster layer supports zoom 19 and follows the [public tile policy](https://operations.osmfoundation.org/policies/tiles/): visible credit, ordinary viewport requests, browser caching and normal referrers. No offline tile export, automated public-server panning/zooming, bulk download or prefetch. Browser tests use synthetic tiles. An unavailable service falls back to reference geography. Road completeness, routing and traffic are not asserted.

## Historical municipality geometry

`za-municipalities-adm2.geojson` contains 52 district/metro features (44 districts, eight metros). `za-municipalities-adm3.geojson` contains 213 local/metro features (205 locals, the same eight metros): 257 unique identities. Joins use official directory codes, exact source-name crosswalks and the original HDX gazetteer. The two Emalahleni records were resolved using original official points inside their polygons. Bounding-box centres are navigation helpers, never facility coordinates.

Representative year: **2020**; original creation: **2018-12-27**; humanitarian validity: **2020-11-09**; source review: **2025-01-28**. The joined Treasury directory snapshot is **2026-10-22**. These dates do not certify current legal demarcations. Full join evidence, provenance and checksums are in `za-municipalities.metadata.json`; release hashes are also in `data/geography-assets.json`.

Sources: [geoBoundaries ADM2](https://www.geoboundaries.org/api/current/gbOpen/ZAF/ADM2/), [ADM3](https://www.geoboundaries.org/api/current/gbOpen/ZAF/ADM3/) and [OCHA ROSEA / Municipal Demarcation Board via HDX](https://data.humdata.org/dataset/cod-ab-zaf). Preserve **geoBoundaries CC BY 4.0** and **original OCHA/MDB CC BY 3.0 IGO** attribution.

Five facility facts are independently sourced from publisher pages/PDFs. Precision and sources are retained in `data/provenance/facility-locations.json`. No blanket open license is asserted over those pages or images. No capacity or current-service claims are inferred from a locator.

## Cities and other locators

`za-cities.geojson` contains 13 selected Natural Earth settlement points. `za-cities.metadata.json` identifies the pinned source and normalization. Natural Earth is public domain. Historic population and capital-class fields were not copied into the product. Mmabatho is explicitly labelled a regional Mahikeng-area locator.

Infrastructure points are stored with the knowledge entities and their operator source references. Project/fence locations are distinguished from station centres. Duvha's exact coordinate is withheld pending the verification requested by its source audit. Mining points use labelled province locators when no verified site coordinate is available. See `data/provenance/infrastructure-coordinate-notes.json`.

The map attribution and standalone report captions preserve these credits and precision limits.
