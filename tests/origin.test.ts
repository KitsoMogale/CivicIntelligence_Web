import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedOrigin } from "../lib/request-security";
test("real browser Host is accepted when Next normalizes the internal request URL", () => {
  const req = new Request("http://localhost:3000/api/chat", {
    headers: { Host: "127.0.0.1:3000", Origin: "http://127.0.0.1:3000" },
  });
  assert.equal(isAllowedOrigin(req), true);
});
test("foreign origins remain blocked even with a spoofed forwarding header", () => {
  const req = new Request("http://localhost:3000/api/chat", {
    headers: {
      Host: "127.0.0.1:3000",
      Origin: "https://attacker.example",
      "x-forwarded-host": "attacker.example",
    },
  });
  assert.equal(isAllowedOrigin(req), false);
});
