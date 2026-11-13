import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root = process.cwd(),
  tools = path.join(root, ".tools");
await fs.mkdir(tools, { recursive: true });
const zip = path.join(tools, "uv.zip"),
  response = await fetch(
    "https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-pc-windows-msvc.zip",
    { signal: AbortSignal.timeout(90000) },
  );
if (!response.ok) throw new Error("uv download failed: " + response.status);
await fs.writeFile(zip, Buffer.from(await response.arrayBuffer()));
let r = spawnSync("tar.exe", ["-xf", zip, "-C", tools], { stdio: "inherit" });
if (r.status) process.exit(r.status);
const env = {
  ...process.env,
  UV_PYTHON_INSTALL_DIR: path.join(root, ".python"),
  UV_CACHE_DIR: path.join(root, ".uv-cache"),
  UV_PYTHON_BIN_DIR: path.join(root, ".tools", "python-bin"),
};
for (const args of [
  ["python", "install", "3.12"],
  ["venv", "backend/.venv", "--python", "3.12"],
  [
    "pip",
    "install",
    "--python",
    "backend/.venv/Scripts/python.exe",
    "-r",
    "backend/requirements.txt",
  ],
]) {
  r = spawnSync(path.join(tools, "uv.exe"), args, { stdio: "inherit", env });
  if (r.status) process.exit(r.status);
}
console.log("Project-local Python environment ready.");
