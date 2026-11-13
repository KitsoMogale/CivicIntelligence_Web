import { spawnSync } from "node:child_process";
const env = {
  ...process.env,
  DATABASE_URL:
    "postgresql+psycopg://civic:local-development-only@127.0.0.1:55432/civic",
};
for (const args of [
  ["-m", "alembic", "-c", "backend/alembic.ini", "upgrade", "head"],
  ["-m", "backend.seed"],
  ["-m", "backend.seed"],
  ["-m", "backend.check_database"],
]) {
  const r = spawnSync("backend/.venv/Scripts/python.exe", args, {
    env,
    stdio: "inherit",
  });
  if (r.status) process.exit(r.status);
}
