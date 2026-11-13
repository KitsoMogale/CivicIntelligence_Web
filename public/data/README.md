# Geography and attribution

These local assets let the application render without external tiles, fonts or map keys. They are illustrative, simplified data, not legal determinations or navigation-grade positions.

## Countries

`countries.geojson` contains 177 Natural Earth 1:110m country features. Source: [Natural Earth](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/). [Terms](https://www.naturalearthdata.com/about/terms-of-use/): public domain. Small territories may be absent. 175 features have usable country codes. Refresh through `node scripts/fetch-geography.mjs`; review the generated map and small country metadata before release.

## South African provinces

`za-provinces.geojson` contains nine simplified 2020 province boundaries. Metadata, source and licenses are in `za-provinces.metadata.json`.

Pinned source: [geoBoundaries commit 9469f09](https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/ZAF/ADM1/geoBoundaries-ZAF-ADM1_simplified.geojson). [API metadata](https://www.geoboundaries.org/api/current/gbOpen/ZAF/ADM1/).

Attribution: **geoBoundaries (CC BY 4.0); original source OCHA ROSEA / South African Municipal Demarcation Board (CC BY 3.0 IGO), 2020 boundaries. Simplified for display.**

Changes: source spelling `Nothern Cape` corrected to `Northern Cape`; source province codes/names joined to the app's normalized IDs; unneeded source attributes removed; bounding boxes and Census 2011/2022 values from Stats SA Table 2.2 added for display. Geometry remains the source's simplified geometry.

Population and change layers refer to historical Census counts. Source: [Stats SA Census 2022 statistical release](https://www.gov.za/sites/default/files/P03014_Census_2022_Statistical_Release.pdf), Table 2.2, published 10 October 2023. They are not current estimates.

## Municipality geometry

`za-municipalities-adm2.geojson` contains 52 district/metro features (44 districts, eight metros). `za-municipalities-adm3.geojson` contains 213 local/metro features (205 locals, the same eight metros): 257 unique identities. Joins use official directory codes, exact source-name crosswalks and the original HDX gazetteer. The two Emalahleni records were resolved using original official points inside their polygons. Bounding-box centres are navigation helpers, never facility coordinates.

Representative year: **2020**; original creation: **2018-12-27**; humanitarian validity: **2020-11-09**; source review: **2025-01-28**. The joined Treasury directory snapshot is **2026-10-22**. These dates do not certify current legal demarcations. Full join evidence, provenance and checksums are in `za-municipalities.metadata.json`; release hashes are also in `data/geography-assets.json`.

Sources: [geoBoundaries ADM2](https://www.geoboundaries.org/api/current/gbOpen/ZAF/ADM2/), [ADM3](https://www.geoboundaries.org/api/current/gbOpen/ZAF/ADM3/) and [OCHA ROSEA / Municipal Demarcation Board via HDX](https://data.humdata.org/dataset/cod-ab-zaf). Preserve **geoBoundaries CC BY 4.0** and **original OCHA/MDB CC BY 3.0 IGO** attribution.

Five facility facts are independently sourced from publisher pages/PDFs. Precision and sources are retained in `data/provenance/facility-locations.json`. No blanket open license is asserted over those pages or images. No capacity or current-service claims are inferred from a locator.

## Cities and other locators

`za-cities.geojson` contains 13 selected Natural Earth settlement points. `za-cities.metadata.json` identifies the pinned source and normalization. Natural Earth is public domain. Historic population and capital-class fields were not copied into the product. Mmabatho is explicitly labelled a regional Mahikeng-area locator.

Infrastructure points are stored with the knowledge entities and their operator source references. Project/fence locations are distinguished from station centres. Duvha's exact coordinate is withheld pending the verification requested by its source audit. Mining points use labelled province locators when no verified site coordinate is available. See `data/provenance/infrastructure-coordinate-notes.json`.

The map attribution and standalone report captions preserve these credits and precision limits.
