import { test } from "node:test";
import assert from "node:assert/strict";
import { runAgent } from "../lib/agent";
const request = {
  message: "Show government",
  history: [],
  context: {
    country: "ZA",
    countryName: "South Africa",
    domain: "government" as const,
    mode: "geographic" as const,
    selectedEntity: null,
    visibleEntities: [],
    region: null,
  },
};
function sse(events: unknown[]) {
  return new Response(
    events.map((e) => "data: " + JSON.stringify(e) + "\n\n").join(""),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}
test("streamed tool calls are validated and provider storage is disabled", async () => {
  const original = globalThis.fetch;
  let round = 0;
  const requests: any[] = [],
    events: any[] = [];
  globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(init!.body as string));
    return round++ === 0
      ? sse([
          {
            type: "response.completed",
            response: {
              output: [
                {
                  type: "function_call",
                  name: "canvas_action",
                  call_id: "1",
                  arguments: JSON.stringify({
                    type: "SET_VISUALIZATION_MODE",
                    mode: "hierarchy",
                  }),
                },
              ],
            },
          },
        ])
      : sse([
          {
            type: "response.output_text.delta",
            delta: "Showing sourced government records.",
          },
          { type: "response.completed", response: { output: [] } },
        ]);
  };
  try {
    await runAgent(
      request,
      (e) => events.push(e),
      new AbortController().signal,
    );
    assert.ok(events.some((e) => e.type === "delta"));
    const done = events.find((e) => e.type === "done");
    assert.equal(done.actions[0].payload.mode, "hierarchy");
    assert.equal(requests[0].store, false);
    assert.ok(
      requests[0].tools.some((t: any) => t.name === "search_knowledge"),
    );
    assert.ok(requests[0].tools.some((t: any) => t.name === "canvas_action"));
  } finally {
    globalThis.fetch = original;
  }
});
test("an invented executable tool command is never returned to the canvas", async () => {
  const original = globalThis.fetch;
  let round = 0;
  const events: any[] = [];
  globalThis.fetch = async () =>
    round++ === 0
      ? sse([
          {
            type: "response.completed",
            response: {
              output: [
                {
                  type: "function_call",
                  name: "canvas_action",
                  call_id: "1",
                  arguments: JSON.stringify({
                    type: "EXECUTE_JS",
                    code: "alert(1)",
                  }),
                },
              ],
            },
          },
        ])
      : sse([
          {
            type: "response.output_text.delta",
            delta: "That action is unavailable.",
          },
          { type: "response.completed", response: { output: [] } },
        ]);
  try {
    await runAgent(
      request,
      (e) => events.push(e),
      new AbortController().signal,
    );
    assert.deepEqual(events.find((e) => e.type === "done").actions, []);
  } finally {
    globalThis.fetch = original;
  }
});

test("chart explanations can retrieve the actual historical dataset and its source", async () => {
  const original = globalThis.fetch;
  let round = 0;
  const events: any[] = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init!.body as string);
    if (round++ === 0)
      return sse([
        {
          type: "response.completed",
          response: {
            output: [
              {
                type: "function_call",
                name: "get_dataset",
                call_id: "chart",
                arguments: JSON.stringify({ datasetId: "za-census-2022" }),
              },
            ],
          },
        },
      ]);
    const output = body.input.find(
      (item: any) => item.type === "function_call_output",
    );
    assert.equal(JSON.parse(output.output).points[0].value, 15099422);
    return sse([
      {
        type: "response.output_text.delta",
        delta: "These are Census 2022 counts.",
      },
      { type: "response.completed", response: { output: [] } },
    ]);
  };
  try {
    await runAgent(
      {
        ...request,
        message: "Explain the population chart",
        context: { ...request.context, domain: "society", mode: "data" },
      },
      (e) => events.push(e),
      new AbortController().signal,
    );
    assert.ok(
      events.find((e) => e.type === "done").sourceIds.includes("census"),
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("provider refusal text is shown instead of leaving a blank response", async () => {
  const original = globalThis.fetch;
  const events: any[] = [];
  globalThis.fetch = async () =>
    sse([
      {
        type: "response.refusal.delta",
        delta: "I cannot help with that request.",
      },
      { type: "response.completed", response: { output: [] } },
    ]);
  try {
    await runAgent(
      request,
      (e) => events.push(e),
      new AbortController().signal,
    );
    assert.equal(
      events.find((e) => e.type === "delta").text,
      "I cannot help with that request.",
    );
    assert.ok(events.some((e) => e.type === "done"));
  } finally {
    globalThis.fetch = original;
  }
});
