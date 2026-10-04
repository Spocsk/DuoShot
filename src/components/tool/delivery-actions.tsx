"use client";

import Link from "next/link";
import { zipFolderName, type DeviceSlot, type Locale, type Orientation } from "@/lib/specs";
import { useI18n } from "@/components/i18n-provider";
import type { PurchaseKind } from "@/lib/plans";
import { SwapLabel } from "@/components/tool/controls";
import type { BillingStatus, SessionState } from "@/components/tool/use-billing";
import type { useRenderJobs } from "@/components/tool/use-render-jobs";

type Jobs = ReturnType<typeof useRenderJobs>;

export const EXAMPLE_ZIP_URL = "/api/example-zip?v=2";

/** Secondary deliveries, folded away so "Prepare files" stays the one obvious action. */
export function OtherActions({ hasExportable, jobs }: { hasExportable: boolean; jobs: Jobs }) {
  const { t } = useI18n();
  const { busyReview, onReview } = jobs;
  return (
    <details className="tool-other-actions" data-testid="tool-other-actions">
      <summary>{t("tool_other_actions")}</summary>
      <div className="tool-other-actions-body">
        <button
          type="button"
          disabled={busyReview || !hasExportable}
          data-testid="tool-review"
          onClick={() => void onReview()}
          className="ds-cta-ghost w-full"
        >
          <SwapLabel text={busyReview ? t("tool_review_preparing") : t("tool_review_share")} />
        </button>
        <p className="mt-2 text-xs text-[var(--muted)]" data-testid="tool-review-hint">
          {t("tool_review_hint")}
        </p>
        <a href={EXAMPLE_ZIP_URL} data-testid="tool-example" className="ds-text-btn mt-3">
          {t("tool_example")}
        </a>
      </div>
    </details>
  );
}

/** Review-link outcome (Studio): the URL, its client status and the upgrade offer. */
export function ReviewOutcome({ billing, checkoutBusy, onCheckout, jobs }: {
  locale: Locale;
  billing: BillingStatus | null;
  checkoutBusy: boolean;
  onCheckout: (kind: PurchaseKind) => Promise<void>;
  jobs: Jobs;
}) {
  const { t, tf } = useI18n();
  const { reviewUrl, reviewStatus, reviewSetStatus, reviewUpgrade } = jobs;
  return <>
    {reviewSetStatus ? (
      <p className="mt-2 text-sm" data-testid="tool-review-set-status">
        {tf("tool_review_status", { status: reviewSetStatus })}
      </p>
    ) : null}
    {reviewStatus ? <p className="mt-2 text-sm" data-testid="review-copied">{reviewStatus}</p> : null}
    {reviewUrl ? (
      <a href={reviewUrl} data-testid="review-url" className="ds-text-btn mt-2 break-all">
        {reviewUrl}
      </a>
    ) : null}
    {reviewUpgrade ? (
      <button
        type="button"
        data-testid="tool-review-upgrade"
        disabled={checkoutBusy || billing?.checkoutAvailable !== true}
        onClick={() => void onCheckout("studio_monthly")}
        className="ds-cta-ghost mt-3 w-full"
      >
        {t("pricing_studio_cta")}
      </button>
    ) : null}
  </>;
}

/** Export step: the delivered file list once the ZIP exists, otherwise what is still missing. */
export function ExportPanel({ prefix, zipUrl, session, orientation, demo, jobs }: {
  locale: Locale;
  prefix: string;
  zipUrl: string | null;
  session: SessionState;
  orientation: Orientation;
  demo: boolean;
  jobs: Jobs;
}) {
  const { t } = useI18n();
  const { exportImages } = jobs;
  return <>
    <div className="tool-panel-heading"><h2>{t("tool_export_title")}</h2><p>{zipUrl ? t("tool_export_lead") : demo ? t("tool_demo_export_hint") : t("tool_export_empty")}</p></div>
    {zipUrl ? (
      <div className="mt-4" data-testid="tool-export-delivery">
        <p className="ds-label">{t("tool_files_ready")}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">{t("tool_paths_inside_app_folder")}</p>
        <ul className="mt-3 space-y-1 text-sm">
          {exportImages.map((image) => (
            <li key={`${image.slot}-${image.index}-${image.width}x${image.height}`} className="studio-delivered-file">
              <code>{zipFolderName(image.slot as DeviceSlot, orientation)}/{image.slot === "iphone-69" ? `${image.width}x${image.height}/` : ""}{String(image.index).padStart(2, "0")}.{image.format === "jpeg" ? "jpg" : "png"}</code>
              <span>{image.slot === "duo-outer" ? t("tool_closed") : image.slot === "duo-inner" ? t("tool_open") : "6.9"} · {image.width} × {image.height}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-[var(--muted)]">{t("tool_unzip_archive_get_both")}</p>
      </div>
    ) : null}
    {session === "out" && !demo ? (
      <p className="mt-3 text-xs text-[var(--muted)]">
        {t("tool_need_account")}{" "}
        <Link href={`${prefix}/signup`} className="ds-link">
          {t("nav_signup")}
        </Link>
      </p>
    ) : null}
  </>;
}
