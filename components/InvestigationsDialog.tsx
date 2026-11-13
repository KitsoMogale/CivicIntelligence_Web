"use client";
import { useRef, useState } from "react";
import { Bookmark, Download, Upload, X } from "lucide-react";
import { useExplorer } from "@/lib/store";
import {
  parseInvestigation,
  writeInvestigations,
  type Investigation,
} from "@/lib/investigations";
export default function InvestigationsDialog({
  values,
  onChange,
  close,
}: {
  values: Investigation[];
  onChange: (v: Investigation[]) => void;
  close: () => void;
}) {
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  function save(next: Investigation[]) {
    try {
      writeInvestigations(next);
      onChange(next);
      setMessage("");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not save on this device",
      );
    }
  }
  function exportItem(item: Investigation) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(item, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "civic-investigation-" + item.id + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="modal investigations-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Saved explorations"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="icon-button modal-close"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={18} />
        </button>
        <span className="eyebrow">YOUR INVESTIGATIONS · ON THIS DEVICE</span>
        <h2>Return to a connection.</h2>
        <p>
          Each investigation preserves the selected entity, expanded nodes,
          region, data filters and notes. Export a copy to keep it or move it to
          another browser.
        </p>
        <button
          className="outline-button"
          onClick={() => input.current?.click()}
        >
          <Upload size={14} /> Import investigation
        </button>
        <input
          type="file"
          accept=".json,application/json"
          ref={input}
          hidden
          aria-label="Import investigation file"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              if (file.size > 200000)
                throw new Error(
                  "Choose an investigation file smaller than 200 KB",
                );
              const item = parseInvestigation(JSON.parse(await file.text()));
              save([item, ...values.filter((v) => v.id !== item.id)]);
            } catch (err) {
              setMessage(
                err instanceof Error
                  ? err.message
                  : "Invalid investigation file",
              );
            }
            e.target.value = "";
          }}
        />
        {values.length ? (
          values.map((item) => (
            <article className="saved-item investigation-item" key={item.id}>
              <div className="investigation-title">
                <Bookmark size={16} />
                <input
                  aria-label={"Investigation title " + item.id}
                  maxLength={160}
                  value={item.title}
                  onChange={(e) =>
                    onChange(
                      values.map((v) =>
                        v.id === item.id ? { ...v, title: e.target.value } : v,
                      ),
                    )
                  }
                  onBlur={() =>
                    save(
                      values.map((v) =>
                        v.id === item.id
                          ? {
                              ...v,
                              title: v.title.trim() || "Untitled investigation",
                              updatedAt: new Date().toISOString(),
                            }
                          : v,
                      ),
                    )
                  }
                />
                <button
                  aria-label={"Remove saved exploration " + item.title}
                  onClick={() => save(values.filter((v) => v.id !== item.id))}
                >
                  <X size={14} />
                </button>
              </div>
              <small>
                {item.context.country.name} · {item.context.mode} · saved{" "}
                {new Date(item.createdAt).toLocaleDateString("en-ZA")}
              </small>
              <label>
                Investigation notes
                <textarea
                  aria-label={"Notes for " + item.title}
                  rows={3}
                  maxLength={12000}
                  value={item.note}
                  onChange={(e) =>
                    onChange(
                      values.map((v) =>
                        v.id === item.id ? { ...v, note: e.target.value } : v,
                      ),
                    )
                  }
                  onBlur={() =>
                    save(
                      values.map((v) =>
                        v.id === item.id
                          ? { ...v, updatedAt: new Date().toISOString() }
                          : v,
                      ),
                    )
                  }
                  placeholder="Questions, findings and sources to revisit"
                />
              </label>
              <div className="investigation-actions">
                <button
                  className="outline-button"
                  onClick={() => {
                    try {
                      useExplorer.getState().restore(item.context);
                      close();
                    } catch {
                      setMessage(
                        "Some records in this investigation are no longer available. Import a current version.",
                      );
                    }
                  }}
                >
                  Open exploration ↗
                </button>
                <button
                  className="outline-button"
                  onClick={() => exportItem(item)}
                >
                  <Download size={13} /> Export investigation
                </button>
              </div>
            </article>
          ))
        ) : (
          <p>
            Use the bookmark above the canvas to save your current exploration.
          </p>
        )}
        {message && <p role="alert">{message}</p>}
      </section>
    </div>
  );
}
