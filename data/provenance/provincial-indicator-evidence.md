# Provincial overlay evidence — 13 November 2026

Ready-to-integrate artifact: `provincial-indicators.json`. `normalize.mjs` reproduces it and checks all 54 province joins against the current nine-region catalogue. This is a fixed source snapshot. None of the data are municipality-level estimates.

## Sources and extraction

1. [QLFS Q3 2026, P0211](https://www.statssa.gov.za/publications/P0211/P02113rdQuarter2026.pdf), printed page 9: summary map reports official unemployment (UR), absorption (AR), and labour force participation (LFPR) for all nine provinces. [Release page](https://www.statssa.gov.za/?PPN=P0211&page_id=1854) verifies publication 10 November 2026. Measurement July–September 2026. Rates pertain to ages 15–64. The official PDF's full table is exposed in the web search text; direct local download returned an HTML challenge rather than a PDF. Map extraction corroborated arithmetically: AR approximately equals LFPR × (1−UR/100), allowing published one-decimal rounding. No expanded unemployment/LU3 substituted.
2. [Provincial GDP 2025, P0441.2, September 2026 issue](https://www.statssa.gov.za/publications/P04412/P04412September2026.pdf), printed page 7 Table 2. [Release page](https://www.statssa.gov.za/?PPN=P0441.2&SCH=74596&page_id=1854) verifies release 29 October 2026. Annual growth is the published percentage-change table, not a calculation from rounded rand-million levels. This is the rebased constant-2022-price vintage, which revises earlier years; all nine 2025 growth rates are positive. Direct local download returned HTML; the full Table 2 and percentage-change panel are exposed in official-source web search text.
3. [Census 2022 official Government PDF](https://www.gov.za/sites/default/files/P03014_Census_2022_Statistical_Release.pdf), printed page 43 (physical PDF page 55), Table 4.6. Full official PDF saved as `census-2022.pdf`; extracted text saved in `census-extracted.txt`, with exact relevant page in `census-education-table.txt`. [Original Stats SA copy](https://census.statssa.gov.za/assets/documents/2022/P03014_Census_2022_Statistical_Release.pdf). Education denominator is **all adults ages 20+**, explicitly **not 25+**. Category numerators and published total denominators retained. Map rates computed as count / published total ×100, rounded to one decimal, with independent-processing disclosure.
4. [GHS 2025, P0318](https://www.statssa.gov.za/publications/P0318/P03182025.pdf), printed page 21 Figure 5.3. [Release page](https://www.statssa.gov.za/?PPN=P0318&SCH=74563&page_id=1854) verifies release 26 May 2026. All nine published medical-aid rates independently corroborated by [Selected development indicators 2025, P0318.2](https://www.statssa.gov.za/publications/P03182/P031822025.pdf), printed page 9 Table 2.4. This measures financial coverage, **not** healthcare access to public services, facility capacity, quality or health outcomes. Local download was blocked by HTML challenge, while both official PDF tables are exposed by web search text. Preserve published rates rather than reconstructing from rounded counts or inventing unknown-response handling.

## Exact source-number transcription

Province order below is WC, EC, NC, FS, KZN, NW, GP, MP, LP, RSA. Numeric source facts are transcribed with decimal commas normalized to JSON decimal points.

| Measure | WC | EC | NC | FS | KZN | NW | GP | MP | LP | RSA |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Official unemployment, %, Q3 2026 |19.4|44.3|30.0|39.1|33.3|38.1|35.7|37.8|30.2|33.7|
| Employment absorption, %, Q3 2026 |55.4|29.6|36.7|37.8|34.8|32.1|44.0|38.1|36.5|39.7|
| Labour-force participation, %, Q3 2026 (cross-check only) |68.7|53.2|52.4|62.0|52.1|51.8|68.5|61.2|52.3|59.9|
| Real GDP growth, %, 2025 |1.4|0.6|0.9|0.8|0.7|0.9|1.1|0.5|1.0|0.9|
| Medical aid coverage, %, GHS 2025 |25.9|9.9|16.7|11.8|9.5|13.1|22.1|12.6|8.2|15.5|
| No-schooling count, ages 20+, Census2022 |107254|300119|52588|87798|607121|176650|384007|355682|504793|2576011|
| Post-school count, ages 20+, Census2022 |837320|416388|56208|179313|763354|166980|1606149|222321|354732|4602765|
| Published total adults ages20+, Census2022 |4764565|4151162|792272|1763343|7356329|2229861|9898581|3036936|3584940|37577988|

## Reuse terms and required attribution

[Stats SA Copyright and disclaimer](https://www.statssa.gov.za/?page_id=425) permits application and redistribution with source attribution and disclosure that processing/analysis is independent. This is Stats SA copyright, **not a Creative Commons licence**. Suggested attribution: “Statistics South Africa (Stats SA). Map display and derived education percentages are independent Civic Intelligence processing.”

## Integration rules

- Display measurement period and source beside each active overlay. Education's2022, GDP's2025, GHS2025 and QLFS2026Q3 cannot be a single undated composite.
- Use the explicit `regionId` join. Do not rely on table order, province abbreviations, entity sorting or approximate name matching.
- All six chosen metrics have all nine published/derived province values; missing observations elsewhere must be `null`, not0. No municipality interpolation is authorized by these province sources.
- Do not sum or average percentages. National values are independently sourced/derived from published national counts.
- Real GDP growth supports negative numbers even though all nine2025 observations happen to be positive. Future missing or negative values must survive normalization.
- No confidence intervals were selected. Small differences in sample-survey rates should not be described as statistically significant.
- Health capacity remains explicitly unavailable; do not relabel medical-aid membership as healthcare capacity.

Research-only helper wheel `pypdf.whl` was downloaded from PyPI and extracted into this ignored research directory. Project dependencies and application files were not changed.
