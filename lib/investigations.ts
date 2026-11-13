import { z } from "zod";
import {
  normalizeExploration,
  explorationSnapshot,
  initialExploration,
  type Exploration,
} from "./exploration";
import { countries, domains } from "./knowledge";
export type Investigation = {
  id: string;
  title: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  context: Exploration;
};
const schema = z
  .object({
    id: z.string().min(1).max(120),
    title: z.string().trim().min(1).max(160),
    note: z.string().max(12000),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    context: z.unknown(),
  })
  .strict();
export function parseInvestigation(value: unknown): Investigation {
  const parsed = schema.parse(value);
  return { ...parsed, context: normalizeExploration(parsed.context) };
}
export function newInvestigation(context: Exploration): Investigation {
  const date = new Date().toISOString();
  return {
    id: globalThis.crypto.randomUUID(),
    title: context.country.name + " · " + context.domain,
    note: "",
    createdAt: date,
    updatedAt: date,
    context: explorationSnapshot(context),
  };
}
const key = "civic-investigations-v2";
export function readInvestigations(): Investigation[] {
  let raw = localStorage.getItem(key);
  if (raw === null) {
    const legacy = JSON.parse(localStorage.getItem("civic-saved") ?? "[]");
    const migrated: Investigation[] = [];
    for (const value of Array.isArray(legacy) ? legacy.slice(0, 50) : []) {
      try {
        const country = countries.find((c) => c.code === value.country?.code);
        const domain = domains.find((d) => d.id === value.domain);
        if (!country || !domain) continue;
        const context = normalizeExploration({
          ...initialExploration,
          country,
          domain: domain.id,
          mode: value.mode,
          expanded: country.code === "ZA" ? [domain.root] : [],
        });
        const item = newInvestigation(context);
        item.title =
          typeof value.name === "string" && value.name.trim()
            ? value.name.trim().slice(0, 160)
            : item.title;
        migrated.push(item);
      } catch {}
    }
    raw = JSON.stringify(migrated);
    if (migrated.length) localStorage.setItem(key, raw);
  }
  const input = JSON.parse(raw);
  if (!Array.isArray(input)) return [];
  return input.slice(0, 50).flatMap((value) => {
    try {
      return [parseInvestigation(value)];
    } catch {
      return [];
    }
  });
}
export function writeInvestigations(values: Investigation[]) {
  if (values.length > 50)
    throw new Error(
      "Keep up to 50 investigations on this device; export an older one first.",
    );
  localStorage.setItem(key, JSON.stringify(values.map(parseInvestigation)));
}
