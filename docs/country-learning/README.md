# Learning about a country

This folder explains ten things people may want to learn about a country and how the app can help. It is a plan for building those learning features. Each guide says what already works and what still needs to be added.

AI acts as the middleman between the user, the information and the screen. It understands the question, finds checked information, chooses a useful map or diagram, and explains the result. The user can then click, compare, ask another question or open a source.

These guides were checked against the project on 15 November 2026.

## The ten topics

| Topic                         | What users can learn                                         | Guide                                                |
| ----------------------------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| 1. Geography                  | Where the country is, its land, water, climate and resources | [Geography](01-geography.md)                         |
| 2. People                     | Population, languages, cultures and everyday life            | [People](02-people.md)                               |
| 3. Government                 | Who makes decisions and what public bodies do                | [Government](03-government.md)                       |
| 4. How the country is divided | Regions, provinces, councils and voting areas                | [Country divisions](04-administrative-divisions.md)  |
| 5. Economy                    | Jobs, businesses, industries, trade and money                | [Economy](05-economy.md)                             |
| 6. History                    | Important events and how places changed                      | [History](06-history.md)                             |
| 7. Laws and rights            | Rules, rights, courts and public processes                   | [Laws and rights](07-laws-and-rights.md)             |
| 8. Public services            | Education, healthcare and social support                     | [Public services](08-public-services.md)             |
| 9. Infrastructure             | Transport, electricity, water and internet                   | [Infrastructure](09-infrastructure.md)               |
| 10. International relations   | How the country deals with other countries                   | [Country connections](10-international-relations.md) |

Read [how AI connects everything](ai-orchestration.md) for the question-to-screen process. Read [how to build it into the app](integration-and-delivery.md) for the code, information and work needed.

## Topics can overlap

One place or organization can help explain several topics. A port can be part of geography, trade, transport and history. Keep one saved entry for that port and link it to the relevant topics.

A question such as "How does electricity affect mining jobs?" may need information from several topics. AI should follow the question and choose a few useful views.

The ten learning topics can use the app's existing six main sections. They do not need ten separate copies of the same information.

## How the learning experience should work

1. **Start with the user's interest.** Let people ask a question, click a place or choose a topic.
2. **Let AI guide the next step.** AI finds checked facts, chooses what to show and explains it.
3. **Use the right view.** Maps show places, diagrams show organization, connection graphs show links, and charts show numbers.
4. **Show details when asked.** Keep dots and shapes on the map. A click opens a details panel with sources. Keep permanent entity name cards and hover name cards removed.
5. **Keep the map clear.** Panels and extra views can be closed and reopened without losing the selected place, layers or map position. Keep required map credits available.
6. **Remember the current view.** Follow-up questions should use the selected country, place, item and dates. Users can undo AI changes.
7. **Respect each country's setup.** Use its own names and government divisions rather than copy South Africa's structure.
8. **Show where facts come from.** Include the source, date, area covered and any important limits.
9. **Explain missing information.** Say what is missing and offer something the app can show.
10. **Keep learning optional.** People can explore freely, ask for a guided lesson or try a short quiz. Basic controls work without an AI key.

## Three separate choices

- **Place:** the world, a country, a region or one item.
- **Amount on screen:** a few items or more detail.
- **Explanation:** a short introduction or a deeper explanation.

Zooming in should not automatically make the explanation harder. AI can explain unfamiliar words and offer "Show the source" or "Explain more." It should not guess someone's knowledge from their background.

## What already works

The app has maps, organization diagrams, connection graphs, process diagrams, charts, comparisons and history. Users can select items, inspect sources, undo changes, save investigations and export reports.

There are profiles for 237 countries and areas. Dated map shapes cover smaller areas in 214 of them. South Africa has more detail; Botswana and Namibia have initial government profiles. Historical population and GDP-growth comparisons exist where figures were published. See [world information and its limits](../world-coverage.md).

Live AI keys are still planned for later. The local guide and existing AI connection do not yet provide every learning feature described here.

## What a good result looks like

A user asks a question, understands the answer, checks its sources, explores the view, follows another question and saves something useful. More panels or longer answers do not automatically mean better learning.
