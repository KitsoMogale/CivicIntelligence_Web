const buckets = new Map<string, { count: number; expires: number }>();
export async function rateLimit(key: string, paid: boolean) {
  const url = process.env.UPSTASH_REDIS_REST_URL,
    token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const bucket = "civic:" + key + ":" + Math.floor(Date.now() / 60000);
    const response = await fetch(url + "/pipeline", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", bucket],
        ["EXPIRE", bucket, 120],
      ]),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("Rate limiter unavailable");
    const values = await response.json();
    return Number(values[0].result) <= 12;
  }
  if (paid && process.env.NODE_ENV === "production")
    throw new Error(
      "Configure shared rate limiting before enabling production AI",
    );
  const now = Date.now();
  for (const [k, v] of buckets) if (v.expires <= now) buckets.delete(k);
  const b = buckets.get(key) ?? { count: 0, expires: now + 60000 };
  b.count++;
  buckets.set(key, b);
  return b.count <= 20;
}
