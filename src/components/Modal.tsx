"use client";

import { useEffect } from "react";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-card p-5 shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl">{title}</h2>
          <button onClick={onClose} className="rounded-full px-2 text-2xl leading-none text-muted hover:text-fg" aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-base outline-none placeholder:text-muted focus:border-accent";
export const buttonClass =
  "rounded-full bg-fg px-4 py-2 text-sm font-medium text-bg transition hover:opacity-85 disabled:opacity-50";
export const ghostButtonClass =
  "rounded-full border border-border px-4 py-2 text-sm font-medium transition hover:bg-chip disabled:opacity-50";
