# Learning about a country

This folder describes how Civic Intelligence can help people understand a country through ten connected topics. It is a product and implementation specification, reviewed against the repository on 15 November 2026. Proposed learning features and datasets described here are not claims of existing functionality.

The intended experience starts with a question or a map interaction. AI interprets the user's intent, retrieves reviewed evidence, chooses a useful representation, updates the shared canvas through validated actions, and explains what the user is seeing. The user can then click, compare, ask why, inspect a source, or follow a related topic.

## Topic guides

| Topic                       | Questions it helps answer                                      | Suitable displays                                                    | Guide                                                      |
| --------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1. Geography                | Where is it, and what shapes life there?                       | Map, terrain/environment overlays, regional comparisons              | [Geography](01-geography.md)                               |
| 2. People                   | Who lives there, and how do communities differ?                | Population maps, distributions, trends, contextual stories           | [People](02-people.md)                                     |
| 3. Government               | Who makes decisions, and how does power work?                  | Institutional structures, relationship graphs, election timelines    | [Government](03-government.md)                             |
| 4. Administrative divisions | How is the territory organized and governed locally?           | Boundary maps, scheme diagrams, jurisdiction comparisons             | [Administrative divisions](04-administrative-divisions.md) |
| 5. Economy                  | How do people earn a living and businesses create value?       | Indicator charts, industry maps, ownership graphs, trade flows       | [Economy](05-economy.md)                                   |
| 6. History                  | What happened, and how did the country change?                 | Timelines, dated maps, institution and entity histories              | [History](06-history.md)                                   |
| 7. Laws and rights          | What rules apply, and what rights do people have?              | Legal document views, jurisdiction maps, process diagrams            | [Laws and rights](07-laws-and-rights.md)                   |
| 8. Public services          | How do education, healthcare and social support work?          | Service maps, responsibility diagrams, access and outcome charts     | [Public services](08-public-services.md)                   |
| 9. Infrastructure           | How do transport, power, water and communication systems work? | Asset maps, verified networks, system flows, capacity trends         | [Infrastructure](09-infrastructure.md)                     |
| 10. International relations | How is this country connected to the wider world?              | Country comparisons, diplomatic networks, trade and treaty timelines | [International relations](10-international-relations.md)   |

Read [AI orchestration](ai-orchestration.md) for the interaction loop and [integration and delivery](integration-and-delivery.md) for the connection to existing code, proposed data contracts and implementation order.

## Topics connect to each other

Topics are learning entry points, not isolated data silos. A port can appear in geography, infrastructure, the economy, history and international relations while keeping one stable entity identity.

For example, "How does electricity affect mining jobs?" crosses infrastructure, industry, employment and regional geography. AI should retrieve those connections and choose a small, useful sequence of views rather than force the question into one category.

The ten topics also do not replace the six existing technical domains. Their many-to-many mapping is specified in the integration guide.

## Shared interaction principles

1. **Question first.** Offer a short country introduction and a few useful questions on request, then let the user's interests determine the route.
2. **AI as orchestrator.** AI coordinates knowledge, display and explanation. Retrieval supplies facts; validation and renderers control what can appear.
3. **Map as geographic context.** Use diagrams for organization, graphs for relationships, flows for processes and charts for measurements. Keep the map alongside them when it helps.
4. **Details on demand.** Entities appear as dots, clusters or verified shapes. Clicking opens a closable details panel with evidence and possible next questions. Do not restore permanent entity name cards or hover name cards.
5. **A clear map.** Additional learning panels, legends and overlays have close/reopen controls. Closing them preserves selection, layers and camera; required attribution remains available.
6. **Continuous exploration.** Carry the active country, region, selection, period and filters into follow-up questions. Let users undo an AI display change.
7. **Local structures and names.** Use each country's own administrative, institutional and statistical schemes. Preserve local names and aliases; do not impose South Africa's structure.
8. **Visible evidence.** Show the observation year, geographic scope, source and important limitations close to a claim or visualization.
9. **Useful gaps.** Explain what is available when a requested layer or fact is missing. Offer a supported alternative rather than an invented answer or an empty unexplained view.
10. **Optional guidance.** Users can explore manually, request a guided journey or take an optional short knowledge check. All core navigation remains usable without AI credentials.

## Depth and scope are different

Geographic scope runs from world to country, region and entity. Explanation depth runs from an introduction to a detailed account. Map information density controls how many features appear. A proposed learning-level preference must remain independent of both map zoom and the existing density control.

AI can start with a short explanation, define unfamiliar terms and offer "Show the evidence" or "Go deeper." It should not infer a user's ability from their country, language or demographic characteristics.

## Current foundation

The application already provides a map, institutional hierarchy, relationship graph, system flow, statistics, comparisons, history, a shared exploration store, reversible actions, source details, saved investigations and reports. These are reusable display and navigation foundations, not complete learning content for every country.

Country profiles cover 237 countries and areas. Dated reference polygons cover 214 of them; detailed South African geography and initial Botswana/Namibia institution profiles have different coverage depths. Historical World Bank population and GDP-growth comparisons are available where observations exist. See [world coverage](../world-coverage.md) for the actual source and boundary caveats.

Live AI credentials remain deferred. The local guide and the existing provider adapter do not yet implement the complete orchestration and learning design in this folder.

## A successful learning session

A user can ask a country question, understand the answer and its limits, inspect the displayed evidence, manipulate the view directly, follow a related question, and save what they learned. Success is demonstrated by those actions and understanding, not by the number of panels or the amount of generated text.
