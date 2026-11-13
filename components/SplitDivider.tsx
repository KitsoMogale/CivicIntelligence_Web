"use client";
import { useEffect, useRef, useState } from "react";
import { useExplorer } from "@/lib/store";
export default function SplitDivider() {
  const ratio = useExplorer((s) => s.splitRatio),
    [stacked, setStacked] = useState(false),
    draft = useRef(ratio),
    drag = useRef<DOMRect | null>(null);
  useEffect(() => {
    const query = matchMedia("(max-width: 760px)"),
      update = () => setStacked(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  function commit(value: number) {
    useExplorer
      .getState()
      .navigate(
        { splitRatio: Math.min(75, Math.max(25, value)) },
        "Resize split canvas",
      );
  }
  return (
    <div
      className="split-divider"
      role="separator"
      aria-label="Resize map and companion view"
      aria-orientation={stacked ? "horizontal" : "vertical"}
      aria-valuemin={25}
      aria-valuemax={75}
      aria-valuenow={Math.round(ratio)}
      tabIndex={0}
      onPointerDown={(e) => {
        e.preventDefault();
        drag.current = e.currentTarget.parentElement!.getBoundingClientRect();
        draft.current = ratio;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const rect = drag.current;
        draft.current = Math.min(
          75,
          Math.max(
            25,
            100 *
              (stacked
                ? (e.clientY - rect.top) / rect.height
                : (e.clientX - rect.left) / rect.width),
          ),
        );
        e.currentTarget.parentElement!.style.setProperty(
          "--split-ratio",
          draft.current + "%",
        );
      }}
      onPointerUp={(e) => {
        if (!drag.current) return;
        drag.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
        commit(draft.current);
      }}
      onPointerCancel={(e) => {
        drag.current = null;
        e.currentTarget.parentElement!.style.setProperty(
          "--split-ratio",
          ratio + "%",
        );
      }}
      onDoubleClick={() => commit(50)}
      onKeyDown={(e) => {
        let next = ratio;
        if (e.key === "Home") next = 25;
        else if (e.key === "End") next = 75;
        else if (["ArrowLeft", "ArrowUp"].includes(e.key)) next -= 5;
        else if (["ArrowRight", "ArrowDown"].includes(e.key)) next += 5;
        else return;
        e.preventDefault();
        commit(next);
      }}
    >
      <span />
    </div>
  );
}
