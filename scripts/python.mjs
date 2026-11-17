import { spawn } from "node:child_process";
import path from "node:path";
import nextEnv from "@next/env";
// Load the same local server environment as Next, without displaying credentials.
nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const python = path.resolve(
  "backend/.venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
const child = spawn(python, process.argv.slice(2), { stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
