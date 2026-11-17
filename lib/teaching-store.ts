"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  emptyTeachingDocument,
  reduceTeaching,
  validateTeachingDocument,
  type TeachingDocument,
} from "./teaching";
type State = {
  document: TeachingDocument;
  revision: number;
  active: boolean;
  past: TeachingDocument[];
  future: TeachingDocument[];
  apply: (commands: unknown, expectedRevision?: number) => void;
  setActive: (active: boolean) => void;
  undo: () => void;
  redo: () => void;
};
export const useTeaching = create<State>()(
  persist(
    (set, get) => ({
      document: structuredClone(emptyTeachingDocument),
      revision: 0,
      active: false,
      past: [],
      future: [],
      setActive: (active) => {
        if (active !== get().active)
          set((s) => ({ active, revision: s.revision + 1 }));
      },
      apply: (commands, expectedRevision) => {
        const s = get();
        if (expectedRevision !== undefined && s.revision !== expectedRevision)
          throw new Error(
            "Your canvas changed while the AI was responding. Ask again to use the current canvas.",
          );
        const document = reduceTeaching(s.document, commands);
        if (JSON.stringify(document) === JSON.stringify(s.document)) return;
        set({
          document,
          revision: s.revision + 1,
          past: [...s.past.slice(-19), s.document],
          future: [],
          active: true,
        });
      },
      undo: () => {
        const s = get();
        if (s.past.length)
          set({
            document: s.past.at(-1)!,
            past: s.past.slice(0, -1),
            future: [s.document, ...s.future].slice(0, 20),
            revision: s.revision + 1,
          });
      },
      redo: () => {
        const s = get();
        if (s.future.length)
          set({
            document: s.future[0],
            future: s.future.slice(1),
            past: [...s.past, s.document].slice(-20),
            revision: s.revision + 1,
          });
      },
    }),
    {
      name: "civic-teaching-canvas-v1",
      version: 1,
      partialize: (s) => ({ document: s.document, active: s.active }),
      merge: (saved, current) => {
        try {
          const value = saved as { document: unknown; active: boolean };
          return {
            ...current,
            document: validateTeachingDocument(value.document),
            active: !!value.active,
          };
        } catch {
          return current;
        }
      },
    },
  ),
);
