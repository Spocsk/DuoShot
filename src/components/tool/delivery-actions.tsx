"use client";

import Link from "next/link";
import { zipFolderName, type DeviceSlot, type Locale, type Orientation } from "@/lib/specs";
import { t, tf } from "@/lib/i18n";
import type { CheckoutKind } from "@/lib/plans";
import { SwapLabel } from "@/components/tool/controls";
import type { BillingStatus, SessionState } from "@/components/tool/use-billing";
import type { useRenderJobs } from "@/components/tool/use-render-jobs";

type Jobs = ReturnType<typeof useRenderJobs>;

export const EXAMPLE_ZIP_URL = "/api/example-zip?v=2";

/** Secondary deliveries, folded away so "Prepare files" stays the one obvious action. */
export function OtherActions({ locale, hasExportable, jobs }: { locale: Locale; hasExportable: boolean; jobs: Jobs }) {
  const { busyReview, onReview } = jobs;
  return (
    <details className="tool-other-actions" data-testid="tool-other-actions">
      <summary>{t(locale, "tool_other_actions")}</summary>
      <div className="tool-other-actions-body">
        <button
          type="button"
          disabled={busyReview || !hasExportable}
          data-testid="tool-review"
          onClick={() => void onReview()}
          className="ds-cta-ghost w-full"
        >
          <SwapLabel text={busyReview ? t(locale, "tool_review_preparing") : t(locale, "tool_review_share")} />
        </button>
        <p className="mt-2 text-xs text-[var(--muted)]" data-testid="tool-review-hint">
          {t(locale, "tool_review_hint")}
        </p>
        <a href={EXAMPLE_ZIP_URL} data-testid="tool-example" className="ds-text-btn mt-3">
          {t(locale, "tool_example")}
        </a>
      </div>
    </details>
  );
}

/** Review-link outcome (Studio): the URL, its client status and the upgrade offer. */
export function ReviewOutcome({ locale, billing, checkoutBusy, onCheckout, jobs }: {
  locale: Locale;
  billing: BillingStatus | null;
  checkoutBusy: boolean;
  onCheckout: (kind: CheckoutKind) => Promise<void>;
  jobs: Jobs;
}) {
  const { reviewUrl, reviewStatus, reviewSetStatus, reviewUpgrade } = jobs;
  return <>
    {reviewSetStatus ? (
      <p className="mt-2 text-sm" data-testid="tool-review-set-status">
        {tf(locale, "tool_review_status", { status: reviewSetStatus })}
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
        {t(locale, "pricing_studio_cta")}
      </button>
    ) : null}
  </>;
}

/** Export step: the delivered file list once the ZIP exists, otherwise what is still missing. */
export function ExportPanel({ locale, prefix, zipUrl, session, orientation, demo, jobs }: {
  locale: Locale;
  prefix: string;
  zipUrl: string | null;
  session: SessionState;
  orientation: Orientation;
  demo: boolean;
  jobs: Jobs;
}) {
  const { exportImages } = jobs;
  return <>
    <div className="tool-panel-heading"><h2>{t(locale, "tool_export_title")}</h2><p>{zipUrl ? t(locale, "tool_export_lead") : demo ? t(locale, "tool_demo_export_hint") : t(locale, "tool_export_empty")}</p></div>
    {zipUrl ? (
      <div className="mt-4" data-testid="tool-export-delivery">
        <p className="ds-label">{locale === "fr" ? "Fichiers prêts" : "Files ready"}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">{locale === "fr" ? "Chemins dans le dossier de l’app" : "Paths inside the app folder"}</p>
        <ul className="mt-3 space-y-1 text-sm">
          {exportImages.map((image) => (
            <li key={`${image.slot}-${image.index}`} className="studio-delivered-file">
              <code>{zipFolderName(image.slot as DeviceSlot, orientation)}/{image.slot === "iphone-69" ? `${image.width}x${image.height}/` : ""}{String(image.index).padStart(2, "0")}.{image.format === "jpeg" ? "jpg" : "png"}</code>
              <span>{image.slot === "duo-outer" ? (locale === "fr" ? "Fermé" : "Closed") : image.slot === "duo-inner" ? (locale === "fr" ? "Ouvert" : "Open") : "6.9"} · {image.width} × {image.height}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-[var(--muted)]">{locale === "fr" ? "Décompressez le ZIP pour obtenir les deux séries d’images. Le fichier reste récupérable pendant 24 h, sans nouvel essai. Le clic demande le téléchargement ; vérifiez ensuite le fichier dans votre navigateur. Le dépôt manuel dépend de l’ouverture des emplacements Duo dans App Store Connect." : "Unzip the archive to get both image sets. Retrieve it again within 24 hours without another trial. Clicking requests a download; check the file in your browser. Manual upload depends on Duo slots becoming available in App Store Connect."}</p>
      </div>
    ) : null}
    {session === "out" && !demo ? (
      <p className="mt-3 text-xs text-[var(--muted)]">
        {t(locale, "tool_need_account")}{" "}
        <Link href={`${prefix}/signup`} className="ds-link">
          {t(locale, "nav_signup")}
        </Link>
      </p>
    ) : null}
  </>;
}
