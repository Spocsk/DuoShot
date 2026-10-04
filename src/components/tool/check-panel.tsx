"use client";

import type { Dispatch, SetStateAction } from "react";
import type { SizeSpec } from "@/lib/specs";
import { useI18n } from "@/components/i18n-provider";
import type { MessageKey, Translator } from "@/lib/i18n/types";
import type { SourceInspect } from "@/lib/pipeline/source-inspect";
import type { CloneReason, CloneResult } from "@/lib/pipeline/clone-score";
import type { compositionMetrics } from "@/lib/pipeline/geometry";
import { CloneTip } from "@/components/tool/controls";
import { foldStatusText, type FoldCheck } from "@/components/tool/fold-check";

export type QualityItem = { side: "outer" | "inner"; index: number } & ReturnType<typeof compositionMetrics>;

export function ReviewAlerts({
  severeQualityCount,
  qualityAcknowledged,
  setQualityAcknowledged,
  clones,
  slideIndex,
  setSlideIndex,
  cloneAlert,
  cloneAcknowledged,
  setCloneAcknowledged,
}: {
  severeQualityCount: number;
  qualityAcknowledged: boolean;
  setQualityAcknowledged: Dispatch<SetStateAction<boolean>>;
  clones: CloneResult[];
  slideIndex: number;
  setSlideIndex: Dispatch<SetStateAction<number>>;
  cloneAlert: boolean;
  cloneAcknowledged: boolean;
  setCloneAcknowledged: Dispatch<SetStateAction<boolean>>;
}) {
  const { t, tf } = useI18n();
  const riskCount = clones.filter((item) => item.label === "risk").length;
  return <>
    {severeQualityCount > 0 ? (
      <div className="quality-gate" data-testid="quality-gate" data-acknowledged={qualityAcknowledged ? "true" : "false"}>
        <div>
          <p className="quality-gate-title">{tf("tool_quality_gate_title", { n: severeQualityCount })}</p>
          <p className="quality-gate-copy">{t("tool_quality_gate_copy")}</p>
        </div>
        <button
          type="button"
          className={qualityAcknowledged ? "ds-pill ds-pill-ink" : "ds-cta-ghost"}
          data-testid="quality-acknowledge"
          aria-pressed={qualityAcknowledged}
          onClick={() => setQualityAcknowledged((value) => !value)}
        >
          {qualityAcknowledged ? t("tool_quality_acknowledged") : t("tool_quality_ack")}
        </button>
      </div>
    ) : null}
    {cloneAlert ? (
      <div className="quality-gate" data-testid="clone-gate" data-acknowledged={cloneAcknowledged ? "true" : "false"}>
        <div>
          <p className="quality-gate-title">{tf("tool_clone_gate_title", { n: Math.max(riskCount, 1) })}</p>
          <p className="quality-gate-copy">{t("tool_clone_gate_copy")}</p>
        </div>
        <button
          type="button"
          className={cloneAcknowledged ? "ds-pill ds-pill-ink" : "ds-cta-ghost"}
          data-testid="clone-acknowledge"
          aria-pressed={cloneAcknowledged}
          onClick={() => setCloneAcknowledged((value) => !value)}
        >
          {cloneAcknowledged ? t("tool_quality_acknowledged") : t("tool_quality_ack")}
        </button>
      </div>
    ) : null}
    {clones.length > 0 ? (
      <ol className="mt-4 flex flex-wrap gap-2 font-mono text-xs t-avatar-group" data-testid="clone-badges">
        {clones.map((item) => (
          <li key={item.index}>
            <CloneTip
              label={`${String(item.index + 1).padStart(2, "0")} · ${t(`clone_${item.label}`)} · ${cloneReasonText(t, item)}`}
              hint={`${cloneReasonText(t, item)} · ${t("tool_shared_structure")} ${Math.round((1 - item.distance / 64) * 100)} %`}
            >
              <button
                type="button"
                className={`ds-pill ds-pill-ink t-avatar ${item.index === slideIndex ? "is-on" : ""}`}
                data-testid={`clone-badge-${item.index}`}
                data-clone={item.label}
                onClick={() => setSlideIndex(item.index)}
              >
                {String(item.index + 1).padStart(2, "0")} · {t(`clone_${item.label}`)}
                <span className="clone-reason"> · {cloneReasonText(t, item)}</span>
              </button>
            </CloneTip>
          </li>
        ))}
      </ol>
    ) : null}
  </>;
}

export function ReadinessReport({
  preparationChecks,
  slideIndex,
  outerInspect,
  innerInspect,
  outerSpec,
  innerSpec,
  qualityItems,
  effectiveInner,
  foldChecks,
  clones,
  appUsageConfirmed,
  setAppUsageConfirmed,
  cloneAlert,
  severeQualityCount,
  foldWarningCount,
  demo = false,
}: {
  demo?: boolean;
  preparationChecks: boolean[];
  slideIndex: number;
  outerInspect: SourceInspect | null;
  innerInspect: SourceInspect | null;
  outerSpec: SizeSpec;
  innerSpec: SizeSpec;
  qualityItems: QualityItem[];
  effectiveInner: File[];
  foldChecks: Record<number, FoldCheck>;
  clones: CloneResult[];
  appUsageConfirmed: boolean;
  setAppUsageConfirmed: Dispatch<SetStateAction<boolean>>;
  cloneAlert: boolean;
  severeQualityCount: number;
  foldWarningCount: number;
}) {
  const { t, tf } = useI18n();
  return (
    <section className="ds-readiness mb-6" aria-label={t("tool_readiness_report")} data-testid="readiness-report">
      <h2 className="font-display text-2xl">{t("tool_set_report")}</h2>
      <p className="ds-label mt-4">{t("home_technical_checks")}</p>
      <ul className="mt-2 space-y-2 text-sm">
        {[
          [preparationChecks[0], t("tool_closed_open_screenshots_present")],
          [preparationChecks[1], t("tool_pairs_complete")],
          [preparationChecks[5], t("tool_final_files_verified_stored")],
        ].map(([passed, label], index) => (
          <li key={index} className="flex gap-2"><span aria-hidden="true">{passed ? "✓" : "○"}</span><span className="sr-only">{passed ? t("tool_passed") : t("tool_pending")}</span>{label}</li>
        ))}
      </ul>
      <details className="tool-source-details">
        <summary>{tf("tool_pair_sources", { pair: String(slideIndex + 1).padStart(2, "0") })}</summary>
        {([[
          t("tool_closed"), outerInspect, outerSpec,
        ], [
          t("tool_open"), innerInspect, innerSpec,
        ]] as const).map(([name, inspect, spec]) => (
          <div key={name} className="tool-source-row">
            <strong>{name} · {spec.width} × {spec.height}</strong>
            <span>{inspect ? inspect.hasAlpha ? t("tool_check_alpha_flat") : t("tool_check_alpha_ok") : t("tool_check_await")}</span>
            <span>{inspect ? inspect.colorSpace === "other" ? t("tool_check_rgb_bad") : t("tool_check_rgb_ok") : t("tool_check_await")}</span>
            <span>{inspect ? t("tool_check_zip") : t("tool_check_zip_wait")}</span>
          </div>
        ))}
      </details>
      <p className="ds-label mt-5">{t("tool_visual_alerts")}</p>
      <ul className="mt-2 space-y-2 text-sm">
        <li className="flex gap-2"><span aria-hidden="true">{preparationChecks[2] ? "✓" : "◇"}</span><span className="sr-only">{preparationChecks[2] ? t("tool_passed") : t("tool_to_review_prefix")}</span>{t("tool_similarity_between_views")}</li>
        <li className="flex gap-2"><span aria-hidden="true">{preparationChecks[3] ? "✓" : "◇"}</span><span className="sr-only">{preparationChecks[3] ? t("tool_passed") : t("tool_to_review_prefix")}</span>{t("tool_framing_each_screenshot")}</li>
        {qualityItems.filter((item) => item.severity !== "ok").map((item) => (
          <li key={`${item.side}-${item.index}`} className="pl-5 text-[var(--warn)]">
            {item.side === "outer" ? t("tool_closed") : t("tool_open")} {String(item.index + 1).padStart(2, "0")} · {t("tool_crop")} {item.cropPercent.toFixed(0)} % · {t("tool_upscale")} {item.scale.toFixed(1)}×
          </li>
        ))}
        {effectiveInner.map((_, index) => <li key={`fold-${index}`} className={`pl-5 ${foldChecks[index]?.status === "warning" ? "text-[var(--warn)]" : "text-[var(--muted)]"}`} data-testid={`fold-check-${index}`}>
          {t("tool_open")} {String(index + 1).padStart(2, "0")} · {foldStatusText(t, foldChecks[index])}
        </li>)}
        {clones.filter((item) => item.label !== "ok").map((item) => (
          <li key={`clone-${item.index}`} className="pl-5 text-[var(--warn)]">
            {t("tool_pair")} {String(item.index + 1).padStart(2, "0")} · {t(`clone_${item.label}`)} : {cloneReasonText(t, item)}
          </li>
        ))}
      </ul>
      <p className="ds-label mt-5">{t("tool_human_confirmation")}</p>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" checked={appUsageConfirmed} onChange={(event) => setAppUsageConfirmed(event.target.checked)} className="mt-1" data-testid="confirm-app-usage" />
        <span>{demo ? t("tool_demo_confirm") : t("tool_i_checked_that_every")}</span>
      </label>
      {cloneAlert || severeQualityCount > 0 || foldWarningCount > 0 ? <p className="mt-3 text-sm text-[var(--warn)]">{t("tool_warnings_still_need_review")}</p> : null}
    </section>
  );
}

const REASON_KEYS: Record<CloneReason, MessageKey> = {
  "same-set": "clone_reason_same_set",
  "layout-and-palette": "clone_reason_layout_and_palette",
  layout: "clone_reason_layout",
  palette: "clone_reason_palette",
  distinct: "clone_reason_distinct",
};

/** Plain-language reason behind a similarity label. */
export function cloneReasonText(t: Translator["t"], item: CloneResult): string {
  return t(REASON_KEYS[item.reason ?? (item.label === "ok" ? "distinct" : "layout")]);
}

export type CheckItem = { id: "pairs" | "framing" | "similarity" | "confirm"; done: boolean; label: string; fix: () => void };

/** What still blocks "Prepare files". Each open item is a button that jumps to its fix. */
export function CheckList({ items }: { items: CheckItem[] }) {
  const { t } = useI18n();
  return (
    <div className="tool-review-actions" data-testid="tool-checklist">
      <p className="tool-eyebrow">{t("tool_check_todo")}</p>
      <ul>
        {items.map((item) => (
          <li key={item.id} data-done={item.done} data-testid={`tool-check-${item.id}`}>
            {item.done ? <span>{item.label}<span className="sr-only">{t("tool_done")}</span></span> : <button type="button" onClick={item.fix}>{item.label}</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
