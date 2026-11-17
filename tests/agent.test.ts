import { test } from "node:test";
import assert from "node:assert/strict";
import { runAgent } from "../lib/agent";
const request = {
  message: "Explain water supply in Chile",
  history: [],
  context: {
    country: "CL",
    countryName: "Chile",
    domain: "government" as const,
    mode: "geographic" as const,
    selectedEntity: null,
    visibleEntities: [],
    region: null,
  },
};
test("Next forwards canvas context to FastAPI without sending the OpenAI key", async () => {
  const original = globalThis.fetch,
    previous = process.env.AI_SERVICE_TOKEN;
  const events: any[] = [];
  process.env.AI_SERVICE_TOKEN = "test-service-token";
  globalThis.fetch = async (url, init) => {
    assert.match(String(url), /\/teach$/);
    const headers = init!.headers as Record<string, string>;
    assert.equal(headers["X-Civic-Service-Token"], "test-service-token");
    assert.equal(headers.Authorization, undefined);
    const body = JSON.parse(init!.body as string);
    assert.equal(body.canvas.components.length, 0);
    assert.equal(body.context.country, "CL");
    return new Response(
      '{"type":"delta","text":"Water"}\n{"type":"done","commands":[],"revision":0}',
    );
  };
  try {
    await runAgent(
      request,
      (e) => events.push(e),
      new AbortController().signal,
    );
    assert.equal(events.at(-1).type, "done");
  } finally {
    globalThis.fetch = original;
    if (previous === undefined) delete process.env.AI_SERVICE_TOKEN;
    else process.env.AI_SERVICE_TOKEN = previous;
  }
});
test("upstream credentials and error bodies are never exposed", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response("private provider error", { status: 403 });
  try {
    await assert.rejects(
      runAgent(request, () => {}, new AbortController().signal),
      (error) =>
        error instanceof Error && !error.message.includes("private provider"),
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("a disconnected teaching stream cannot appear complete", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response('{"type":"delta","text":"Part of an explanation"}\n');
  try {
    await assert.rejects(
      runAgent(request, () => {}, new AbortController().signal),
      /stopped before finishing/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
