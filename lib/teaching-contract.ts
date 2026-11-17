import { z } from "zod";
import { teachingCommandSchema, teachingDocumentSchema } from "./teaching";
function exactTuples(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(exactTuples);
  if (!value || typeof value !== "object") return value;
  const node = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, exactTuples(child)]),
  );
  // prefixItems constrains existing items but does not require them.
  if (Array.isArray(node.prefixItems)) {
    node.minItems = node.prefixItems.length;
    node.maxItems = node.prefixItems.length;
  }
  return node;
}
export function teachingContract() {
  return {
    command: exactTuples(z.toJSONSchema(teachingCommandSchema)),
    document: exactTuples(z.toJSONSchema(teachingDocumentSchema)),
  };
}
