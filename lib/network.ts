import { z } from "zod";
import { entityById, relationships } from "./knowledge";
import { relationshipInTime } from "./map-data";
import type { Relationship } from "./types";
export const networkSchema = z
  .object({
    startId: z.string().min(1),
    targetId: z.string().min(1).nullable().default(null),
    depth: z.number().int().min(1).max(6).default(3),
    direction: z.enum(["outgoing", "incoming", "both"]).default("both"),
    relationshipType: z.string().default(""),
    includeDirectory: z.boolean().default(false),
  })
  .strict();
export type NetworkQuery = z.infer<typeof networkSchema>;
export type NetworkResult = {
  nodeIds: string[];
  relationshipIds: string[];
  found: boolean;
  truncated: boolean;
  path: {
    from: string;
    to: string;
    relationship: Relationship;
    reverse: boolean;
  }[];
};
const directoryTypes = new Set([
  "INCLUDES",
  "HAS_CAPITAL",
  "LOCATED_IN",
  "PART_OF",
  "CAPITAL_OF",
  "SECTOR_PARTICIPANT",
]);
export function traceNetwork(
  input: NetworkQuery,
  country: string,
  range: [string, string] | null = null,
): NetworkResult {
  const query = networkSchema.parse(input);
  for (const id of [query.startId, query.targetId])
    if (id && entityById(id)?.country !== country)
      throw new Error("Network entity outside active country");
  const edges = relationships.filter(
    (r) =>
      entityById(r.source)?.country === country &&
      entityById(r.target)?.country === country &&
      (!query.relationshipType || r.type === query.relationshipType) &&
      (query.includeDirectory || !directoryTypes.has(r.type)) &&
      relationshipInTime(r, range),
  );
  const adjacency = new Map<
    string,
    { to: string; relationship: Relationship; reverse: boolean }[]
  >();
  function add(
    from: string,
    to: string,
    relationship: Relationship,
    reverse: boolean,
  ) {
    adjacency.set(from, [
      ...(adjacency.get(from) ?? []),
      { to, relationship, reverse },
    ]);
  }
  for (const r of edges) {
    if (query.direction !== "incoming") add(r.source, r.target, r, false);
    if (query.direction !== "outgoing") add(r.target, r.source, r, true);
  }
  const visited = new Set([query.startId]),
    chosen = new Set<string>(),
    queue = [{ id: query.startId, depth: 0 }],
    parent = new Map<
      string,
      { from: string; to: string; relationship: Relationship; reverse: boolean }
    >();
  let truncated = false;
  while (queue.length) {
    const current = queue.shift()!;
    if (current.id === query.targetId) break;
    if (current.depth >= query.depth) continue;
    for (const edge of adjacency.get(current.id) ?? []) {
      if (!visited.has(edge.to)) {
        if (visited.size >= 150) {
          truncated = true;
          continue;
        }
        visited.add(edge.to);
        parent.set(edge.to, { from: current.id, ...edge });
        queue.push({ id: edge.to, depth: current.depth + 1 });
      }
      if (chosen.size < 200) chosen.add(edge.relationship.id);
      else truncated = true;
    }
  }
  if (query.targetId) {
    const path: NetworkResult["path"] = [];
    let id = query.targetId;
    while (id !== query.startId && parent.has(id)) {
      const step = parent.get(id)!;
      path.unshift(step);
      id = step.from;
    }
    const found = id === query.startId;
    return {
      nodeIds: found
        ? [query.startId, ...path.map((p) => p.to)]
        : [query.startId],
      relationshipIds: found ? path.map((p) => p.relationship.id) : [],
      found,
      truncated,
      path: found ? path : [],
    };
  }
  return {
    nodeIds: [...visited],
    relationshipIds: [...chosen],
    found: true,
    truncated,
    path: [],
  };
}
