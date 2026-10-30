"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** Positions of the one-time hint that shows the handle moves, in % of the width. */
const HINT = [50, 34, 64, 50];
const HINT_MS = 1800;

/**
 * Two stacked layers; the after layer is clipped from the handle to the right edge. A native range
 * input sits on top, so mouse, touch, keyboard and screen readers all move the same value.
 */
export function BeforeAfterSlider({ label, before, after }: { label: string; before: ReactNode; after: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const touched = useRef(false);
  const [position, setPosition] = useState(50);

  useEffect(() => {
    const node = root.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const play = () => {
      const start = performance.now();
      const step = (now: number) => {
        if (touched.current) return;
        const progress = Math.min(1, (now - start) / HINT_MS) * (HINT.length - 1);
        const index = Math.min(HINT.length - 2, Math.floor(progress));
        const local = progress - index;
        const eased = local < 0.5 ? 2 * local * local : 1 - (-2 * local + 2) ** 2 / 2;
        setPosition(HINT[index]! + (HINT[index + 1]! - HINT[index]!) * eased);
        if (progress < HINT.length - 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      play();
    }, { threshold: 0.6 });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div ref={root} className="studio-ba-slider" style={{ "--pos": `${position}%` } as CSSProperties}>
    <div className="studio-ba-layer is-before">{before}</div>
    <div className="studio-ba-layer is-after">{after}</div>
    <input
      type="range"
      className="studio-ba-range"
      min={0}
      max={100}
      step={1}
      value={Math.round(position)}
      aria-label={label}
      aria-valuetext={`${Math.round(position)} %`}
      data-testid="before-after-range"
      onPointerDown={() => { touched.current = true; }}
      onKeyDown={() => { touched.current = true; }}
      onChange={(event) => { touched.current = true; setPosition(Number(event.target.value)); }}
    />
    <span className="studio-ba-handle" aria-hidden="true"><span /></span>
  </div>;
}
