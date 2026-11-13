/** Compare browser Origin with the configured public origin or the immutable HTTP Host. */
export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const configured = process.env.APP_ORIGIN;
  const url = new URL(request.url);
  const expected = configured
    ? new URL(configured).origin
    : url.protocol + "//" + (request.headers.get("host") || url.host);
  return origin === expected;
}
