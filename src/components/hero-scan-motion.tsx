"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Phase name and how long it holds, in ms. CSS in studio.css keys every visual off `data-phase`. */
const PHASES = [
  ["reset", 600],
  ["drop", 1800],
  ["load", 1400],
  ["scan", 2200],
  ["issues", 5500],
] as const;
const FINAL = PHASES.length - 1;
/** The server renders the finished report; it holds this long before the story replays. */
const FIRST_HOLD = 2600;

/**
 * Loops the hero scan: drop the captures, load them, scan them, list what needs fixing.
 * Without script or with reduced motion the finished report stays as the server rendered it.
 * The loop stops off screen and in a hidden tab, and holds on the report while hovered or focused.
 */
export function HeroScanMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let index: number = FINAL;
    let remaining = FIRST_HOLD;
    let startedAt = 0;
    let timer = 0;
    let visible = true;
    let held = false;

    // Hovering or focusing holds only the report, so whoever points at the window gets to read it.
    const running = () => visible && !(held && index === FINAL) && !document.hidden && !reduced.matches;
    const advance = () => {
      timer = 0;
      index = (index + 1) % PHASES.length;
      node.dataset.phase = PHASES[index]![0];
      remaining = PHASES[index]![1];
      schedule();
    };
    const schedule = () => {
      if (timer || !running()) return;
      startedAt = performance.now();
      timer = window.setTimeout(advance, remaining);
    };
    const sync = () => {
      if (reduced.matches) {
        window.clearTimeout(timer);
        timer = 0;
        index = FINAL;
        node.dataset.phase = PHASES[FINAL][0];
      }
      if (running()) {
        schedule();
        return;
      }
      // Hold the current phase; its CSS animations still finish, so a held report is never half drawn.
      if (!timer) return;
      window.clearTimeout(timer);
      timer = 0;
      remaining = Math.max(0, remaining - (performance.now() - startedAt));
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      sync();
    });
    observer.observe(node);
    const hold = () => { held = true; sync(); };
    const release = () => { held = node.matches(":hover") || node.contains(document.activeElement); sync(); };
    node.addEventListener("pointerenter", hold);
    node.addEventListener("pointerleave", release);
    node.addEventListener("focusin", hold);
    node.addEventListener("focusout", release);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    sync();

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      node.removeEventListener("pointerenter", hold);
      node.removeEventListener("pointerleave", release);
      node.removeEventListener("focusin", hold);
      node.removeEventListener("focusout", release);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
    };
  }, []);

  return <div ref={root} className="hero-scan" data-phase={PHASES[FINAL][0]}>{children}</div>;
}
