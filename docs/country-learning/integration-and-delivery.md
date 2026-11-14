# Integrating the learning topics

This guide connects the [topic specifications](README.md) to the current repository. It proposes future changes; it does not add runtime features.

## Reuse the current architecture

| Existing foundation                  | Role in the learning experience                                           | Relevant code                                                                                                                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Country profiles and reference areas | Country terminology, boundary dates, coverage and supported views         | [country-profiles.ts](../../lib/country-profiles.ts), [country API](../../app/api/countries/route.ts), [world coverage](../world-coverage.md)                                                                                                    |
| Reviewed knowledge and retrieval     | Stable entity IDs, typed relationships, sources and datasets              | [types.ts](../../lib/types.ts), [knowledge.ts](../../lib/knowledge.ts), [retrieval.ts](../../lib/retrieval.ts)                                                                                                                                   |
| Shared exploration state             | Country, area, camera, selections, layers, time and display settings      | [exploration.ts](../../lib/exploration.ts), [store.ts](../../lib/store.ts)                                                                                                                                                                       |
| Validated actions and history        | Shared route for manual and AI changes, bounded reversible batches        | [actions.ts](../../lib/actions.ts), [canvas-reducer.ts](../../lib/canvas-reducer.ts)                                                                                                                                                             |
| Geography and entity rendering       | Boundary focus, dots, clustering, selected feature details                | [WorldMap.tsx](../../components/WorldMap.tsx), [CountryAreas.tsx](../../components/CountryAreas.tsx), [MapDetails.tsx](../../components/MapDetails.tsx)                                                                                          |
| Other renderers                      | Institutional structures, connections, flows, statistics and events       | [GraphCanvas.tsx](../../components/GraphCanvas.tsx), [RelationshipCanvas.tsx](../../components/RelationshipCanvas.tsx), [ComparisonCanvas.tsx](../../components/ComparisonCanvas.tsx), [TimelineCanvas.tsx](../../components/TimelineCanvas.tsx) |
| Assistant and orchestration plumbing | Question input, reviewed details, streamed explanation and queued actions | [Assistant.tsx](../../components/Assistant.tsx), [agent.ts](../../lib/agent.ts), [chat route](../../app/api/chat/route.ts)                                                                                                                       |
| Investigations and reports           | Save the exploration and retain evidence outside the conversation         | [investigations.ts](../../lib/investigations.ts), [snapshot.ts](../../lib/snapshot.ts), [report.ts](../../lib/report.ts)                                                                                                                         |

The current layer registry is closed to eleven IDs. New service, environment or legal overlays require deliberate schema, renderer, control and saved-state migration work. They cannot be introduced by an AI request alone.

## Topics and technical domains

Keep the ten learning topics as a separate taxonomy that can tag records and learning material. Existing entities have one primary technical domain; a proposed many-to-many topic index allows the same record to support several lessons without duplicating it.

| Learning topic           | Existing technical domains or cross-cutting features                 |
| ------------------------ | -------------------------------------------------------------------- |
| Geography                | Country/area geography; relevant infrastructure and industry records |
| People                   | society; population indicators and regional statistics               |
| Government               | government and law                                                   |
| Administrative divisions | Geography and government; country-specific schemes                   |
| Economy                  | economy and industry; relevant infrastructure                        |
| History                  | Dated events and historical evidence across all domains              |
| Laws and rights          | law and government                                                   |
| Public services          | society, government and infrastructure                               |
| Infrastructure           | infrastructure and industry; geographic networks                     |
| International relations  | government, economy and law; future cross-country relationships      |

Topic navigation can appear as a compact "Learn about" control or as suggested questions in the assistant. It should not add ten permanent overlay cards or force a redesign of the existing sidebar.

## Proposed knowledge additions

These are design requirements for future schema work, not fields that every existing record already supports.

| Record or capability    | Information to retain                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Topic definition        | Stable topic ID, localized label, categories, related topics and example learning questions                                    |
| Topic membership        | Entity/document/observation ID, topic IDs and specific learning concepts                                                       |
| Coverage record         | Country, topic/category, available record types, spatial scope, periods, capability gaps and source-review status              |
| Administrative scheme   | Scheme ID, local terms, area types, effective interval, typed parent or overlap relationships and geometry editions            |
| Claim or passage        | Subject, statement/predicate, source ID, document location, relevant dates and editorial conflict notes                        |
| Statistical observation | Measure definition, value/null, unit, denominator, geography ID, observation period, method, source and boundary compatibility |
| Spatial evidence        | Verified geometry or locator, original provider ID, precision, boundary/route edition, licence and source dates                |
| Learning activity       | Goal, prerequisite concepts, cited evidence, interaction steps, optional questions and evidence-based feedback                 |
| Learning session        | Active topics, explanation depth, current goal, visited steps and referenced catalogue version                                 |

Existing entities, relationships, indicators, sources and events cover parts of these needs. Extend them deliberately or add related records where their current shape is insufficient. Do not hide structured statistical or legal data in an untyped description.

A topic's availability should be assessed per country and subcategory. For example, published population observations do not imply language data, and an institution directory does not imply current officeholder coverage.

Coverage should explain availability and limitations directly: "Historical country totals, 2014–2024" or "Reference boundaries only; local service coverage unavailable." Avoid a single numeric completeness score across unlike countries and topics.

## Geography, time and comparisons

Join observations to stable source geography IDs and compatible boundary editions. If a statistical region and a current administrative region differ, preserve both schemes; a reviewed crosswalk may describe their relationship. Do not divide a national or provincial value across smaller polygons to fill the map.

Keep separate clocks for observation periods, institutional/legal validity, boundary editions and source retrieval. A timeline control must say which clock it changes. Changing the selected year should not imply that every layer has a matching historical version.

Country comparisons require matching definitions and units as well as a suitable common period. Keep nulls, negative values and zero distinct. Currency conversions, derived rates and other calculations need explicit formulas, source inputs and dates.

## Knowledge acquisition and review

Use source families appropriate to each topic, prioritizing responsible public institutions, statistical agencies, primary documents and documented research methods. Exact sources, licences and update schedules must be reviewed for each country before import; the topic guides do not certify any unimported dataset.

Source acquisition feeds a staging/review pipeline: retain the publisher material, check identifiers and dates, review factual meaning, validate joins and geometry, record licences, generate a catalogue release, and then expose the reviewed material to retrieval. AI can help propose mappings and identify gaps; it must not mark its own generated content as verified.

Technical validation establishes schema and join correctness, not historical, legal or political truth. Conflicts should remain inspectable rather than being silently reconciled.

## Deliver in usable slices

### 1. Define coverage and curate pilot questions

Add topic definitions and country/topic coverage contracts. Select a small question set for each topic, identify required evidence and mark questions unsupported where that evidence is missing. Start with existing reviewed coverage; use Botswana and Namibia to test different administrative schemes.

**Exit:** every pilot question has an evidence inventory, a proposed display and an honest availability state.

### 2. Build direct exploration and details

Add compact topic navigation and evidence-backed content for one supported slice at a time. Reuse map dots, selections, diagrams, charts, accessible tables and closable details. Add new renderers or layers only when the content requires them.

**Exit:** a user can complete the pilot interaction manually, inspect sources and save the result without AI.

### 3. Connect the AI orchestrator

Add bounded topic/profile/indicator/event/document retrieval tools, richer context and the required provider action adapter. Validate dependent batches, check stale context, support cancellation and explain coverage gaps. See [AI orchestration](ai-orchestration.md) for the existing adapter limits.

**Exit:** natural-language requests reproduce the supported manual journeys using reviewed evidence and reversible actions.

### 4. Add learning journeys and expand countries

Build optional guided sequences, concept explanations and short evidence-backed knowledge checks. Store local progress separately from view history. Expand only the country/topic combinations with reviewed data, terminology and capabilities.

**Exit:** users can switch between a guided journey and free exploration, resume with evidence-version awareness, and understand what each country actually covers.

These phases describe dependencies; a particular topic can reach a later phase while another still awaits source curation. Live credentials can be added when the user is ready; documentation and manual exploration can advance first.

## Validation for each implemented slice

| Area              | What to verify                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Evidence          | Every factual answer and displayed measurement resolves to the actual reviewed evidence                        |
| Country structure | Local terminology, parallel schemes and reference/current distinctions remain correct                          |
| Visualization     | IDs and selections agree across views; display choice fits the question                                        |
| Dates and values  | Periods, definitions, units, nulls, denominators and boundary compatibility remain visible                     |
| AI behavior       | Unsupported tools/actions fail safely, stale plans are rejected and changes are reversible                     |
| Learning          | Optional questions have sourced answer guidance; contested interpretation is not treated as a single fact quiz |
| Accessibility     | Keyboard selection, meaningful text/table alternatives, readable legends and usable mobile panels              |
| Persistence       | Saved investigations and reports preserve context, sources, coverage notes and applicable versions             |
| Performance       | Country-scoped requests, progressive geometry, bounded graphs and no full-catalogue model prompt               |

Browser verification should continue to mock public street tiles. New checks should verify learning outcomes and cross-view behavior rather than duplicate internal implementation details.

## Worked cross-topic journey

Question: "How does electricity connect to mining and jobs in this region?"

1. Resolve the selected region and find reviewed mining and infrastructure records.
2. Show mapped assets at their documented precision; retrieve sourced ownership, regulation and supply relationships.
3. Use a split view for the region and a bounded relationship graph. Keep abstract connections distinct from physical networks.
4. If compatible regional employment observations exist, show their period, definition and source in a chart. Do not infer mine-level employment from a regional total.
5. Explain the recorded relationships. Proximity alone does not establish an electricity supplier or a causal effect on jobs.
6. Offer "Explore the electricity system," "Inspect ownership evidence" or "Compare published employment measures" when supported.

The current catalogue can support parts of this journey. Verified physical supply routes, causal employment models and complete regional employment coverage require additional evidence and implementation.
