# Curating and releasing knowledge

The application uses a reviewed, versioned catalogue. A source citation records evidence for a claim; it is not a guarantee that the claim remains current.

## Source register

- `data/knowledge.json`: sources, entities, typed relationships and Census datasets.
- `data/regions.json`: nine provinces and joins to entity IDs.
- `data/municipal-geography.json`: 257 unique municipality joins and historical geometry navigation bounds.
- `data/geography-assets.json`: source vintage, feature counts and SHA-256 hashes for the two public municipality files.
- `data/provincial-indicators.json`: six provincial measures / 54 observations, definitions, periods, denominators and caveats.

The release digest covers seven JSON files. Geometry asset hashes bind the public municipality files to that release. Preserve the original geometry licenses and historical vintage. Education rates use adults **20+**, not 25+. Medical-aid coverage measures financial coverage, not facility capacity or care quality. Table transcription and calculation evidence is retained in `data/provenance/provincial-indicator-evidence.md`. Stats SA reuse terms require attribution and disclosure of independent processing; they are not described as Creative Commons.

The database seed stores nine province and 257 municipality geometries, plus eight indicator records (two national series and six province overlays). `node scripts/db-check.mjs` applies the seed twice and verifies valid positive-area geometry against the isolated development database.
- `data/indicators.json`: normalized World Bank observations, preserving source precision and missing values.
- `data/events.json`: sourced dates; year-only events retain year precision.
- `data/provenance/`: original Treasury directory/change history, national directory metadata, Census table transcription, raw WDI responses, mining editorial notes and operator coordinate provenance.
- `public/data/`: country/province/city geography with separate metadata and license notes.
- `data/release.json`: a digest of the four catalogue files, record counts and release version.

Dates distinguish retrieval, publication and ownership/operating reporting dates. A recent retrieval date does not make a historic disclosure current.

## Review a proposed correction

1. Open `/review`. Follow the primary sources and record a review note.
2. Validate a complete proposed knowledge JSON bundle. The page shows errors and count changes and can export the structurally valid proposal.
3. Independently verify factual claims. Validation checks references, IDs, coordinates, finite values, date formats, relationship endpoints, duplicate labels and dated ownership; it does not establish truth.
4. Export review notes to retain the decisions outside browser storage.
5. Review the actual file diff in the repository, including deletions and changed reporting dates.

No browser review action writes to the production database.

## Apply a reviewed bundle locally

```powershell
npm.cmd run data:check -- --proposal path/to/proposal.json
npm.cmd run data:apply -- path/to/proposal.json
```

Applying creates a backup in ignored `.data-backups/`, replaces the bundle atomically, and records a new release digest. A proposal that removes entity IDs requires an explicit `--allow-removals` flag after reviewing that deletion list.

Region, indicator and event changes are reviewed as repository changes alongside their sources. After those changes:

```powershell
npm.cmd run data:release
npm.cmd run data:check
npm.cmd test
npm.cmd run build
```

The ordinary check rejects a stale release manifest. JSON line endings are fixed to LF by `.gitattributes`, so the digest remains consistent across Windows and deployment hosts.

Apply migrations and seed the same release to the optional database. The seed is transactional and idempotent, updates all catalogue resources and records the applied digest in `catalog_revisions`. It does not prune unrelated or retired database rows automatically. Review record retirement explicitly; do not silently delete operational data. Health readiness verifies the expected release was applied.

## Refreshing sources

Use the exact primary source URLs recorded in `data/provenance` and the source register. Download changes to a staging folder and compare them before replacing published data.

- **Municipalities:** Treasury's raw directory includes former codes. Apply the explicit disestablished transitions from its change-history cube, preserve former codes separately, and cross-check category totals against the government local-government page. The included snapshot is dated 22 October 2026: 8 metropolitan, 44 district and 205 local municipalities.
- **National institutions:** take the national departments subsection, preserving distinctions between ordinary departments, agencies, offices and services.
- **Ownership:** name the legal entities and reporting date. Keep direct, indirect, joint-venture and operating relationships distinct. Do not infer ultimate beneficial ownership or multiply percentages without an explicit model and supporting evidence.
- **World Bank:** preserve the API response envelope, source ID, update date, indicator definitions, source organizations and nulls. Match indicator and year across countries. The included snapshot deliberately covers 2014–2024; it is not labelled live.
- **Census:** preserve the release vintage and table number. Do not mix population estimates with census-date counts.
- **Geography:** retain the pinned source and attribution. Province geometry is a simplified 2020 boundary vintage. Original source label/code normalization is recorded.
- **Infrastructure:** preserve the purpose and date of each published coordinate. Project, property-fence and station-centre points are different locators. Duvha remains a province locator pending source-requested verification.

## Data limitations to keep visible

Valterra's operating-structure diagram and separate financial-statement holding conventions have not been reconciled here. The graph labels the specific dated diagram disclosure and does not present it as a current ultimate-ownership assertion. Mafube is a joint-venture interest. Mining companies and operations are a bounded sample.

The 2011 provincial Census integers sum to 51,770,561 while the printed national total is 51,770,560. The application preserves the published integers and discloses the discrepancy.

World Bank population values are midyear estimates. South Africa's WDI 2022 value therefore differs from its Census 2022 count.

## Provenance and licensing

Primary source URLs are available in the application and committed metadata. Natural Earth is public domain. Province geometry retains geoBoundaries CC BY 4.0 plus original OCHA/Municipal Demarcation Board CC BY 3.0 IGO attribution. WDI retains World Bank CC BY 4.0 and original-provider metadata. Treasury reuse requires attribution and update date, without implied endorsement. Corporate report imagery and long prose are not copied.
