"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { MAX_IMAGES } from "@/lib/specs";
import { useI18n } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n/types";

export type ToolPanel = "captures" | "adjust" | "review" | "export";
export type StepStatus = "done" | "todo" | "current";

const STEPS = ["captures", "adjust", "review", "export"] as const;
const STEP_KEYS: Record<ToolPanel, MessageKey> = { captures: "tool_step_import", adjust: "tool_step_adjust", review: "tool_step_review", export: "tool_step_export" };

/** Importer → Ajuster → Vérifier → Exporter. A tablist: arrows move between steps, each tab says whether it is done. */
export function ToolStepBar({ value, done, onChange }: { value: ToolPanel; done: Record<ToolPanel, boolean>; onChange: (value: ToolPanel) => void }) {
  const { t } = useI18n();
  return <div className="tool-steps" role="tablist" aria-label={t("tool_steps_label")} data-testid="tool-steps">
    {STEPS.map((panel, index) => {
      const status: StepStatus = value === panel ? "current" : done[panel] ? "done" : "todo";
      return <button
        key={panel}
        type="button"
        role="tab"
        id={`tool-tab-${panel}`}
        data-testid={`tool-tab-${panel}`}
        data-status={status}
        aria-controls={value === panel ? `tool-panel-${panel}` : undefined}
        aria-selected={value === panel}
        tabIndex={value === panel ? 0 : -1}
        className={`tool-step ${value === panel ? "is-on" : ""}`}
        onClick={() => onChange(panel)}
        onKeyDown={(event) => {
          const dir = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
          const jump = event.key === "Home" ? STEPS[0] : event.key === "End" ? STEPS[STEPS.length - 1] : null;
          if (!dir && !jump) return;
          event.preventDefault();
          const next = jump ?? STEPS[(index + dir + STEPS.length) % STEPS.length]!;
          onChange(next);
          requestAnimationFrame(() => document.getElementById(`tool-tab-${next}`)?.focus());
        }}
      >
        <span className="tool-step-mark" aria-hidden="true">{done[panel] && value !== panel ? "✓" : index + 1}</span>
        <span className="tool-step-label">{t(STEP_KEYS[panel])}</span>
        <span className="sr-only">, {t(status === "current" ? "tool_step_current" : status === "done" ? "tool_step_done" : "tool_step_todo")}</span>
      </button>;
    })}
  </div>;
}

export function ToolCanvas({mobileView, onMobileView, slideIndex, children}: {mobileView: "outer" | "inner" | "compare"; onMobileView: (value: "outer" | "inner" | "compare") => void; slideIndex: number; children: ReactNode}) {
  const { t } = useI18n();
  const labels = {outer: t("tool_closed"), inner: t("tool_open"), compare: t("tool_compare")};
  const canvasRef = useRef<HTMLDivElement>(null);
  const initialSlide = useRef(true);
  useEffect(() => {
    if (initialSlide.current) { initialSlide.current = false; return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !canvasRef.current) return;
    const stages = canvasRef.current.querySelectorAll(".preview-stage");
    const tween = gsap.fromTo(stages, {opacity: 0.65, y: 6}, {opacity: 1, y: 0, duration: 0.22, ease: "power2.out", clearProps: "all"});
    return () => { tween.kill(); gsap.set(stages, {clearProps: "all"}); };
  }, [slideIndex]);
  return <div ref={canvasRef} className="tool-canvas" data-mobile-view={mobileView}>
    <div className="tool-mobile-view" role="group" aria-label={t("tool_canvas_view")}>{(["outer", "inner", "compare"] as const).map((view) => <button key={view} type="button" aria-pressed={mobileView === view} className={mobileView === view ? "is-on" : ""} onClick={() => onMobileView(view)}>{labels[view]}</button>)}</div>
    {children}
  </div>;
}

export function PairStrip({outerFiles, innerFiles, active, sameSet, onSelect, onRemove}: {outerFiles: File[]; innerFiles: File[]; active: number; sameSet: boolean; onSelect: (index: number) => void; onRemove: (side: "outer" | "inner", index: number) => void}) {
  const { t } = useI18n();
  const count = Math.max(outerFiles.length, innerFiles.length);
  if (!count) return <p className="tool-pair-empty">{t("tool_import_first_pair_try")}</p>;
  return <div className="tool-pair-strip" aria-label={t("tool_screenshot_pairs")}><div className="tool-pair-strip-head"><span>{t("tool_pairs")}</span><span>{count} / {MAX_IMAGES}</span></div><div className="tool-pair-list">{Array.from({length: count}, (_, index) => { const outer = outerFiles[index]; const inner = innerFiles[index]; return <div className={`tool-pair-item ${index === active ? "is-active" : ""}`} key={index}><button type="button" className="tool-pair-select" aria-current={index === active ? "true" : undefined} aria-label={`${t("tool_pair")} ${index + 1}: ${outer ? t("tool_closed_present") : t("tool_closed_missing")}, ${inner ? t("tool_open_present") : t("tool_open_missing")}`} onClick={() => onSelect(index)}><strong>{String(index + 1).padStart(2, "0")}</strong><span className="tool-pair-marks"><i data-present={Boolean(outer)} /><i data-present={Boolean(inner)} /></span></button><div className="tool-pair-remove">{outer ? <button type="button" aria-label={`${t("tool_remove_closed_view_from")} ${index + 1}`} onClick={() => onRemove("outer", index)}>× <span>{t("tool_closed")}</span></button> : null}{inner && !sameSet ? <button type="button" aria-label={`${t("tool_remove_open_view_from")} ${index + 1}`} onClick={() => onRemove("inner", index)}>× <span>{t("tool_open")}</span></button> : null}</div></div>; })}</div></div>;
}
