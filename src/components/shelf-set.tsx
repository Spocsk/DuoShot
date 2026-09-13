"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { t, tf } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { ShelfInnerShot, ShelfShot } from "@/components/harbor-ui";
import { prefersReducedMotion } from "@/lib/motion";

const SHOTS = [0, 1, 2] as const;
type Size = "outer" | "inner";

export function ShelfSet({ locale }: { locale: Locale }) {
  const [size, setSize] = useState<Size>("outer");
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = strip.current;
    if (!node) return;
    if (prefersReducedMotion()) {
      gsap.set(node, { opacity: 1 });
      return;
    }
    const tween = gsap.fromTo(
      node,
      { opacity: 0.4 },
      { opacity: 1, duration: 0.42, ease: "power3.out" },
    );
    return () => {
      tween.kill();
    };
  }, [size]);

  return (
    <div className="shelf-set">
      <div
        className="ds-seg shelf-tabs"
        role="tablist"
        aria-label={t(locale, "shelf_size")}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          setSize((current) => (current === "outer" ? "inner" : "outer"));
        }}
      >
        <button
          type="button"
          role="tab"
          id="shelf-tab-outer"
          aria-controls="shelf-panel"
          aria-selected={size === "outer"}
          className={size === "outer" ? "is-on" : ""}
          onClick={() => setSize("outer")}
        >
          {t(locale, "shelf_tab_outer")}
        </button>
        <button
          type="button"
          role="tab"
          id="shelf-tab-inner"
          aria-controls="shelf-panel"
          aria-selected={size === "inner"}
          className={size === "inner" ? "is-on" : ""}
          onClick={() => setSize("inner")}
        >
          {t(locale, "shelf_tab_inner")}
        </button>
      </div>
      <p className="duo-caption mt-4 text-left">
        {size === "outer" ? t(locale, "shelf_outer") : t(locale, "shelf_inner")}
      </p>
      <div
        ref={strip}
        id="shelf-panel"
        role="tabpanel"
        aria-labelledby={size === "outer" ? "shelf-tab-outer" : "shelf-tab-inner"}
        className={`shelf-strip is-${size}`}
      >
        {SHOTS.map((index) => (
          <figure key={`${size}-${index}`}>
            <div className={`shelf-frame ${size === "outer" ? "shelf-outer" : "shelf-inner"}`}>
              {size === "outer" ? <ShelfShot index={index} /> : <ShelfInnerShot index={index} />}
            </div>
            <figcaption className="duo-caption">
              {tf(locale, size === "outer" ? "shelf_file_outer" : "shelf_file_inner", {
                n: String(index + 1).padStart(2, "0"),
              })}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
