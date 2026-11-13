import { spawn } from "node:child_process";
const port = process.env.VERIFY_PORT ?? "3100";
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", port],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      CIVIC_DIST_DIR: ".next-verify",
      APP_ORIGIN: "http://127.0.0.1:" + port,
      KNOWLEDGE_API_URL: process.env.KNOWLEDGE_API_URL ?? "",
      OPENAI_API_KEY: "",
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
