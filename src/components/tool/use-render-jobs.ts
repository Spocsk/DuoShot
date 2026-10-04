import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { submitRender, resumeRender } from "@/lib/render-client";
import { assertBatchSize } from "@/lib/pipeline/limits";
import { normalizeCropTransform, type CropTransform, type FitMode, type Locale, type Orientation, type RenderOptions } from "@/lib/specs";
import { t, tf } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { trackProduct } from "@/lib/analytics-client";
import { trackDatafastConversion } from "@/lib/datafast-client";
import { reviewPath } from "@/lib/site";
import { mapLimit } from "@/lib/map-limit";
import type { SetMeta } from "@/lib/sets-store";
import { explainError } from "@/components/tool/errors";
import type { BillingStatus } from "@/components/tool/use-billing";

type StatusKind = "ok" | "err" | "busy" | "info";
type ToolPanel = "captures" | "adjust" | "review";

export type RenderJobsContext = {
  locale: Locale;
  owner: string;
  draftsLoaded: boolean;
  active: SetMeta | undefined;
  billing: BillingStatus | null;
  setBilling: Dispatch<SetStateAction<BillingStatus | null>>;
  refreshBilling: () => Promise<void>;
  setStatus: Dispatch<SetStateAction<string | null>>;
  setStatusKind: Dispatch<SetStateAction<StatusKind>>;
  flashStatus: (message: string, kind: StatusKind) => void;
  setToolPanel: Dispatch<SetStateAction<ToolPanel>>;
  setShowAuth: Dispatch<SetStateAction<boolean>>;
  setPaywall: Dispatch<SetStateAction<"trial" | "69" | null>>;
  zipUrl: string | null;
  setZipUrl: Dispatch<SetStateAction<string | null>>;
  patchActive: (patch: Partial<SetMeta>) => void;
  outerFiles: File[];
  innerFiles: File[];
  effectiveInner: File[];
  sameSet: boolean;
  cloneForced: boolean;
  include69: boolean;
  assumeClone: boolean;
  severeQualityCount: number;
  qualityAcknowledged: boolean;
  orientation: Orientation;
  globalFit: FitMode;
  renderOptions: RenderOptions;
  outerTransforms: CropTransform[];
  innerTransforms: CropTransform[];
};

/**
 * Export ZIP and Studio review links: uploads, render submission, recovery of a
 * render still pending from a previous visit, and the delivered download.
 */
export function useRenderJobs(ctx: RenderJobsContext) {
  const {
    locale, owner, draftsLoaded, active, billing, setBilling, refreshBilling,
    setStatus, setStatusKind, flashStatus, setToolPanel, setShowAuth, setPaywall,
    zipUrl, setZipUrl, patchActive, outerFiles, innerFiles, effectiveInner, sameSet,
    cloneForced, include69, assumeClone, severeQualityCount, qualityAcknowledged,
    orientation, globalFit, renderOptions, outerTransforms, innerTransforms,
  } = ctx;
  const [zipName, setZipName] = useState("app.zip");
  const [exportImages, setExportImages] = useState<Array<{slot: string; index: number; width: number; height: number; format: string}>>([]);
  const [busyExport, setBusyExport] = useState(false);
  const [busyReview, setBusyReview] = useState(false);
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [reviewSetStatus, setReviewSetStatus] = useState<string | null>(null);
  const [reviewUpgrade, setReviewUpgrade] = useState(false);

  useEffect(() => {
    const id = active?.lastReviewId;
    if (!id) {
      queueMicrotask(() => {
        setReviewUrl(null);
        setReviewSetStatus(active?.lastReviewStatus ?? null);
      });
      return;
    }
    queueMicrotask(() => setReviewUrl(`${window.location.origin}${reviewPath(locale, id)}`));
    let cancelled = false;
    void fetch(`/api/reviews/${id}`)
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { status?: string };
        if (!cancelled && data.status) setReviewSetStatus(data.status);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active?.lastReviewId, active?.lastReviewStatus, locale]);

  useEffect(() => {
    if (owner === "guest" || !draftsLoaded) return;
    let mounted = true;
    const progress = (state: "queued" | "running") => {
      if (!mounted) return;
      setStatusKind("busy");
      setStatus(state === "queued" ? (locale === "fr" ? "Votre rendu est en attente…" : "Your render is queued…") : t(locale, "tool_progress_compose"));
    };
    for (const kind of ["export", "review"] as const) {
      const pending = resumeRender(owner, kind, progress);
      if (!pending) continue;
      queueMicrotask(() => { if (mounted) (kind === "export" ? setBusyExport : setBusyReview)(true); });
      void pending.then(async response => {
        const payload = await response.json();
        if (!response.ok || !payload.url) throw new Error(payload.error ?? "RENDER_UNAVAILABLE");
        if (!mounted) return;
        if (kind === "export") {
          setZipUrl(payload.url); setZipName(payload.filename ?? "app.zip");
          setDownloadId(payload.exportId ?? null); setExportImages(payload.images ?? []);
          if (payload.exportId) void trackDatafastConversion("export_succeeded", payload.exportId);
        } else {
          setReviewUrl(new URL(payload.url, window.location.origin).href);
          setReviewStatus(t(locale, "tool_review_ready"));
          void trackDatafastConversion("review_created", payload.id ?? payload.url.split("/").filter(Boolean).pop());
        }
        setToolPanel("review");
        setStatusKind("ok"); setStatus(t(locale, kind === "export" ? "tool_zip_ready" : "tool_review_ready"));
        void refreshBilling();
      }).catch(() => {
        if (mounted) { setStatusKind("err"); setStatus(locale === "fr" ? "Récupération du rendu indisponible. Rechargez la page pour réessayer sans créer une nouvelle demande." : "Render recovery unavailable. Reload to retry without creating a new request."); }
      }).finally(() => { if (mounted) (kind === "export" ? setBusyExport : setBusyReview)(false); });
    }
    return () => { mounted = false; };
  }, [owner, locale, refreshBilling, draftsLoaded, setStatus, setStatusKind, setToolPanel, setZipUrl]);

  async function uploadSide(userId: string, files: File[], onProgress: () => void) {
    const supabase = createBrowserSupabase();
    return mapLimit(files, 4, async (file) => {
      const ext = file.type === "image/png" ? "png" : "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file, {
        contentType: file.type,
        upsert: true,
      });
      if (error) throw new Error("UPLOAD_FAILED");
      onProgress();
      return path;
    });
  }

  async function onExport() {
    void trackProduct("export_requested", {
      image_count: Math.max(outerFiles.length, effectiveInner.length),
      plan: billing?.plan ?? "unknown",
    });
    setBusyExport(true);
    flashStatus(t(locale, "tool_progress_compose"), "busy");
    setZipUrl(null);
    setDownloadId(null);
    try {
      const supabase = createBrowserSupabase();
      const { data: sessionData } = await supabase.auth.getUser();
      if (!sessionData.user) {
        setShowAuth(true);
        flashStatus(t(locale, "error_auth"), "err");
        return;
      }
      if (include69 && billing && billing.canUse69 === false) {
        setPaywall("69");
        return;
      }
      if (billing?.plan === "free" && billing.remainingFreeExports === 0) {
        setPaywall("trial");
        return;
      }
      if (severeQualityCount > 0 && !qualityAcknowledged) {
        flashStatus(t(locale, "tool_quality_ack_required"), "err");
        document.querySelector('[data-testid="quality-gate"]')?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
        return;
      }
      const extra = sameSet ? [] : innerFiles;
      assertBatchSize([...outerFiles, ...extra]);
      const total = outerFiles.length + extra.length;
      let done = 0;
      const tick = () => {
        done += 1;
        flashStatus(tf(locale, "tool_progress_upload", { done, total }), "busy");
      };
      const [outerPaths, uploadedInner] = await Promise.all([
        uploadSide(sessionData.user.id, outerFiles, tick),
        extra.length ? uploadSide(sessionData.user.id, extra, tick) : Promise.resolve([] as string[]),
      ]);
      const innerPaths = sameSet ? outerPaths : uploadedInner;
      flashStatus(t(locale, "tool_progress_compose"), "busy");
      const response = await submitRender(sessionData.user.id, "export", {
          outerPaths,
          innerPaths,
          sameSet: cloneForced,
          appName: active?.name || "App",
          clientName: active?.clientName || "",
          include69,
          assumeCloneRisk: assumeClone,
          options: renderOptions,
          transforms: {
            outer: outerFiles.map((_, index) => normalizeCropTransform(outerTransforms[index], globalFit)),
            inner: effectiveInner.map((_, index) => normalizeCropTransform(innerTransforms[index], globalFit)),
          },
        }, (state) => {
        flashStatus(state === "queued" ? (locale === "fr" ? "En attente de traitement… Vous pouvez revenir sur cette page plus tard." : "Waiting to process… You can return to this page later.") : t(locale, "tool_progress_compose"), "busy");
      });
      const payload = (await response.json()) as {
        url?: string; error?: string; warning?: string; filename?: string; exportId?: string; expiresAt?: string;
        images?: Array<{slot: string; index: number; width: number; height: number; format: string}>;
      };
      if (!response.ok) {
        void refreshBilling();
        void trackProduct("export_failed", {
          reason: ["TRIAL_EXHAUSTED", "IPHONE_69_GATED", "CLONE_RISK"].includes(payload.error ?? "")
            ? payload.error! : "other",
        });
        if (payload.error === "TRIAL_EXHAUSTED") {
          setPaywall("trial");
          flashStatus(t(locale, "error_trial"), "err");
          return;
        }
        if (payload.error === "IPHONE_69_GATED") {
          setPaywall("69");
          flashStatus(t(locale, "error_69"), "err");
          return;
        }
        if (payload.error === "CLONE_RISK") {
          flashStatus(t(locale, "error_clone"), "err");
          return;
        }
        flashStatus(explainError(locale, payload.error || "EXPORT_FAILED"), "err");
        return;
      }
      if (!payload.url) throw new Error("STORAGE_UNAVAILABLE");
      if (payload.exportId) void trackDatafastConversion("export_succeeded", payload.exportId, {
        image_count: Math.max(outerFiles.length, effectiveInner.length),
        plan: billing?.plan ?? "unknown",
      });
      const warning = payload.warning ?? "";
      setZipName(payload.filename || "app.zip");
      setZipUrl(payload.url);
      setDownloadId(payload.exportId ?? null);
      setExportImages(payload.images ?? []);
      flashStatus(
        warning === "TOO_FEW"
          ? t(locale, "tool_warn")
          : warning === "UNPAIRED"
            ? t(locale, "tool_warn_unpaired")
            : t(locale, "tool_zip_ready"),
        "ok",
      );
      void refreshBilling();
    } catch (error) {
      void trackProduct("export_failed", { reason: "network_or_storage" });
      flashStatus(error instanceof Error ? explainError(locale, error.message) : t(locale, "error_export"), "err");
    } finally {
      setBusyExport(false);
    }
  }

  async function onDownload() {
    void trackProduct("zip_download_clicked");
    if (!downloadId) { if (zipUrl) window.location.assign(zipUrl); return; }
    try {
      const response = await fetch(`/api/exports/${downloadId}/download?format=json`, { cache: "no-store" });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        const messages: Record<string, [string, string]> = {
          EXPORT_EXPIRED: ["Ce ZIP a expiré après 24 h. Vos captures locales restent disponibles.", "This ZIP expired after 24 hours. Your local screenshots remain available."],
          EXPORT_DELETED: ["Ce fichier a été supprimé du serveur.", "This file has been removed from the server."],
          AUTH_REQUIRED: ["Reconnectez-vous pour récupérer ce fichier.", "Sign in again to retrieve this file."],
        };
        const message = messages[payload.error ?? ""];
        flashStatus(message ? message[locale === "fr" ? 0 : 1] : locale === "fr" ? "Téléchargement indisponible. Réessayez sans générer un nouvel export." : "Download unavailable. Retry without generating another export.", "err");
        return;
      }
      setZipUrl(payload.url);
      window.location.assign(payload.url);
    } catch { flashStatus(locale === "fr" ? "Erreur réseau. Réessayez le téléchargement ; aucun essai supplémentaire n’est consommé." : "Network error. Retry the download; no additional trial is consumed.", "err"); }
  }

  async function onReview() {
    void trackProduct("review_requested", { plan: billing?.plan ?? "unknown" });
    setReviewUpgrade(false);
    const supabase = createBrowserSupabase();
    const { data: sessionData } = await supabase.auth.getUser();
    if (!sessionData.user) {
      setShowAuth(true);
      flashStatus(t(locale, "error_auth_review"), "err");
      return;
    }
    let plan = billing?.plan;
    if (!plan) {
      const response = await fetch("/api/billing/status");
      if (!response.ok) {
        void trackProduct("review_failed", { reason: "billing_unavailable" });
        setShowAuth(true);
        flashStatus(t(locale, "error_auth_review"), "err");
        return;
      }
      const nextBilling = (await response.json()) as BillingStatus;
      setBilling(nextBilling);
      plan = nextBilling.plan;
    }
    if (plan !== "studio") {
      setReviewUpgrade(true);
      flashStatus(t(locale, "error_studio"), "err");
      return;
    }
    if (severeQualityCount > 0 && !qualityAcknowledged) {
      flashStatus(t(locale, "tool_quality_ack_required"), "err");
      document.querySelector('[data-testid="quality-gate"]')?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
      return;
    }
    setBusyReview(true);
    flashStatus(t(locale, "tool_review_preparing"), "busy");
    try {
      const extra = sameSet ? [] : innerFiles;
      assertBatchSize([...outerFiles, ...extra]);
      const total = outerFiles.length + extra.length;
      let done = 0;
      const tick = () => {
        done += 1;
        flashStatus(tf(locale, "tool_progress_review", { done, total }), "busy");
      };
      const [outerPaths, uploadedInner] = await Promise.all([
        uploadSide(sessionData.user.id, outerFiles, tick),
        extra.length ? uploadSide(sessionData.user.id, extra, tick) : Promise.resolve([] as string[]),
      ]);
      const innerPaths = sameSet ? outerPaths : uploadedInner;
      const response = await submitRender(sessionData.user.id, "review", {
          outerPaths,
          innerPaths,
          sameSet: cloneForced,
          appName: active?.name || "App",
          clientName: active?.clientName || "",
          orientation,
          locale,
          options: renderOptions,
          transforms: {
            outer: outerFiles.map((_, index) => normalizeCropTransform(outerTransforms[index], globalFit)),
            inner: effectiveInner.map((_, index) => normalizeCropTransform(innerTransforms[index], globalFit)),
          },
        }, (state) => {
        flashStatus(state === "queued" ? (locale === "fr" ? "En attente de traitement… Vous pouvez revenir sur cette page plus tard." : "Waiting to process… You can return to this page later.") : t(locale, "tool_progress_compose"), "busy");
      });
      const payload = (await response.json()) as { url?: string; id?: string; expiresAt?: string; error?: string };
      if (!response.ok) {
        void trackProduct("review_failed", { reason: ["STUDIO_REQUIRED", "INPUT_TOO_LARGE", "BATCH_TOO_LARGE", "UPLOAD_MISSING"].includes(payload.error ?? "") ? payload.error! : "other" });
        if (payload.error === "STUDIO_REQUIRED") setReviewUpgrade(true);
        flashStatus(explainError(locale, payload.error || "STUDIO_REQUIRED"), "err");
        return;
      }
      const publicId = payload.id ?? payload.url?.split("/").filter(Boolean).pop();
      if (publicId) void trackDatafastConversion("review_created", publicId, { slide_count: Math.max(outerFiles.length, effectiveInner.length) });
      if (publicId) patchActive({ lastReviewId: publicId, lastReviewStatus: "pending" });
      const path = payload.url || (publicId ? reviewPath(locale, publicId) : "");
      const absolute = path.startsWith("http") ? path : `${window.location.origin}${path}`;
      setReviewUrl(absolute);
      try {
        await navigator.clipboard.writeText(absolute);
        setReviewStatus(
          payload.expiresAt
            ? `${t(locale, "tool_review_copied")} · ${locale === "fr" ? "expire le" : "expires"} ${new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(payload.expiresAt))}`
            : t(locale, "tool_review_copied"),
        );
      } catch {
        setReviewStatus(t(locale, "tool_review_ready"));
      }
      flashStatus(t(locale, "tool_review_ready"), "ok");
    } catch (error) {
      void trackProduct("review_failed", { reason: "network_or_storage" });
      const code = error instanceof Error ? error.message : "STUDIO_REQUIRED";
      if (code === "STUDIO_REQUIRED") setReviewUpgrade(true);
      flashStatus(explainError(locale, code), "err");
    } finally {
      setBusyReview(false);
    }
  }

  return {
    zipName, exportImages, busyExport, busyReview, downloadId,
    reviewUrl, reviewStatus, reviewSetStatus, reviewUpgrade,
    onExport, onDownload, onReview,
  };
}
