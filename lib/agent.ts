import type { z } from "zod";
import { chatRequestSchema } from "./actions";
import { emptyTeachingDocument } from "./teaching";

/** Next protects the browser endpoint; FastAPI owns OpenAI orchestration. */
export async function runAgent(
  request: z.infer<typeof chatRequestSchema>,
  emit: (event: unknown) => void,
  signal: AbortSignal,
) {
  const base = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
  const response = await fetch(base.replace(/\/$/, "") + "/teach", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.AI_SERVICE_TOKEN
        ? { "X-Civic-Service-Token": process.env.AI_SERVICE_TOKEN }
        : {}),
    },
    body: JSON.stringify({
      ...request,
      canvas: request.canvas ?? emptyTeachingDocument,
      revision: request.revision ?? 0,
      canvasActive: request.canvasActive ?? false,
    }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(118000)]),
    cache: "no-store",
  });
  if (!response.ok || !response.body)
    throw new Error(
      "The teaching service is unavailable. Start it with npm run dev:api and check its server configuration.",
    );
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let pending = "",
    finished = false;
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += decoder.decode(value, { stream: !done });
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === "done" || event.type === "error") finished = true;
        emit(event);
      }
      if (done) break;
    }
    if (pending.trim()) {
      const event = JSON.parse(pending);
      finished ||= event.type === "done" || event.type === "error";
      emit(event);
    }
    if (!finished)
      throw new Error(
        "The teaching service stopped before finishing. No canvas changes were applied.",
      );
  } finally {
    await reader.cancel();
  }
}
