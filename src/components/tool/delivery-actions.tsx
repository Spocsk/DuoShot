"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { zipFolderName, type DeviceSlot, type Locale, type Orientation } from "@/lib/specs";
import { t, tf } from "@/lib/i18n";
import type { CheckoutKind } from "@/lib/plans";
import type { SetMeta } from "@/lib/sets-store";
import { StatusLine, SwapLabel } from "@/components/tool/controls";
import type { BillingStatus, SessionState } from "@/components/tool/use-billing";
import type { useRenderJobs } from "@/components/tool/use-render-jobs";

export function DeliveryActions({
  locale,
  prefix,
  active,
  patchActive,
  zipUrl,
  setZipUrl,
  hasExportable,
  missingSteps,
  session,
  setShowAuth,
  status,
  statusKind,
  urlStatus,
  orientation,
  billing,
  checkoutBusy,
  onCheckout,
  jobs,
}: {
  locale: Locale;
  prefix: string;
  active: SetMeta | undefined;
  patchActive: (patch: Partial<SetMeta>) => void;
  zipUrl: string | null;
  setZipUrl: Dispatch<SetStateAction<string | null>>;
  hasExportable: boolean;
  missingSteps: string[];
  session: SessionState;
  setShowAuth: Dispatch<SetStateAction<boolean>>;
  status: string | null;
  statusKind: "ok" | "err" | "busy" | "info";
  urlStatus: string | null;
  orientation: Orientation;
  billing: BillingStatus | null;
  checkoutBusy: boolean;
  onCheckout: (kind: CheckoutKind) => Promise<void>;
  jobs: ReturnType<typeof useRenderJobs>;
}) {
  const { zipName, exportImages, busyExport, busyReview, downloadId, reviewUrl, reviewStatus, reviewSetStatus, reviewUpgrade, onExport, onDownload, onReview } = jobs;
  const visibleReviewUrl = reviewUrl;
  return <>
          <div className="tool-panel-fields">
            <div className="ds-field">
      <label className="ds-label" htmlFor="tool-input-client">
        {t(locale, "tool_client")}
      </label>
      <input
        id="tool-input-client"
        value={active?.clientName ?? ""}
        onChange={(event) => { patchActive({ clientName: event.target.value }); setZipUrl(null); }}
        className="ds-input w-full"
      />
    </div>
          </div>
    {!zipUrl && hasExportable && missingSteps.length ? (
      <p className="tool-missing-steps mt-6 text-sm text-[var(--warn)]" data-testid="tool-missing-steps" role="status">
        {locale === "fr" ? "Avant de préparer les fichiers : " : "Before preparing files: "}{missingSteps.join(locale === "fr" ? " ; " : "; ")}.
      </p>
    ) : null}
    {!zipUrl ? <button
      type="button"
      disabled={busyExport || !hasExportable}
      data-testid="tool-download"
      onClick={() => void onExport()}
      className="ds-cta mt-6 w-full"
    >
      <SwapLabel text={busyExport ? t(locale, "tool_preparing") : locale === "fr" ? "Préparer les fichiers" : "Prepare files"} />
    </button> : null}
    {session === "out" && hasExportable ? (
      <button
        type="button"
        data-testid="tool-create-account"
        onClick={() => setShowAuth(true)}
        className="ds-cta-ghost mt-3 w-full"
      >
        {t(locale, "tool_create_account")}
      </button>
    ) : null}
    <button
      type="button"
      disabled={busyReview || !hasExportable}
      data-testid="tool-review"
      onClick={() => void onReview()}
      className="ds-cta-ghost mt-3 w-full"
    >
      <SwapLabel text={busyReview ? t(locale, "tool_review_preparing") : t(locale, "tool_review_share")} />
    </button>
    <p className="mt-2 text-xs text-[var(--muted)]" data-testid="tool-review-hint">
      {t(locale, "tool_review_hint")}
    </p>
      <a href="/api/example-zip?v=2" data-testid="tool-example" className="ds-text-btn mt-3">
      {t(locale, "tool_example")}
    </a>
    {session === "out" ? (
      <p className="mt-3 text-xs text-[var(--muted)]">
        {t(locale, "tool_need_account")}{" "}
        <Link href={`${prefix}/signup`} className="ds-link">
          {t(locale, "nav_signup")}
        </Link>
      </p>
    ) : null}
    {status ?? urlStatus ? (
      <StatusLine
        text={status ?? urlStatus}
        kind={status ? statusKind : "info"}
        testId="tool-status"
      />
    ) : null}
    {reviewSetStatus ? (
      <p className="mt-2 text-sm" data-testid="tool-review-set-status">
        {tf(locale, "tool_review_status", { status: reviewSetStatus })}
      </p>
    ) : null}
    {reviewStatus ? <p className="mt-2 text-sm" data-testid="review-copied">{reviewStatus}</p> : null}
    {zipUrl ? (
      <div className="mt-4 border-t border-[var(--line)] pt-4" data-testid="tool-export-delivery">
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
      <a href={downloadId ? `/api/exports/${downloadId}/download` : zipUrl} download={zipName} data-testid="tool-zip-link" className="ds-cta mt-4 inline-flex" onClick={(event) => { event.preventDefault(); void onDownload(); }}>
          {locale === "fr" ? "Télécharger le ZIP" : "Download ZIP"}
        </a>
        <p className="mt-3 text-sm text-[var(--muted)]">{locale === "fr" ? "Décompressez le ZIP pour obtenir les deux séries d’images. Le fichier reste récupérable pendant 24 h, sans nouvel essai. Le clic demande le téléchargement ; vérifiez ensuite le fichier dans votre navigateur. Le dépôt manuel dépend de l’ouverture des emplacements Duo dans App Store Connect." : "Unzip the archive to get both image sets. Retrieve it again within 24 hours without another trial. Clicking requests a download; check the file in your browser. Manual upload depends on Duo slots becoming available in App Store Connect."}</p>
      </div>
    ) : null}
    {visibleReviewUrl ? (
      <a href={visibleReviewUrl} data-testid="review-url" className="ds-text-btn mt-2">
        {visibleReviewUrl}
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
