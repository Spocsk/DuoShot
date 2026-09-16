"use client";

import { useState } from "react";

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="mt-8">
      {items.map((item) => {
        const isOpen = open === item.q;
        return (
          <div key={item.q} className="t-acc border-t border-[var(--line)] py-2" data-open={isOpen ? "true" : "false"}>
            <button
              type="button"
              className="t-acc-head flex w-full items-center justify-between gap-4 py-4 text-left text-lg"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : item.q)}
            >
              <span>{item.q}</span>
              <span className="t-acc-chevron" aria-hidden="true">
                <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M4 6.5L8 10.5L12 6.5" />
                </svg>
              </span>
            </button>
            <div className="t-acc-panel">
              <div className="t-acc-panel-inner">
                <p className="max-w-3xl pb-4 text-[var(--muted)]">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
