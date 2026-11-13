import { z } from "zod";
import {
  chatRequestSchema,
  validateActions,
  type CanvasAction,
} from "./actions";
import {
  countries,
  entityById,
  searchKnowledge,
  getSources,
  indicators,
  regions,
} from "./knowledge";
export function localGuide(request: z.infer<typeof chatRequestSchema>) {
  const { message, context } = request,
    q = message.toLowerCase();
  const actions: CanvasAction[] = [];
  let ids: string[] = [],
    text = "";
  const country = countries
    .toSorted((a, b) => b.name.length - a.name.length)
    .find((c) =>
      (" " + q.replace(/[^\p{L}\p{N}]+/gu, " ") + " ").includes(
        " " + c.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ") + " ",
      ),
    );
  if (/compar/.test(q)) {
    return {
      message:
        "The Compare view contains historical World Bank population and GDP growth series for South Africa, Botswana and Namibia (2014–2024). Use the country, indicator and year selectors to compare matching observations, or choose Historical trends. Other countries do not yet have comparison series.",
      actions: validateActions(
        [{ type: "SET_VISUALIZATION_MODE", payload: { mode: "compare" } }],
        context.country,
      ),
      sourceIds: [...new Set(indicators.flatMap((i) => i.sourceIds))],
    };
  }
  if (country && country.code !== context.country) {
    actions.push({
      type: "SELECT_COUNTRY",
      payload: { countryCode: country.code },
    });
    if (country.code !== "ZA")
      return {
        message:
          "Showing " +
          country.name +
          " on the map. Detailed institutional knowledge coverage has not yet been added. Historical comparison series are available for Botswana and Namibia in Compare.",
        actions: validateActions(actions, context.country),
        sourceIds: [],
      };
  }
  const active = country?.code ?? context.country;
  if (active !== "ZA")
    return {
      message:
        "The map covers " +
        context.countryName +
        ", but detailed knowledge is currently available only for South Africa. Ask “Explore South Africa” to begin there.",
      actions: [],
      sourceIds: [],
    };
  if (/electric|power station|household|homes/.test(q)) {
    ids = [
      "za-electricity",
      "za-generation",
      "za-transmission",
      "za-distribution",
      "za-consumers",
    ];
    actions.push(
      { type: "OPEN_ENTITY", payload: { entityId: "za-electricity" } },
      { type: "SET_VISUALIZATION_MODE", payload: { mode: "flow" } },
      { type: "FIT_CANVAS", payload: {} },
    );
    text =
      "Electricity follows a simplified path: generation → transmission → distribution → homes and businesses. The canvas now shows these stages. NTCSA operates the national transmission network. These arrows show energy flow, not company ownership. Select a stage to inspect its source references.";
  } else if (/census|population|chart|people|numbers/.test(q)) {
    ids = ["za-society"];
    actions.push({
      type: "CREATE_CHART",
      payload: { datasetId: "za-census-2022" },
    });
    text =
      "Showing provincial population counts from Census 2022. These are historical census results, not current estimates. You can switch chart types or open the data table below the chart. Source: Statistics South Africa.";
  } else if (
    regions.some((region) =>
      q
        .replaceAll("-", " ")
        .includes(region.name.toLowerCase().replaceAll("-", " ")),
    )
  ) {
    const id = regions.find((region) =>
      q
        .replaceAll("-", " ")
        .includes(region.name.toLowerCase().replaceAll("-", " ")),
    )!.entityId;
    ids = [id];
    actions.push({ type: "FOCUS_REGION", payload: { entityId: id } });
    text =
      entityById(id)!.description +
      " The map is focused on this province. Simplified 2020 province boundaries and historical Census overlays are available in Map layers.";
  } else if (/expand|this entity|this node/.test(q) && context.selectedEntity) {
    ids = [context.selectedEntity];
    actions.push(
      { type: "EXPAND_NODE", payload: { nodeId: context.selectedEntity } },
      { type: "SET_VISUALIZATION_MODE", payload: { mode: "hierarchy" } },
      { type: "FIT_CANVAS", payload: {} },
    );
    text =
      "Expanding the selected entity’s documented connections. If no child records are present, this seed has reached its coverage limit.";
  } else if (/government|politic|power organized|parliament/.test(q)) {
    ids = [
      "za-government",
      "za-national",
      "za-provinces",
      "za-local",
      "za-parliament",
    ];
    actions.push(
      { type: "OPEN_ENTITY", payload: { entityId: "za-government" } },
      { type: "SET_VISUALIZATION_MODE", payload: { mode: "hierarchy" } },
      { type: "FIT_CANVAS", payload: {} },
    );
    text =
      "South Africa’s Constitution establishes national, provincial and local spheres of government as distinct, interdependent and interrelated. Parliament makes national laws and oversees the executive. The judiciary is independent. The canvas is a navigation model: the three spheres are not a simple chain of command. Expand a node to investigate further.";
  } else {
    const matches = searchKnowledge(message, active),
      selected = context.selectedEntity
        ? entityById(context.selectedEntity)
        : undefined;
    const results = matches.length ? matches : selected ? [selected] : [];
    ids = results.map((e) => e.id);
    text = results.length
      ? results
          .slice(0, 3)
          .map((e) => e.name + ": " + e.description)
          .join("\n\n")
      : "The local guide has no matching sourced record. Try government, electricity, the Reserve Bank or Census 2022. Configure the server API key for open-ended, context-aware AI questions.";
    if (results[0])
      actions.push({
        type: "OPEN_ENTITY",
        payload: { entityId: results[0].id },
      });
  }
  const sourceIds = [
    ...new Set(ids.flatMap((id) => entityById(id)?.sourceIds ?? [])),
  ];
  return {
    message: text,
    actions: validateActions(actions, context.country),
    sourceIds: getSources(sourceIds).map((s) => s.id),
  };
}
