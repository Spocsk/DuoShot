"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

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
