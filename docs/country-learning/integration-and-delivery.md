# How to build the learning topics into the app

This guide connects the [ten topics](README.md) to the current project. It explains the work needed; it does not mean those features are already built.

## Reuse what the app has

| Part of the app        | How it helps learning                                                 | Main files                                                                                                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Country profiles       | Country names, local divisions, boundary dates and available features | [country-profiles.ts](../../lib/country-profiles.ts), [country API](../../app/api/countries/route.ts), [world information](../world-coverage.md)                                                                                                 |
| Checked information    | Places, organizations, links, figures and sources                     | [types.ts](../../lib/types.ts), [knowledge.ts](../../lib/knowledge.ts), [retrieval.ts](../../lib/retrieval.ts)                                                                                                                                   |
| Shared view settings   | Selected country, area, item, map position, layers and dates          | [exploration.ts](../../lib/exploration.ts), [store.ts](../../lib/store.ts)                                                                                                                                                                       |
| Commands and undo      | Apply checked changes from either the user or AI                      | [actions.ts](../../lib/actions.ts), [canvas-reducer.ts](../../lib/canvas-reducer.ts)                                                                                                                                                             |
| Maps and details       | Show boundaries and dots, then open details on click                  | [WorldMap.tsx](../../components/WorldMap.tsx), [CountryAreas.tsx](../../components/CountryAreas.tsx), [MapDetails.tsx](../../components/MapDetails.tsx)                                                                                          |
| Other views            | Show organization, connections, numbers and events                    | [GraphCanvas.tsx](../../components/GraphCanvas.tsx), [RelationshipCanvas.tsx](../../components/RelationshipCanvas.tsx), [ComparisonCanvas.tsx](../../components/ComparisonCanvas.tsx), [TimelineCanvas.tsx](../../components/TimelineCanvas.tsx) |
| Assistant              | Accept questions, show explanations and request screen changes        | [Assistant.tsx](../../components/Assistant.tsx), [agent.ts](../../lib/agent.ts), [chat route](../../app/api/chat/route.ts)                                                                                                                       |
| Saved work and reports | Keep a view, notes and sources for later                              | [investigations.ts](../../lib/investigations.ts), [snapshot.ts](../../lib/snapshot.ts), [report.ts](../../lib/report.ts)                                                                                                                         |

The app currently accepts eleven known layer names. A new school, climate or legal-area layer needs changes to the data rules, map drawing, controls and saved views. AI cannot create a working layer just by asking for it.

## How topics fit the existing sections

The app has six main information sections. A learning topic can use more than one.

| Learning topic          | Existing sections or features it can use                     |
| ----------------------- | ------------------------------------------------------------ |
| Geography               | Country maps, areas, infrastructure and industries           |
| People                  | Society and population statistics                            |
| Government              | Government and law                                           |
| Country divisions       | Maps and government                                          |
| Economy                 | Economy, industries and infrastructure                       |
| History                 | Events and older information from every section              |
| Laws and rights         | Law and government                                           |
| Public services         | Society, government and infrastructure                       |
| Infrastructure          | Infrastructure, industries and maps                          |
| International relations | Government, economy, law and future country-to-country links |

Keep one entry for each real place or organization and tag it with the topics that use it. A compact "Learn about" menu or suggested questions can help users choose. Avoid ten permanent cards covering the map.

## Information we need to add

An ID is the app's unique name for an entry. Keeping the same ID across views lets a map dot, chart item and details panel refer to the same thing.

| Information        | What to save                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------- |
| Topic              | Its name, categories, related topics and example questions                                    |
| Topic links        | Which places, organizations, figures and documents belong to each topic                       |
| What is available  | Country, topic, supported features, places and dates covered, sources and missing information |
| Country divisions  | Local names, types of areas, how areas fit or overlap, dates and boundary versions            |
| Facts and passages | The statement, its subject, source, document section, dates and any disagreement              |
| Figures            | What was measured, value or missing value, unit, area, period, source and calculation method  |
| Map information    | Checked location or shape, accuracy, source ID, dates, version and reuse terms                |
| Learning activity  | Goal, sources, steps, optional questions and feedback                                         |
| Learning progress  | Current topic, goal, explanation level, completed steps and version of the information used   |

Some of this already exists. Add clear fields where more detail is needed. Do not put complex legal rules or statistics into a vague description.

Check what is available for each country and topic. Having population figures does not mean language figures exist. A list of government bodies does not mean their current leaders are known.

Describe limits directly: "Country totals for 2014–2024" or "Older boundaries only; local services not mapped." A single completeness score would hide these differences.

## Match places, dates and numbers

Link figures to the exact areas they describe. A census area may differ from a current council area. Keep both sets of boundaries and explain any checked way of matching them.

Do not divide a country's total across smaller areas just to fill a map.

Keep these dates separate:

- When something was measured.
- When a law or responsibility applied.
- Which boundary version is shown.
- When the source was collected or checked.

A year selector must say which information it changes. It should not suggest every layer has a map or figure for that year.

For comparisons, match the definition, units and period. Keep zero, negative numbers and missing values distinct. Show the method and source figures for currency conversions or other calculations.

## Check information before adding it

Start with the responsible public bodies, statistics offices, original documents and research that explains its methods. Check the exact source, reuse terms and update needs for each country.

Before information reaches the app:

1. Keep a copy of the source.
2. Check names, IDs, dates and meaning.
3. Check map shapes and links between entries.
4. Record the source and reuse terms.
5. Save a reviewed version of the information.
6. Make that version available to the app and AI.

AI can suggest sources and help find gaps. Its guesses must not be labelled as checked facts. Software checks can find broken links or invalid shapes; people still need to check factual meaning. Keep source disagreements visible.

## Build it in four stages

### 1. Decide what each topic can answer

Add the topic list and a record of available information for each country. Choose a few starter questions, list the facts they need and mark any missing facts. Start with the information already checked. Use Botswana and Namibia to test different local systems.

**Ready when:** every starter question has sources, a suitable view and an honest statement of what is available.

### 2. Make the clicks and controls work

Build one useful part at a time. Reuse map dots, diagrams, charts, tables and closable details. Add new views only when needed.

**Ready when:** users can explore the starter questions, check sources and save results using the controls, without AI.

### 3. Let AI coordinate those features

Connect tools for reading topics, places, figures, events and documents. Give AI the relevant view settings. Check commands, support cancellation and stop old requests from changing a new selection. See [the AI guide](ai-orchestration.md) for today's limits.

**Ready when:** a user can ask for the same supported result in ordinary language and undo the changes.

### 4. Add lessons and more countries

Add optional guided steps and short questions based on sources. Keep learning progress separate from map history. Add country/topic combinations as their information is checked.

**Ready when:** users can move between lessons and free exploration, resume saved work and see what each country supports.

Different topics can move at different speeds. Live AI keys can be connected later; source checking and manual features can be built first.

## What to check before release

| Area              | Check                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Facts             | Answers and figures link to the checked sources                                               |
| Country setup     | Local names, separate systems and older boundaries are explained correctly                    |
| Views             | The same item stays selected across views                                                     |
| Figures and dates | Units, periods, percentages and missing values are clear                                      |
| AI                | Invalid commands fail safely; old answers do not change new selections; changes can be undone |
| Learning          | Quiz feedback uses sources and allows for unclear or disputed answers                         |
| Access            | Keyboard controls, readable legends, tables and phone layouts work                            |
| Saved work        | Reports and saved views keep the sources, limits and relevant versions                        |
| Speed             | Load only the needed country data, map detail and graph items                                 |

Automated browser checks should keep using test street tiles rather than send automated traffic to the public map service.

## Example using several topics

Question: "How does electricity connect to mining and jobs in this region?"

1. Find checked mining and electricity information for the selected region.
2. Map known locations and read the saved ownership, regulation and supply links.
3. Show the map beside a small connection graph. Explain which lines show real routes and which only show relationships.
4. Add employment figures if they describe the right area and period. Do not treat a regional total as the number of jobs at one mine.
5. Explain what the sources establish. Nearby places are not automatically connected, and a graph does not prove an effect on jobs.
6. Offer a useful next question, such as "How does the electricity system work?" or "Who owns this mine?"

The app can already support parts of this example. Complete supply routes, effects on jobs and full regional employment figures need more checked information and features.
