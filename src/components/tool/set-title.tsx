"use client";

import { useRef, useState } from "react";
import type { Locale } from "@/lib/specs";
import { t } from "@/lib/i18n";

/** Set title with an inline rename: Enter or leaving the field saves, Escape cancels. The app name stays separate. */
export function SetTitle({ locale, name, onRename }: { locale: Locale; name: string; onRename: (name: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const shown = name.trim() || "Composition";
  function finish(save: boolean) {
    if (draft === null) return;
    const next = draft.trim().slice(0, 80);
    if (save && next && next !== name) onRename(next);
    setDraft(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }
  if (draft !== null) {
    return (
      <div className="tool-set-title is-editing">
        <label className="sr-only" htmlFor="tool-set-name">{t(locale, "tool_set_rename_label")}</label>
        <input
          id="tool-set-name"
          data-testid="tool-set-name"
          className="ds-input"
          value={draft}
          maxLength={80}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => finish(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); finish(true); }
            if (event.key === "Escape") { event.preventDefault(); finish(false); }
          }}
        />
      </div>
    );
  }
  return (
    <div className="tool-set-title">
      <h1>{shown}</h1>
      <button
        ref={triggerRef}
        type="button"
        className="tool-set-rename"
        data-testid="tool-set-rename"
        aria-label={`${t(locale, "tool_set_rename")} ${shown}`}
        onClick={() => setDraft(name)}
      >
        {t(locale, "tool_set_rename")}
      </button>
    </div>
  );
}
