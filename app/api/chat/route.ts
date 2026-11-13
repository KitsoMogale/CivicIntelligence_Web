import { isAllowedOrigin } from "@/lib/request-security";
import { chatRequestSchema } from "@/lib/actions";
import { localGuide } from "@/lib/guide";
import { runAgent } from "@/lib/agent";
import { rateLimit } from "@/lib/rate-limit";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: Request) {
  try {
    if (!isAllowedOrigin(req))
      return Response.json(
        { error: "Request origin is not allowed." },
        { status: 403 },
      );
    if (Number(req.headers.get("content-length") || 0) > 48000)
      return Response.json({ error: "Message is too large." }, { status: 413 });
    const raw = await req.text();
    if (raw.length > 48000)
      return Response.json({ error: "Message is too large." }, { status: 413 });
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return Response.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const parsed = chatRequestSchema.safeParse(json);
    if (!parsed.success)
      return Response.json(
        { error: "Invalid message or exploration context." },
        { status: 400 },
      );
    const paid = !!process.env.OPENAI_API_KEY,
      ip = req.headers.get("x-nf-client-connection-ip") || "local";
    if (!(await rateLimit(ip, paid)))
      return Response.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (event: unknown) => {
          if (!req.signal.aborted)
            controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        };
        try {
          if (paid) await runAgent(parsed.data, emit, req.signal);
          else {
            const reply = localGuide(parsed.data);
            emit({ type: "delta", text: reply.message });
            emit({
              type: "done",
              actions: reply.actions,
              sourceIds: reply.sourceIds,
              engine: "Local guide",
            });
          }
        } catch {
          emit({
            type: "error",
            message:
              "The assistant could not complete the request. Check configuration and try again.",
          });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      {
        error:
          "Assistant service unavailable. Production AI requires shared rate limiting.",
      },
      { status: 503 },
    );
  }
}
