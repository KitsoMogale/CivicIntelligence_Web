"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { domains, entityById, relationships } from "./knowledge";
import { validateActions, type CanvasAction } from "./actions";
import type { Country, Domain, Mode } from "./types";
import {
  initialExploration as initial,
  explorationSnapshot as snapshot,
  normalizeExploration,
  type Exploration,
} from "./exploration";
import { legacyLayers, sameCamera, type Camera } from "./canvas";
import { reduceCanvas, entityExpansion, actionLabel } from "./canvas-reducer";
import {
  countryProfile,
  domainRoot,
  supportsCountryMode,
} from "./country-profiles";
type State = Exploration & {
  past: Exploration[];
  future: Exploration[];
  pastLabels: string[];
  futureLabels: string[];
  fitVersion: number;
  hydrated: boolean;
  navigate: (next: Partial<Exploration>, label?: string) => void;
  selectCountry: (c: Country) => void;
  selectDomain: (d: Domain) => void;
  openEntity: (id: string) => void;
  toggleNode: (id: string) => void;
  setMode: (m: Mode) => void;
  fit: () => void;
  back: () => void;
  forward: () => void;
  reset: () => void;
  applyActions: (a: CanvasAction[]) => void;
  restore: (value: unknown) => void;
  openRelationship: (id: string) => void;
  recordCamera: (camera: Camera) => void;
};
export const useExplorer = create<State>()(
  persist(
    (set, get) => ({
      ...structuredClone(initial),
      past: [],
      future: [],
      pastLabels: [],
      futureLabels: [],
      fitVersion: 0,
      hydrated: false,
      navigate: (patch, label = "View changed") => {
        const current = snapshot(get());
        const candidate = { ...current, ...patch };
        if (
          !patch.layers &&
          ["provinceLayer", "populationLayer", "markerLayer"].some(
            (key) => key in patch,
          )
        )
          candidate.layers = legacyLayers(patch, current.layers);
        const next = normalizeExploration(candidate);
        if (JSON.stringify(current) === JSON.stringify(next)) return;
        set((s) => ({
          ...next,
          past: [...s.past.slice(-39), structuredClone(current)],
          future: [],
          pastLabels: [...s.pastLabels.slice(-39), label],
          futureLabels: [],
        }));
      },
      selectCountry: (country) =>
        get().applyActions([
          { type: "SELECT_COUNTRY", payload: { countryCode: country.code } },
        ]),
      selectDomain: (domain) => {
        const root = domainRoot(get().country.code, domain);
        if (!root) return;
        const d = domains.find((d) => d.id === domain)!;
        get().navigate(
          {
            networkTrace: null,
            domain,
            selectedEntity: null,
            selectionIds: [],
            selectedRelationship: null,
            mode:
              domain === "infrastructure"
                ? "flow"
                : domain === "society"
                  ? "data"
                  : "hierarchy",
            expanded: [
              root,
              ...(domain === "government"
                ? countryProfile(get().country.code).defaultExpanded
                : []),
            ],
          },
          "Explore " + d.short,
        );
      },
      openEntity: (id) => {
        if (entityById(id)?.country === get().country.code)
          get().applyActions([
            { type: "OPEN_ENTITY", payload: { entityId: id } },
          ]);
      },
      toggleNode: (id) => {
        if (entityById(id)?.country !== get().country.code) return;
        get().navigate(
          {
            expanded: get().expanded.includes(id)
              ? get().expanded.filter((n) => n !== id)
              : [...get().expanded, id],
          },
          "Toggle connections",
        );
      },
      openRelationship: (id) => {
        const link = relationships.find((r) => r.id === id);
        if (!link || entityById(link.source)?.country !== get().country.code)
          return;
        const s = get();
        get().navigate(
          {
            selectedEntity: link.source,
            selectionIds: [link.source, link.target],
            selectedRelationship: id,
            highlightedRelationshipIds: [id],
            domain: entityById(link.source)!.domain,
            expanded: entityExpansion(s, link.source),
          },
          "Inspect relationship",
        );
      },
      setMode: (mode) => {
        if (!supportsCountryMode(get().country.code, mode)) return;
        get().applyActions([
          { type: "SET_VISUALIZATION_MODE", payload: { mode } },
        ]);
      },
      fit: () => {
        get().applyActions([{ type: "FIT_CANVAS", payload: {} }]);
      },
      back: () =>
        set((s) =>
          s.past.length
            ? {
                ...s.past.at(-1)!,
                past: s.past.slice(0, -1),
                future: [structuredClone(snapshot(s)), ...s.future].slice(
                  0,
                  40,
                ),
                pastLabels: s.pastLabels.slice(0, -1),
                futureLabels: [
                  s.pastLabels.at(-1) ?? "View changed",
                  ...s.futureLabels,
                ].slice(0, 40),
              }
            : {},
        ),
      forward: () =>
        set((s) =>
          s.future.length
            ? {
                ...s.future[0],
                past: [...s.past, structuredClone(snapshot(s))],
                future: s.future.slice(1),
                pastLabels: [
                  ...s.pastLabels,
                  s.futureLabels[0] ?? "View changed",
                ],
                futureLabels: s.futureLabels.slice(1),
              }
            : {},
        ),
      reset: () => get().applyActions([{ type: "RESET_VIEW", payload: {} }]),
      restore: (value) =>
        get().navigate(normalizeExploration(value), "Restore investigation"),
      recordCamera: (camera) => {
        if (!sameCamera(camera, get().camera))
          get().navigate({ camera }, "Move map");
      },
      applyActions: (input) => {
        const actions = validateActions(input, get().country.code);
        if (actions[0]?.type === "UNDO") {
          get().back();
          return;
        }
        if (actions[0]?.type === "REDO") {
          get().forward();
          return;
        }
        get().navigate(
          reduceCanvas(snapshot(get()), actions),
          actionLabel(actions),
        );
        if (actions.some((a) => a.type === "FIT_CANVAS"))
          set((s) => ({ fitVersion: s.fitVersion + 1 }));
      },
    }),
    {
      name: "civic-exploration-v1",
      version: 5,
      partialize: (s) => snapshot(s),
      migrate: (value) => {
        try {
          const stored = value && typeof value === "object" ? value : {};
          return normalizeExploration({
            ...stored,
            boundaryEdition:
              "boundaryEdition" in stored ? stored.boundaryEdition : "mdb-2026",
            basemap: "basemap" in stored ? stored.basemap : "streets",
          });
        } catch {
          return structuredClone(initial);
        }
      },
      merge: (persisted, current) => {
        try {
          return { ...current, ...normalizeExploration(persisted) };
        } catch {
          return current;
        }
      },
    },
  ),
);
