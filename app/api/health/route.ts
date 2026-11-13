export const dynamic = "force-dynamic";
import release from "@/data/release.json";
import { knowledgeReadiness } from "@/lib/health";
export async function GET(req: Request) {
  const deep = new URL(req.url).searchParams.get("deep") === "1";
  const readiness = deep ? await knowledgeReadiness() : null;
  return Response.json(
    {
      status: readiness && !readiness.ready ? "degraded" : "ok",
      ai: process.env.OPENAI_API_KEY ? "configured" : "local-guide",
      knowledge: process.env.KNOWLEDGE_API_URL ? "external" : "curated-seed",
      version: release.version,
      revision: release.revision,
      counts: release.counts,
      ...(readiness ? { readiness } : {}),
    },
    {
      status: readiness && !readiness.ready ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
