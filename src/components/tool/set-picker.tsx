"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Locale } from "@/lib/specs";
import type { SetMeta } from "@/lib/sets-store";
import { t, tf } from "@/lib/i18n";

/** Open/close state, outside-click dismissal and keyboard navigation of the app (set) listbox. */
export function useSetsMenu() {
  const setsRef = useRef<HTMLDetailsElement>(null);
  const [setsOpen, setSetsOpen] = useState(false);
  const [setsClosing, setSetsClosing] = useState(false);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      const root = setsRef.current;
      if (!root?.open) return;
      if (!root.contains(event.target as Node)) root.removeAttribute("open");
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setsRef.current?.removeAttribute("open");
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function closeSets() {
    if (!setsRef.current?.open) {
      setSetsOpen(false);
      setSetsClosing(false);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setsRef.current.removeAttribute("open");
      setSetsOpen(false);
      setSetsClosing(false);
      return;
    }
    setSetsOpen(false);
    setSetsClosing(true);
    const closeMs =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dropdown-close-dur")) || 150;
    window.setTimeout(() => {
      setsRef.current?.removeAttribute("open");
      setSetsClosing(false);
    }, closeMs);
  }

  function onSetsTriggerKey(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const root = setsRef.current;
    if (!root) return;
    root.setAttribute("open", "");
    setSetsOpen(true);
    const options = root.querySelectorAll<HTMLButtonElement>('[role="option"]');
    const target = event.key === "ArrowUp" ? options[options.length - 1] : options[0];
    queueMicrotask(() => target?.focus());
  }

  function onSetsMenuKey(event: ReactKeyboardEvent<HTMLUListElement>) {
    const options = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]')];
    if (!options.length) return;
    const index = options.findIndex((el) => el === document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      options[(index + 1 + options.length) % options.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      options[(index - 1 + options.length) % options.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      options[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      options[options.length - 1]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeSets();
      (setsRef.current?.querySelector("summary") as HTMLElement | null)?.focus();
    }
  }

  return { setsRef, setsOpen, setSetsOpen, setsClosing, setSetsClosing, closeSets, onSetsTriggerKey, onSetsMenuKey };
}

export function SetPicker({
  locale,
  hydrated,
  sets,
  active,
  menu,
  switchSet,
  addSet,
  removeSet,
}: {
  locale: Locale;
  hydrated: boolean;
  sets: SetMeta[];
  active: SetMeta | undefined;
  menu: ReturnType<typeof useSetsMenu>;
  switchSet: (id: string) => Promise<void>;
  addSet: () => void;
  removeSet: (id: string) => Promise<void>;
}) {
  const { setsRef, setsOpen, setSetsOpen, setsClosing, setSetsClosing, closeSets, onSetsTriggerKey, onSetsMenuKey } = menu;
  return (
      <div className="ds-set-bar">
      <div className="ds-field !mt-0 min-w-0 flex-1 basis-64">
        <p className="ds-label" id="tool-sets-label">
          {t(locale, "tool_sets")}
        </p>
        <details
          className="ds-listbox"
          ref={setsRef}
          onToggle={(event) => {
            if (event.currentTarget.open) {
              setSetsOpen(true);
              setSetsClosing(false);
            }
          }}
        >
          <summary
            id="tool-sets-trigger"
            className="ds-listbox-trigger"
            data-testid="tool-sets"
            data-ready={hydrated ? "true" : "false"}
            aria-haspopup="listbox"
            aria-expanded={setsOpen}
            aria-controls="tool-sets-menu"
            aria-labelledby="tool-sets-label"
            aria-describedby="tool-sets-description"
            onClick={(event) => {
              if (setsRef.current?.open) {
                event.preventDefault();
                closeSets();
              }
            }}
            onKeyDown={onSetsTriggerKey}
          >
            <span>{active?.name?.trim() ? active.name : t(locale, "tool_label_app")}</span>
            <span className="ds-listbox-caret" aria-hidden="true" />
          </summary>
          <ul
            id="tool-sets-menu"
            className={`ds-listbox-menu t-dropdown ${setsOpen ? "is-open" : ""} ${setsClosing ? "is-closing" : ""}`}
            data-origin="top-left"
            role="listbox"
            aria-labelledby="tool-sets-label"
            data-testid="tool-sets-menu"
            onKeyDown={onSetsMenuKey}
          >
            {sets.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={item.id === active?.id}
                  className={`ds-listbox-option ${item.id === active?.id ? "is-on" : ""}`}
                  onClick={() => {
                    closeSets();
                    void switchSet(item.id);
                  }}
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </details>
      </div>
      <div className="ds-set-actions">
        <button type="button" className="ds-cta-ghost" data-testid="tool-set-new" onClick={addSet}>
          {t(locale, "tool_set_new")}
        </button>
        {sets.length > 1 ? (
          <button
            type="button"
            className="ds-text-btn"
            data-testid="tool-set-delete"
            aria-label={tf(locale, "tool_set_delete", { name: active?.name?.trim() || t(locale, "tool_label_app") })}
            onClick={() => active && void removeSet(active.id)}
          >
            {t(locale, "tool_set_delete_short")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
