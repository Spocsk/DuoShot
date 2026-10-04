import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { submitRender, resumeRender } from "@/lib/render-client";
import { assertBatchSize } from "@/lib/pipeline/limits";
import { normalizeCropTransform, type CropTransform, type FitMode, type Locale, type Orientation, type RenderOptions } from "@/lib/specs";
import { useI18n } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n/types";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { trackProduct } from "@/lib/analytics-client";
import { trackDatafastConversion } from "@/lib/datafast-client";
import { reviewPath } from "@/lib/site";
import { mapLimit } from "@/lib/map-limit";
import { uploadSource } from "@/lib/source-upload";
import { appNameOf, type SetMeta } from "@/lib/sets-store";
import type { ToolPanel } from "@/components/tool/canvas";
import { explainError } from "@/components/tool/errors";
import type { BillingStatus } from "@/components/tool/use-billing";

type StatusKind = "ok" | "err" | "busy" | "info";

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
  const i18n = useI18n();
  const { t, tf } = i18n;
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
      setStatus(state === "queued" ? t("tool_render_queued") : t("tool_progress_compose"));
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
          setReviewStatus(t("tool_review_ready"));
          void trackDatafastConversion("review_created", payload.id ?? payload.url.split("/").filter(Boolean).pop());
        }
        setToolPanel(kind === "export" ? "export" : "review");
        setStatusKind("ok"); setStatus(t(kind === "export" ? "tool_zip_ready" : "tool_review_ready"));
        void refreshBilling();
      }).catch(() => {
        if (mounted) { setStatusKind("err"); setStatus(t("tool_render_recovery_unavailable_reload")); }
      }).finally(() => { if (mounted) (kind === "export" ? setBusyExport : setBusyReview)(false); });
    }
    return () => { mounted = false; };
  }, [owner, locale, t, refreshBilling, draftsLoaded, setStatus, setStatusKind, setToolPanel, setZipUrl]);

  async function uploadSide(userId: string, files: File[], onProgress: () => void) {
    const bucket = createBrowserSupabase().storage.from("uploads");
    return mapLimit(files, 4, async (file) => {
      // Content-addressed: a file already stored for this user is not sent again.
      const path = await uploadSource(bucket, userId, file);
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
    flashStatus(t("tool_progress_compose"), "busy");
    setZipUrl(null);
    setDownloadId(null);
    try {
      const supabase = createBrowserSupabase();
      const { data: sessionData } = await supabase.auth.getUser();
      if (!sessionData.user) {
        setShowAuth(true);
        flashStatus(t("error_auth"), "err");
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
        flashStatus(t("tool_quality_ack_required"), "err");
        document.querySelector('[data-testid="quality-gate"]')?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
        return;
      }
      const extra = sameSet ? [] : innerFiles;
      assertBatchSize([...outerFiles, ...extra]);
      const total = outerFiles.length + extra.length;
      let done = 0;
      const tick = () => {
        done += 1;
        flashStatus(tf("tool_progress_upload", { done, total }), "busy");
      };
      const [outerPaths, uploadedInner] = await Promise.all([
        uploadSide(sessionData.user.id, outerFiles, tick),
        extra.length ? uploadSide(sessionData.user.id, extra, tick) : Promise.resolve([] as string[]),
      ]);
      const innerPaths = sameSet ? outerPaths : uploadedInner;
      flashStatus(t("tool_progress_compose"), "busy");
      const response = await submitRender(sessionData.user.id, "export", {
          outerPaths,
          innerPaths,
          sameSet: cloneForced,
          appName: appNameOf(active),
          clientName: active?.clientName || "",
          include69,
          assumeCloneRisk: assumeClone,
          options: renderOptions,
          transforms: {
            outer: outerFiles.map((_, index) => normalizeCropTransform(outerTransforms[index], globalFit)),
            inner: effectiveInner.map((_, index) => normalizeCropTransform(innerTransforms[index], globalFit)),
          },
        }, (state) => {
        flashStatus(state === "queued" ? t("tool_waiting_process_can_return") : t("tool_progress_compose"), "busy");
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
          flashStatus(t("error_trial"), "err");
          return;
        }
        if (payload.error === "IPHONE_69_GATED") {
          setPaywall("69");
          flashStatus(t("error_69"), "err");
          return;
        }
        if (payload.error === "CLONE_RISK") {
          flashStatus(t("error_clone"), "err");
          return;
        }
        flashStatus(explainError(i18n, payload.error || "EXPORT_FAILED"), "err");
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
          ? t("tool_warn")
          : warning === "UNPAIRED"
            ? t("tool_warn_unpaired")
            : t("tool_zip_ready"),
        "ok",
      );
      void refreshBilling();
    } catch (error) {
      void trackProduct("export_failed", { reason: "network_or_storage" });
      flashStatus(error instanceof Error ? explainError(i18n, error.message) : t("error_export"), "err");
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
        const messages: Record<string, MessageKey> = {
          EXPORT_EXPIRED: "tool_download_expired",
          EXPORT_DELETED: "tool_download_deleted",
          AUTH_REQUIRED: "tool_download_sign_in_again",
        };
        flashStatus(t(messages[payload.error ?? ""] ?? "tool_download_unavailable_retry_without"), "err");
        return;
      }
      setZipUrl(payload.url);
      window.location.assign(payload.url);
    } catch { flashStatus(t("tool_network_error_retry_download"), "err"); }
  }

  async function onReview() {
    void trackProduct("review_requested", { plan: billing?.plan ?? "unknown" });
    setReviewUpgrade(false);
    const supabase = createBrowserSupabase();
    const { data: sessionData } = await supabase.auth.getUser();
    if (!sessionData.user) {
      setShowAuth(true);
      flashStatus(t("error_auth_review"), "err");
      return;
    }
    let plan = billing?.plan;
    if (!plan) {
      const response = await fetch("/api/billing/status");
      if (!response.ok) {
        void trackProduct("review_failed", { reason: "billing_unavailable" });
        setShowAuth(true);
        flashStatus(t("error_auth_review"), "err");
        return;
      }
      const nextBilling = (await response.json()) as BillingStatus;
      setBilling(nextBilling);
      plan = nextBilling.plan;
    }
    if (plan !== "studio") {
      setReviewUpgrade(true);
      flashStatus(t("error_studio"), "err");
      return;
    }
    if (severeQualityCount > 0 && !qualityAcknowledged) {
      flashStatus(t("tool_quality_ack_required"), "err");
      document.querySelector('[data-testid="quality-gate"]')?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
      return;
    }
    setBusyReview(true);
    flashStatus(t("tool_review_preparing"), "busy");
    try {
      const extra = sameSet ? [] : innerFiles;
      assertBatchSize([...outerFiles, ...extra]);
      const total = outerFiles.length + extra.length;
      let done = 0;
      const tick = () => {
        done += 1;
        flashStatus(tf("tool_progress_review", { done, total }), "busy");
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
          appName: appNameOf(active),
          clientName: active?.clientName || "",
          orientation,
          locale,
          options: renderOptions,
          transforms: {
            outer: outerFiles.map((_, index) => normalizeCropTransform(outerTransforms[index], globalFit)),
            inner: effectiveInner.map((_, index) => normalizeCropTransform(innerTransforms[index], globalFit)),
          },
        }, (state) => {
        flashStatus(state === "queued" ? t("tool_waiting_process_can_return") : t("tool_progress_compose"), "busy");
      });
      const payload = (await response.json()) as { url?: string; id?: string; expiresAt?: string; error?: string };
      if (!response.ok) {
        void trackProduct("review_failed", { reason: ["STUDIO_REQUIRED", "INPUT_TOO_LARGE", "BATCH_TOO_LARGE", "UPLOAD_MISSING"].includes(payload.error ?? "") ? payload.error! : "other" });
        if (payload.error === "STUDIO_REQUIRED") setReviewUpgrade(true);
        flashStatus(explainError(i18n, payload.error || "STUDIO_REQUIRED"), "err");
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
            ? `${t("tool_review_copied")} · ${t("tool_expires")} ${new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(payload.expiresAt))}`
            : t("tool_review_copied"),
        );
      } catch {
        setReviewStatus(t("tool_review_ready"));
      }
      flashStatus(t("tool_review_ready"), "ok");
    } catch (error) {
      void trackProduct("review_failed", { reason: "network_or_storage" });
      const code = error instanceof Error ? error.message : "STUDIO_REQUIRED";
      if (code === "STUDIO_REQUIRED") setReviewUpgrade(true);
      flashStatus(explainError(i18n, code), "err");
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
