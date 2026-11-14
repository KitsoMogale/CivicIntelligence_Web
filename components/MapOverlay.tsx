"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

export default function MapOverlay({
  label,
  title,
  reopenLabel,
  className,
  children,
}: {
  label: string;
  title: ReactNode;
  reopenLabel: string;
  className: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const toggle = useRef<HTMLButtonElement>(null);
  const focusOnToggle = useRef(false);
  function changeOpen(value: boolean) {
    focusOnToggle.current = true;
    setOpen(value);
  }
  useEffect(() => {
    if (focusOnToggle.current) {
      toggle.current?.focus();
      focusOnToggle.current = false;
    }
  }, [open]);
  if (!open)
    return (
      <button
        ref={toggle}
        className={className + " map-overlay-reopen"}
        aria-label={"Show " + label.toLowerCase()}
        aria-expanded={false}
        onClick={() => changeOpen(true)}
      >
        {reopenLabel}
      </button>
    );
  return (
    <section
      className={className}
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          changeOpen(false);
        }
      }}
    >
      <header className="map-overlay-header">
        <strong>{title}</strong>
        <button
          ref={toggle}
          className="map-overlay-close"
          aria-label={"Close " + label.toLowerCase()}
          onClick={() => changeOpen(false)}
        >
          <X size={15} />
        </button>
      </header>
      {children}
    </section>
  );
}
