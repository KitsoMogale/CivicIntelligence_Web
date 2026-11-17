import { writeFileSync } from "node:fs";
import { teachingContract } from "../lib/teaching-contract";
const schema = teachingContract();
writeFileSync(
  "backend/canvas-contract.json",
  JSON.stringify(schema, null, 2) + "\n",
);
