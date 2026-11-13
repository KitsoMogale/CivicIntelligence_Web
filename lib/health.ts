import release from "@/data/release.json";
export async function knowledgeReadiness(base = process.env.KNOWLEDGE_API_URL) {
  if (!base)
    return { ready: true, source: "curated-seed", revision: release.revision };
  try {
    const response = await fetch(base.replace(/\/$/, "") + "/health/ready", {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    if (!response.ok)
      return {
        ready: false,
        source: "external",
        reason: "Knowledge service is not ready",
      };
    const data = await response.json();
    if (data.status !== "ready" || data.revision !== release.revision)
      return {
        ready: false,
        source: "external",
        reason: "Knowledge catalog release mismatch",
      };
    return { ready: true, source: "external", revision: release.revision };
  } catch {
    return {
      ready: false,
      source: "external",
      reason: "Knowledge service is unavailable",
    };
  }
}
