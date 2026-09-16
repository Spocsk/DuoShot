"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_RENDER_OPTIONS,
  MAX_IMAGES,
  WARN_MIN_IMAGES,
  normalizeCropTransform,
  duoSpec,
  textOverlayLayout,
  type CropTransform,
  type FitMode,
  type Locale,
  type Orientation,
  type OutputFormat,
  type RenderOptions,
  type SizeSpec,
} from "@/lib/specs";
import { t, tf } from "@/lib/i18n";
import { checkSourceCount } from "@/lib/pipeline/validate";
import { hashFromFile } from "@/lib/pipeline/clone-hash-browser";
import { inspectFile, type SourceInspect } from "@/lib/pipeline/source-inspect";
import { scorePair, type CloneResult } from "@/lib/pipeline/clone-score";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { compositionMetrics, coverRect } from "@/lib/pipeline/geometry";
import { checkoutReturnPath, startCheckout } from "@/lib/checkout";
import type { CheckoutKind } from "@/lib/plans";
import {
  defaultSet,
  deleteSetFiles,
  loadActiveId,
  loadSetFiles,
  loadSetMetas,
  saveActiveId,
  saveSetFiles,
  saveSetMetas,
  type SetMeta,
} from "@/lib/sets-store";
import { Overlay } from "@/components/overlay";
import { PaywallModal } from "@/components/paywall-modal";
import { AuthForm } from "@/components/auth-form";
import { TrustLine } from "@/components/trust-line";
import { localePrefix, reviewPath } from "@/lib/site";
import { mapLimit } from "@/lib/map-limit";
import { mergeSideFiles } from "@/lib/merge-side-files";

type Props = { locale: Locale };

type BillingStatus = {
  plan?: string;
  remainingFreeExports?: number | null;
  canUse69?: boolean;
};

const subscribeNever = () => () => {};

const BOOT_SET: SetMeta = {
  id: "boot",
  name: "App",
  clientName: "",
  orientation: "portrait",
  sameSet: false,
};

const EMPTY_TRANSFORMS: CropTransform[] = [];

export function ToolApp({ locale }: Props) {
  return (
    <main id="main" className="flex-1">
      <Suspense fallback={<div className="mx-auto max-w-6xl px-5 py-10 text-[var(--muted)]">…</div>}>
        <ToolAppInner locale={locale} />
      </Suspense>
    </main>
  );
}

function ToolAppInner({ locale }: Props) {
  const prefix = localePrefix(locale);
  const searchParams = useSearchParams();
  const [sets, setSets] = useState<SetMeta[]>([BOOT_SET]);
  const [activeId, setActiveId] = useState<string>(BOOT_SET.id);
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const active = sets.find((item) => item.id === activeId) ?? sets[0];
  const [outerFiles, setOuterFiles] = useState<File[]>([]);
  const [innerFiles, setInnerFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<RenderOptions>(DEFAULT_RENDER_OPTIONS);
  const [include69, setInclude69] = useState(false);
  const [showHinge, setShowHinge] = useState(true);
  const [assumeClone, setAssumeClone] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"ok" | "err" | "busy" | "info">("info");
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [zipName, setZipName] = useState("app.zip");
  const [busyExport, setBusyExport] = useState(false);
  const [busyReview, setBusyReview] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [sameSetOpen, setSameSetOpen] = useState(false);
  const [previews, setPreviews] = useState<{ outer: string; inner: string } | null>(null);
  const [outerInspects, setOuterInspects] = useState<SourceInspect[]>([]);
  const [innerInspects, setInnerInspects] = useState<SourceInspect[]>([]);
  const [qualityAcknowledged, setQualityAcknowledged] = useState(false);
  const [clones, setClones] = useState<CloneResult[]>([]);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [session, setSession] = useState<"loading" | "out" | "in">("loading");
  const [showAuth, setShowAuth] = useState(false);
  const [paywall, setPaywall] = useState<"trial" | "69" | null>(null);
  const [upgradeDismissed, setUpgradeDismissed] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [reviewSetStatus, setReviewSetStatus] = useState<string | null>(null);
  const [reviewUpgrade, setReviewUpgrade] = useState(false);
  const setsRef = useRef<HTMLDetailsElement>(null);
  const [setsOpen, setSetsOpen] = useState(false);
  const [setsClosing, setSetsClosing] = useState(false);
  const zipUrlRef = useRef<string | null>(null);
  const signedIn = session === "in";
  const checkoutFlag = searchParams.get("checkout");
  const upgradeRequested = searchParams.get("upgrade") === "1" && !upgradeDismissed;
  const urlStatus =
    checkoutFlag === "success"
      ? t(locale, "checkout_success")
      : checkoutFlag === "cancel"
        ? t(locale, "checkout_cancel")
        : checkoutFlag === "mock"
          ? t(locale, "checkout_mock")
          : null;

  const sameSet = active?.sameSet ?? false;
  const effectiveInner = sameSet ? outerFiles : innerFiles;
  const unpaired = !sameSet && outerFiles.length > 0 && innerFiles.length > 0 && outerFiles.length !== innerFiles.length;
  const cloneForced = sameSet;
  const hasExportable = outerFiles.length > 0 && (sameSet || innerFiles.length > 0);
  const outerSlide = outerFiles[slideIndex];
  const innerSlide = effectiveInner[slideIndex];
  const orientation: Orientation = active?.orientation ?? "portrait";
  const renderOptions = useMemo(
    () => ({ ...options, orientation }),
    [options, orientation],
  );
  const outerSpec = duoSpec("duo-outer", orientation);
  const innerSpec = duoSpec("duo-inner", orientation);
  const outerTransforms = active?.transforms?.outer ?? EMPTY_TRANSFORMS;
  const innerTransforms = active?.transforms?.inner ?? EMPTY_TRANSFORMS;
  const outerTransform = useMemo(
    () => normalizeCropTransform(outerTransforms[slideIndex], options.fit),
    [options.fit, outerTransforms, slideIndex],
  );
  const innerTransform = useMemo(
    () => normalizeCropTransform(innerTransforms[slideIndex], options.fit),
    [innerTransforms, options.fit, slideIndex],
  );
  const outerInspect = outerInspects[slideIndex] ?? null;
  const effectiveInnerInspects = sameSet ? outerInspects : innerInspects;
  const innerInspect = effectiveInnerInspects[slideIndex] ?? null;

  const qualityItems = useMemo(() => {
    const outer = outerInspects.map((inspect, index) => ({
      side: "outer" as const,
      index,
      ...compositionMetrics(
        inspect.width,
        inspect.height,
        outerSpec.width,
        outerSpec.height,
        normalizeCropTransform(outerTransforms[index], options.fit),
      ),
    }));
    const inner = effectiveInnerInspects.map((inspect, index) => ({
      side: "inner" as const,
      index,
      ...compositionMetrics(
        inspect.width,
        inspect.height,
        innerSpec.width,
        innerSpec.height,
        normalizeCropTransform(innerTransforms[index], options.fit),
      ),
    }));
    return [...outer, ...inner];
  }, [effectiveInnerInspects, innerSpec.height, innerSpec.width, innerTransforms, options.fit, outerInspects, outerSpec.height, outerSpec.width, outerTransforms]);
  const severeQualityCount = qualityItems.filter((item) => item.severity === "severe").length;

  const warning = useMemo(() => {
    const count = Math.max(outerFiles.length, effectiveInner.length);
    if (count === 0) return null;
    try {
      return checkSourceCount(count).warning ?? null;
    } catch (error) {
      return error instanceof Error ? error.message : "error";
    }
  }, [outerFiles.length, effectiveInner.length]);

  const refreshBilling = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setSession("out");
      setBilling(null);
      return;
    }
    setSession("in");
    const response = await fetch("/api/billing/status");
    if (!response.ok) return;
    setBilling((await response.json()) as BillingStatus);
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    queueMicrotask(() => void refreshBilling());
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void refreshBilling();
    });
    return () => listener.subscription.unsubscribe();
  }, [refreshBilling]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const existing = loadSetMetas();
      if (existing.length === 0) {
        const first = defaultSet();
        try {
          saveSetMetas([first]);
          saveActiveId(first.id);
        } catch {
          /* private mode */
        }
        if (!cancelled) {
          setSets([first]);
          setActiveId(first.id);
        }
        return;
      }
      const current = loadActiveId() ?? existing[0]!.id;
      if (!cancelled) {
        setSets(existing);
        setActiveId(current);
      }
      const outer = await loadSetFiles(current, "outer");
      const inner = await loadSetFiles(current, "inner");
      if (cancelled) return;
      setOuterFiles((prev) => (prev.length > 0 ? prev : outer));
      setInnerFiles((prev) => (prev.length > 0 ? prev : inner));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      const root = setsRef.current;
      if (!root?.open) return;
      if (!root.contains(event.target as Node)) root.removeAttribute("open");
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setsRef.current?.removeAttribute("open");
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const patchActive = useCallback(
    (patch: Partial<SetMeta>) => {
      if (!active) return;
      const next = sets.map((item) => (item.id === active.id ? { ...item, ...patch } : item));
      setSets(next);
      saveSetMetas(next);
      if (session === "in") {
        const current = next.find((item) => item.id === active.id);
        if (current) {
          void fetch("/api/apps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: current.name,
              clientName: current.clientName,
              orientation: current.orientation,
            }),
          });
        }
      }
    },
    [active, sets, session],
  );

  useEffect(() => {
    const max = Math.max(outerFiles.length, effectiveInner.length, 1) - 1;
    queueMicrotask(() => setSlideIndex((index) => Math.min(index, max)));
  }, [outerFiles.length, effectiveInner.length]);

  useEffect(() => {
    zipUrlRef.current = zipUrl;
    return () => {
      if (zipUrl?.startsWith("blob:")) URL.revokeObjectURL(zipUrl);
    };
  }, [zipUrl]);

  const drawPreviews = useCallback(
    async (
      outer: File | undefined,
      inner: File | undefined,
      next: RenderOptions,
      transforms: { outer: CropTransform; inner: CropTransform },
    ) => {
      if (!outer && !inner) {
        setPreviews(null);
        return;
      }
      const outerSpec = duoSpec("duo-outer", next.orientation);
      const innerSpec = duoSpec("duo-inner", next.orientation);
      const nextPreviews = { outer: "", inner: "" };
      if (outer) {
        const bitmap = await createImageBitmap(outer);
        nextPreviews.outer = drawTarget(bitmap, next, outerSpec, transforms.outer);
        bitmap.close();
      }
      if (inner) {
        const bitmap = await createImageBitmap(inner);
        nextPreviews.inner = drawTarget(bitmap, next, innerSpec, transforms.inner);
        bitmap.close();
      }
      setPreviews(nextPreviews);
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!outerSlide && !innerSlide) {
        setPreviews(null);
        return;
      }
      void drawPreviews(outerSlide, innerSlide, renderOptions, {
        outer: outerTransform,
        inner: innerTransform,
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [drawPreviews, innerSlide, innerTransform, outerSlide, outerTransform, renderOptions]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [outer, inner] = await Promise.all([
        Promise.all(outerFiles.map(inspectFile)),
        Promise.all(innerFiles.map(inspectFile)),
      ]);
      if (!cancelled) {
        setOuterInspects(outer);
        setInnerInspects(inner);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [outerFiles, innerFiles]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const count = Math.min(outerFiles.length, effectiveInner.length);
      const next: CloneResult[] = [];
      for (let index = 0; index < count; index += 1) {
        const outerHash = await hashFromFile(outerFiles[index]!);
        const innerHash = await hashFromFile(effectiveInner[index]!);
        next.push(scorePair(outerHash, innerHash, index, cloneForced));
      }
      if (!cancelled) setClones(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [outerFiles, effectiveInner, cloneForced]);

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

  function isAllowedImage(file: File) {
    return /image\/(png|jpeg)/.test(file.type) || /\.(png|jpe?g)$/i.test(file.name);
  }

  function onSideFiles(side: "outer" | "inner", list: FileList | File[] | DataTransfer | null) {
    const incoming = takeFiles(list).filter(isAllowedImage);
    const current = side === "outer" ? outerFiles : innerFiles;
    const next = mergeSideFiles(current, incoming);
    if (side === "outer") setOuterFiles(next);
    else setInnerFiles(next);
    setQualityAcknowledged(false);
    setZipUrl(null);
    if (active) void saveSetFiles(active.id, side, next).catch(() => {});
  }

  function removeSideFile(side: "outer" | "inner", index: number) {
    const current = side === "outer" ? outerFiles : innerFiles;
    const next = current.filter((_, fileIndex) => fileIndex !== index);
    if (side === "outer") setOuterFiles(next);
    else setInnerFiles(next);
    if (active) {
      const currentTransforms = active.transforms ?? { outer: [], inner: [] };
      const nextTransforms = {
        outer: side === "outer"
          ? currentTransforms.outer.filter((_, transformIndex) => transformIndex !== index)
          : currentTransforms.outer,
        inner: side === "inner" || (side === "outer" && sameSet)
          ? currentTransforms.inner.filter((_, transformIndex) => transformIndex !== index)
          : currentTransforms.inner,
      };
      const nextSets = sets.map((item) => item.id === active.id ? { ...item, transforms: nextTransforms } : item);
      setSets(nextSets);
      saveSetMetas(nextSets);
    }
    setQualityAcknowledged(false);
    setZipUrl(null);
    if (active) void saveSetFiles(active.id, side, next).catch(() => {});
  }

  function updateOptions(patch: Partial<RenderOptions>) {
    setOptions({ ...options, ...patch });
    setQualityAcknowledged(false);
    setZipUrl(null);
  }

  function updateCropTransform(side: "outer" | "inner", index: number, patch: Partial<CropTransform>) {
    if (!active) return;
    const currentTransforms = active.transforms ?? { outer: [], inner: [] };
    const sideTransforms = [...currentTransforms[side]];
    sideTransforms[index] = normalizeCropTransform({
      ...normalizeCropTransform(sideTransforms[index], options.fit),
      ...patch,
    });
    const transforms = { ...currentTransforms, [side]: sideTransforms };
    const nextSets = sets.map((item) => item.id === active.id ? { ...item, transforms } : item);
    setSets(nextSets);
    saveSetMetas(nextSets);
    setQualityAcknowledged(false);
    setZipUrl(null);
  }

  function flashStatus(message: string, kind: "ok" | "err" | "busy" | "info") {
    setStatus(message);
    setStatusKind(kind);
  }

  function explainError(code: string) {
    if (code === "AUTH_REQUIRED") return t(locale, "error_auth");
    if (code === "TRIAL_EXHAUSTED") return t(locale, "error_trial");
    if (code === "DAILY_LIMIT") return t(locale, "error_daily");
    if (code === "IPHONE_69_GATED") return t(locale, "error_69");
    if (code === "CLONE_RISK") return t(locale, "error_clone");
    if (code === "STUDIO_REQUIRED") return t(locale, "error_studio");
    if (code === "NO_WORKSPACE") return t(locale, "error_workspace");
    if (code === "NO_IMAGES") return t(locale, "error_no_images");
    if (code === "UPLOAD_FAILED" || code === "UPLOAD_MISSING") return t(locale, "error_upload");
    if (code === "STORAGE_UNAVAILABLE") return t(locale, "error_storage");
    return t(locale, "error_export");
  }

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
    setBusyExport(true);
    flashStatus(t(locale, "tool_progress_compose"), "busy");
    setZipUrl(null);
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
        document.querySelector('[data-testid="quality-gate"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      const extra = sameSet ? [] : innerFiles;
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
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outerPaths,
          innerPaths,
          sameSet: cloneForced,
          appName: active?.name || "App",
          clientName: active?.clientName || "",
          include69,
          assumeCloneRisk: assumeClone,
          options: renderOptions,
          transforms: {
            outer: outerFiles.map((_, index) => normalizeCropTransform(outerTransforms[index], options.fit)),
            inner: effectiveInner.map((_, index) => normalizeCropTransform(innerTransforms[index], options.fit)),
          },
        }),
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || contentType.includes("application/json")) {
        const payload = (await response.json()) as { url?: string; error?: string; warning?: string };
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
        if (!response.ok) {
          flashStatus(explainError(payload.error || "EXPORT_FAILED"), "err");
          return;
        }
        return;
      }
      const warning = response.headers.get("X-Duoshot-Warning") ?? "";
      const filename = response.headers.get("X-Duoshot-Filename") || "app.zip";
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (zipUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(zipUrlRef.current);
      setZipName(filename);
      setZipUrl(url);
      startZipDownload(url, filename);
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
      flashStatus(error instanceof Error ? explainError(error.message) : t(locale, "error_export"), "err");
    } finally {
      setBusyExport(false);
    }
  }

  async function onReview() {
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
      document.querySelector('[data-testid="quality-gate"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusyReview(true);
    flashStatus(t(locale, "tool_review_preparing"), "busy");
    try {
      const extra = sameSet ? [] : innerFiles;
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
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outerPaths,
          innerPaths,
          sameSet: cloneForced,
          appName: active?.name || "App",
          clientName: active?.clientName || "",
          orientation,
          locale,
          options: renderOptions,
          transforms: {
            outer: outerFiles.map((_, index) => normalizeCropTransform(outerTransforms[index], options.fit)),
            inner: effectiveInner.map((_, index) => normalizeCropTransform(innerTransforms[index], options.fit)),
          },
        }),
      });
      const payload = (await response.json()) as { url?: string; id?: string; expiresAt?: string; error?: string };
      if (!response.ok) {
        if (payload.error === "STUDIO_REQUIRED") setReviewUpgrade(true);
        flashStatus(explainError(payload.error || "STUDIO_REQUIRED"), "err");
        return;
      }
      const publicId = payload.id ?? payload.url?.split("/").filter(Boolean).pop();
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
      const code = error instanceof Error ? error.message : "STUDIO_REQUIRED";
      if (code === "STUDIO_REQUIRED") setReviewUpgrade(true);
      flashStatus(explainError(code), "err");
    } finally {
      setBusyReview(false);
    }
  }

  async function onCheckout(kind: CheckoutKind) {
    if (!signedIn) {
      setPaywall(null);
      setShowAuth(true);
      return;
    }
    setCheckoutBusy(true);
    try {
      await startCheckout(kind, checkoutReturnPath(locale));
    } catch (error) {
      flashStatus(error instanceof Error ? error.message : t(locale, "error_export"), "err");
      setCheckoutBusy(false);
    }
  }

  async function switchSet(id: string) {
    if (active) {
      await saveSetFiles(active.id, "outer", outerFiles);
      await saveSetFiles(active.id, "inner", innerFiles);
    }
    saveActiveId(id);
    setActiveId(id);
    setSlideIndex(0);
    setQualityAcknowledged(false);
    setOuterFiles(await loadSetFiles(id, "outer"));
    setInnerFiles(await loadSetFiles(id, "inner"));
    setZipUrl(null);
  }

  function closeSets() {
    if (!setsRef.current?.open) {
      setSetsOpen(false);
      setSetsClosing(false);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setsRef.current.removeAttribute("open");
      setSetsOpen(false);
      setSetsClosing(false);
      return;
    }
    setSetsOpen(false);
    setSetsClosing(true);
    const closeMs =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dropdown-close-dur")) || 150;
    window.setTimeout(() => {
      setsRef.current?.removeAttribute("open");
      setSetsClosing(false);
    }, closeMs);
  }

  function onSetsTriggerKey(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const root = setsRef.current;
    if (!root) return;
    root.setAttribute("open", "");
    setSetsOpen(true);
    const options = root.querySelectorAll<HTMLButtonElement>('[role="option"]');
    const target = event.key === "ArrowUp" ? options[options.length - 1] : options[0];
    queueMicrotask(() => target?.focus());
  }

  function onSetsMenuKey(event: ReactKeyboardEvent<HTMLUListElement>) {
    const options = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]')];
    if (!options.length) return;
    const index = options.findIndex((el) => el === document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      options[(index + 1 + options.length) % options.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      options[(index - 1 + options.length) % options.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      options[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      options[options.length - 1]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeSets();
      (setsRef.current?.querySelector("summary") as HTMLElement | null)?.focus();
    }
  }

  function addSet() {
    closeSets();
    const next = defaultSet();
    const list = [...sets, next];
    setSets(list);
    saveSetMetas(list);
    void switchSet(next.id);
  }

  async function removeSet(id: string) {
    const list = sets.filter((item) => item.id !== id);
    const fallback = list[0] ?? defaultSet();
    const nextList = list.length ? list : [fallback];
    setSets(nextList);
    saveSetMetas(nextList);
    await deleteSetFiles(id);
    await switchSet(nextList[0]!.id);
  }

  const remaining = billing?.remainingFreeExports;
  const remainingLabel =
    !billing && session === "in"
      ? locale === "fr"
        ? "Chargement du plan…"
        : "Loading plan…"
      : billing?.plan === "studio"
      ? t(locale, "tool_plan_studio")
      : billing?.plan === "indie"
        ? t(locale, "tool_plan_indie")
        : remaining === 1
          ? t(locale, "tool_remaining_one")
          : remaining === 0
            ? t(locale, "tool_remaining_none")
            : remaining != null
              ? tf(locale, "tool_remaining", { n: remaining })
              : t(locale, "tool_guest_quota");
  const pillMute = remaining === 0 && billing?.plan === "free";
  const cloneLabel = clones[slideIndex]?.label ?? (cloneForced && hasExportable ? "risk" : null);
  const visibleReviewUrl = reviewUrl;

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
      <section className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-4xl">{t(locale, "tool_title")}</h1>
          {session === "loading" ? (
            <p className="ds-pill ds-pill-mute" role="status" data-testid="tool-quota-loading">
              {locale === "fr" ? "Chargement du plan…" : "Loading plan…"}
            </p>
          ) : !signedIn ? (
            <button
              type="button"
              className="ds-pill ds-pill-ink"
              data-testid="tool-quota"
              onClick={() => setShowAuth(true)}
            >
              {t(locale, "tool_guest_quota")}
            </button>
          ) : (
            <p className={`ds-pill ${pillMute ? "ds-pill-mute" : "ds-pill-ink"}`} data-testid="tool-quota">
              {remainingLabel}
            </p>
          )}
        </div>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">{t(locale, "tool_lead")}</p>
        <div className="mt-4">
          <TrustLine locale={locale} />
        </div>
        <p className="ds-step-label mt-8"><span>01</span>{locale === "fr" ? "Sources" : "Sources"}</p>
        <div className="ds-set-bar mt-6">
          <div className="ds-field !mt-0 min-w-0 flex-1 basis-64">
            <p className="ds-label" id="tool-sets-label">
              {t(locale, "tool_sets")}
            </p>
            <details
              className="ds-listbox"
              ref={setsRef}
              onToggle={(event) => {
                if (event.currentTarget.open) {
                  setSetsOpen(true);
                  setSetsClosing(false);
                }
              }}
            >
              <summary
                id="tool-sets-trigger"
                className="ds-listbox-trigger"
                data-testid="tool-sets"
                data-ready={hydrated ? "true" : "false"}
                aria-haspopup="listbox"
                aria-expanded={setsOpen}
                aria-controls="tool-sets-menu"
                aria-labelledby="tool-sets-label"
                onClick={(event) => {
                  if (setsRef.current?.open) {
                    event.preventDefault();
                    closeSets();
                  }
                }}
                onKeyDown={onSetsTriggerKey}
              >
                <span>{active?.name?.trim() ? active.name : t(locale, "tool_label_app")}</span>
                <span className="ds-listbox-caret" aria-hidden="true" />
              </summary>
              <ul
                id="tool-sets-menu"
                className={`ds-listbox-menu t-dropdown ${setsOpen ? "is-open" : ""} ${setsClosing ? "is-closing" : ""}`}
                data-origin="top-left"
                role="listbox"
                aria-labelledby="tool-sets-label"
                data-testid="tool-sets-menu"
                onKeyDown={onSetsMenuKey}
              >
                {sets.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={item.id === active?.id}
                      className={`ds-listbox-option ${item.id === active?.id ? "is-on" : ""}`}
                      onClick={() => {
                        closeSets();
                        void switchSet(item.id);
                      }}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </div>
          <div className="ds-set-actions">
            <button type="button" className="ds-cta-ghost" data-testid="tool-set-new" onClick={addSet}>
              {t(locale, "tool_set_new")}
            </button>
            {sets.length > 1 ? (
              <button
                type="button"
                className="ds-text-btn"
                data-testid="tool-set-delete"
                aria-label={tf(locale, "tool_set_delete", { name: active?.name?.trim() || t(locale, "tool_label_app") })}
                onClick={() => active && void removeSet(active.id)}
              >
                {t(locale, "tool_set_delete_short")}
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <DropZone
            testId="drop-outer"
            label={tf(locale, "tool_drop_outer", { w: outerSpec.width, h: outerSpec.height })}
            hint={t(locale, "tool_drop")}
            count={outerFiles.length}
            names={outerFiles.map((file) => file.name)}
            onFiles={(list) => onSideFiles("outer", list)}
          />
          <DropZone
            testId="drop-inner"
            label={tf(locale, "tool_drop_inner", { w: innerSpec.width, h: innerSpec.height })}
            hint={t(locale, "tool_drop")}
            count={sameSet ? outerFiles.length : innerFiles.length}
            names={(sameSet ? outerFiles : innerFiles).map((file) => file.name)}
            disabled={sameSet}
            onFiles={(list) => onSideFiles("inner", list)}
          />
        </div>
        {cloneForced ? (
          <p className="ds-warn-clone" role="alert" data-testid="warn-clone">
            {t(locale, "tool_warn_clone")}
          </p>
        ) : null}
        {unpaired ? (
          <p className="ds-warn" role="status" data-testid="warn-unpaired">
            {t(locale, "tool_warn_unpaired")}
          </p>
        ) : null}
        {warning === "TOO_FEW" ? (
          <p className="ds-warn" role="status" data-testid="warn-too-few">
            {t(locale, "tool_warn")} ({WARN_MIN_IMAGES}+)
          </p>
        ) : null}
        {Math.max(outerFiles.length, effectiveInner.length) >= MAX_IMAGES ? (
          <p className="ds-warn" role="status">
            {t(locale, "tool_cap")}
          </p>
        ) : null}
        <p className="ds-step-label mt-10"><span>02</span>{locale === "fr" ? "Composition" : "Composition"}</p>
        <div className={`preview-duo mt-5${orientation === "landscape" ? " is-landscape" : ""}`}>
          <PreviewCard
            testId="preview-outer"
            label={t(locale, "tool_preview_outer")}
            src={previews?.outer}
            kind="outer"
            inspect={outerInspect}
            spec={outerSpec}
            locale={locale}
            clone={cloneLabel}
            slide={slideIndex}
            transform={outerTransform}
            onTransform={(patch) => updateCropTransform("outer", slideIndex, patch)}
          />
          <PreviewCard
            testId="preview-inner"
            label={t(locale, "tool_preview_inner")}
            src={previews?.inner}
            kind="inner"
            inspect={innerInspect}
            spec={innerSpec}
            locale={locale}
            hinge={showHinge}
            clone={cloneLabel}
            slide={slideIndex}
            transform={innerTransform}
            onTransform={(patch) => updateCropTransform("inner", slideIndex, patch)}
          />
        </div>
        {severeQualityCount > 0 ? (
          <div className="quality-gate" data-testid="quality-gate" data-acknowledged={qualityAcknowledged ? "true" : "false"}>
            <div>
              <p className="quality-gate-title">{tf(locale, "tool_quality_gate_title", { n: severeQualityCount })}</p>
              <p className="quality-gate-copy">{t(locale, "tool_quality_gate_copy")}</p>
            </div>
            <button
              type="button"
              className={qualityAcknowledged ? "ds-pill ds-pill-ink" : "ds-cta-ghost"}
              data-testid="quality-acknowledge"
              aria-pressed={qualityAcknowledged}
              onClick={() => setQualityAcknowledged((value) => !value)}
            >
              {qualityAcknowledged ? t(locale, "tool_quality_acknowledged") : t(locale, "tool_quality_ack")}
            </button>
          </div>
        ) : null}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Filmstrip
            testId="filmstrip-outer"
            files={outerFiles}
            active={slideIndex}
            locale={locale}
            onSelect={setSlideIndex}
            onRemove={(index) => removeSideFile("outer", index)}
          />
          <Filmstrip
            testId="filmstrip-inner"
            files={effectiveInner}
            active={slideIndex}
            locale={locale}
            onSelect={setSlideIndex}
            onRemove={(index) => removeSideFile(sameSet ? "outer" : "inner", index)}
          />
        </div>
        {clones.length > 0 ? (
          <ol className="mt-4 flex flex-wrap gap-2 font-mono text-xs t-avatar-group" data-testid="clone-badges">
            {clones.map((item) => (
              <li key={item.index}>
                <CloneTip
                  label={`${String(item.index + 1).padStart(2, "0")} · ${t(locale, `clone_${item.label}`)}`}
                  hint={t(locale, `clone_${item.label}`)}
                >
                  <button
                    type="button"
                    className={`ds-pill ds-pill-ink t-avatar ${item.index === slideIndex ? "is-on" : ""}`}
                    data-testid={`clone-badge-${item.index}`}
                    data-clone={item.label}
                    onClick={() => setSlideIndex(item.index)}
                  >
                    {String(item.index + 1).padStart(2, "0")} · {t(locale, `clone_${item.label}`)}
                  </button>
                </CloneTip>
              </li>
            ))}
          </ol>
        ) : null}
        <div className="t-acc mt-6" data-testid="same-set-details" data-open={sameSet || sameSetOpen ? "true" : "false"}>
          <button
            type="button"
            className="t-acc-head flex w-full cursor-pointer items-center justify-between gap-3 text-left text-sm text-[var(--muted)]"
            aria-expanded={sameSet || sameSetOpen}
            onClick={() => setSameSetOpen((open) => !open)}
          >
            <span>{t(locale, "tool_same_set")}</span>
            <span className="t-acc-chevron" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 6.5L8 10.5L12 6.5" />
              </svg>
            </span>
          </button>
          <div className="t-acc-panel">
            <div className="t-acc-panel-inner">
              <div className="mt-3 pb-2">
                <DsToggle
                  testId="toggle-same-set"
                  pressed={sameSet}
                  onToggle={() => {
                    setSameSetOpen(true);
                    patchActive({ sameSet: !sameSet });
                  }}
                >
                  {t(locale, "tool_same_set")}
                </DsToggle>
              </div>
            </div>
          </div>
        </div>
      </section>
      <aside className="min-w-0 h-fit border-t border-[var(--line)] pt-5 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:border-t-0 lg:pt-0">
        <p className="ds-step-label mb-4"><span>03</span>{locale === "fr" ? "Vérification et export" : "Check and export"}</p>
        <div className="ds-field">
          <label className="ds-label" htmlFor="tool-input-app">
            {t(locale, "tool_label_app")}
          </label>
          <input
            id="tool-input-app"
            value={active?.name ?? ""}
            onChange={(event) => patchActive({ name: event.target.value })}
            className="ds-input w-full"
          />
        </div>
        <div className="ds-field">
          <label className="ds-label" htmlFor="tool-input-client">
            {t(locale, "tool_client")}
          </label>
          <input
            id="tool-input-client"
            value={active?.clientName ?? ""}
            onChange={(event) => patchActive({ clientName: event.target.value })}
            className="ds-input w-full"
          />
        </div>
        <Seg
          label={t(locale, "tool_label_orientation")}
          value={orientation}
          options={[
            { value: "portrait", label: t(locale, "tool_orient_portrait") },
            { value: "landscape", label: t(locale, "tool_orient_landscape") },
          ]}
          onChange={(value) => {
            patchActive({ orientation: value as Orientation });
            updateOptions({ orientation: value as Orientation });
          }}
        />
        <details className="tool-advanced mt-5">
          <summary>{locale === "fr" ? "Réglages avancés" : "Advanced settings"}</summary>
          <div className="pt-2">
        <Seg
          label={t(locale, "tool_label_fit")}
          value={options.fit}
          options={[
            { value: "contain", label: t(locale, "tool_fit_contain") },
            { value: "cover", label: t(locale, "tool_fit_cover") },
            { value: "smart", label: t(locale, "tool_fit_smart") },
          ]}
          onChange={(value) => updateOptions({ fit: value as FitMode })}
        />
        <Seg
          label={t(locale, "tool_label_bg")}
          value={options.background}
          options={[
            { value: "solid", label: t(locale, "tool_bg_solid") },
            { value: "gradient", label: t(locale, "tool_bg_gradient") },
            { value: "blur", label: t(locale, "tool_bg_blur") },
          ]}
          onChange={(value) => updateOptions({ background: value as RenderOptions["background"] })}
        />
        <div className="ds-field">
          <span className="ds-swatch" style={{ background: options.solidColor }}>
            <input
              type="color"
              value={options.solidColor}
              aria-label={t(locale, "tool_label_bg")}
              onChange={(event) => updateOptions({ solidColor: event.target.value })}
            />
          </span>
        </div>
        <div className="ds-field">
          <label className="ds-label" htmlFor="tool-input-title">
            {t(locale, "tool_label_title")}
          </label>
          <input
            id="tool-input-title"
            value={options.title}
            onChange={(event) => updateOptions({ title: event.target.value })}
            className="ds-input w-full"
          />
        </div>
        <div className="ds-field">
          <label className="ds-label" htmlFor="tool-input-subtitle">
            {t(locale, "tool_label_subtitle")}
          </label>
          <input
            id="tool-input-subtitle"
            value={options.subtitle}
            onChange={(event) => updateOptions({ subtitle: event.target.value })}
            className="ds-input w-full"
          />
        </div>
        <Seg
          label={t(locale, "tool_label_position")}
          value={options.titlePosition}
          options={[
            { value: "top", label: t(locale, "tool_pos_top") },
            { value: "bottom", label: t(locale, "tool_pos_bottom") },
          ]}
          onChange={(value) => updateOptions({ titlePosition: value as RenderOptions["titlePosition"] })}
        />
        <Seg
          label={t(locale, "tool_label_font")}
          value={options.titleFont}
          options={[
            { value: "sans", label: t(locale, "tool_font_sans") },
            { value: "serif", label: t(locale, "tool_font_serif") },
          ]}
          onChange={(value) => updateOptions({ titleFont: value as RenderOptions["titleFont"] })}
        />
        <Seg
          label={t(locale, "tool_label_format")}
          value={options.format}
          options={[
            { value: "png", label: "PNG-24" },
            { value: "jpeg", label: "JPEG q90" },
          ]}
          onChange={(value) => updateOptions({ format: value as OutputFormat })}
        />
        <div className="ds-field">
          <DsToggle testId="toggle-hinge" pressed={showHinge} onToggle={() => setShowHinge((value) => !value)}>
            {t(locale, "tool_hinge_toggle")}
          </DsToggle>
        </div>
        <div className="ds-field">
          <DsToggle
            testId="toggle-burn-hinge"
            pressed={Boolean(options.burnHinge)}
            onToggle={() => updateOptions({ burnHinge: !options.burnHinge })}
          >
            {t(locale, "tool_burn_hinge")}
          </DsToggle>
          <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{t(locale, "tool_burn_hinge_hint")}</p>
        </div>
        <div className="ds-field">
          <DsToggle
            testId="toggle-69"
            pressed={include69}
            onToggle={() => {
              const next = !include69;
              setInclude69(next);
              if (next && (!billing || billing.canUse69 === false)) setPaywall("69");
            }}
          >
            {t(locale, "tool_label_69")}
          </DsToggle>
        </div>
        {cloneLabel === "risk" ? (
          <div className="ds-field">
            <DsToggle testId="toggle-assume-clone" pressed={assumeClone} onToggle={() => setAssumeClone((value) => !value)}>
              {t(locale, "tool_assume_clone")}
            </DsToggle>
            <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{t(locale, "tool_assume_clone_hint")}</p>
          </div>
        ) : null}
          </div>
        </details>
        <button
          type="button"
          disabled={busyExport || !hasExportable}
          data-testid="tool-download"
          onClick={() => void onExport()}
          className="ds-cta mt-6 w-full"
        >
          <SwapLabel text={busyExport ? t(locale, "tool_preparing") : t(locale, "tool_download")} />
        </button>
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
          <a href={zipUrl} download={zipName} data-testid="tool-zip-link" className="ds-text-btn mt-3">
            {t(locale, "tool_open_zip")}
          </a>
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
            disabled={checkoutBusy}
            onClick={() => void onCheckout("studio_monthly")}
            className="ds-cta-ghost mt-3 w-full"
          >
            {t(locale, "pricing_studio_cta")}
          </button>
        ) : null}
      </aside>
      {hasExportable ? (
        <div className="tool-mobile-action lg:hidden" data-testid="tool-mobile-action">
          <button type="button" disabled={busyExport} onClick={() => void onExport()} className="ds-cta w-full">
            <SwapLabel text={busyExport ? t(locale, "tool_preparing") : t(locale, "tool_download")} />
          </button>
        </div>
      ) : null}
      {showAuth || (upgradeRequested && session === "out") ? (
        <Overlay
          onClose={() => {
            setShowAuth(false);
            setUpgradeDismissed(true);
          }}
          labelledBy="auth-modal-title"
        >
          <AuthForm
            locale={locale}
            mode="signup"
            variant="modal"
            nextPath={`${prefix}/tool`}
            onSuccess={() => {
              setShowAuth(false);
              void refreshBilling();
            }}
          />
        </Overlay>
      ) : null}
      {paywall || (upgradeRequested && session === "in") ? (
        <PaywallModal
          locale={locale}
          reason={paywall ?? "trial"}
          busy={checkoutBusy}
          onClose={() => {
            setPaywall(null);
            setUpgradeDismissed(true);
          }}
          onCheckout={(kind) => void onCheckout(kind)}
        />
      ) : null}
    </div>
  );
}

function takeFiles(list: FileList | File[] | DataTransfer | null | undefined): File[] {
  if (!list) return [];
  if (typeof DataTransfer !== "undefined" && list instanceof DataTransfer) {
    const fromFiles = Array.from(list.files);
    if (fromFiles.length) return fromFiles;
    const fromItems: File[] = [];
    for (const item of Array.from(list.items)) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) fromItems.push(file);
      }
    }
    return fromItems;
  }
  return Array.from(list as FileList | File[]);
}

function DropZone({
  testId,
  label,
  hint,
  count,
  names = [],
  disabled = false,
  onFiles,
}: {
  testId: string;
  label: string;
  hint: string;
  count: number;
  names?: string[];
  disabled?: boolean;
  onFiles: (list: FileList | File[] | DataTransfer | null) => void;
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onFilesRef = useRef(onFiles);
  useEffect(() => {
    onFilesRef.current = onFiles;
  }, [onFiles]);
  useEffect(() => {
    const node = inputRef.current;
    if (!node) return;
    const handler = () => {
      const files = takeFiles(node.files);
      if (files.length) onFilesRef.current(files);
      node.value = "";
    };
    node.addEventListener("change", handler);
    return () => node.removeEventListener("change", handler);
  }, []);
  return (
    <label
      className={`ds-drop ${over ? "is-over" : ""} ${disabled ? "is-disabled" : ""}`}
      data-testid={testId}
      data-count={count}
      onDragEnter={() => {
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (disabled) return;
        const files = takeFiles(event.dataTransfer);
        if (files.length) onFiles(files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        disabled={disabled}
        aria-label={label}
        data-testid={`${testId}-input`}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      <span>{label}</span>
      <span className="t-shimmer mt-2 text-sm text-[var(--muted)]" data-text={hint}>
        {hint}
      </span>
      <span className="mt-2 text-sm text-[var(--muted)]">
        <DigitCount value={`${count}`} /> / {MAX_IMAGES}
      </span>
      {names.length ? (
        <span className="drop-names" title={names.join(", ")}>
          {names.join(" · ")}
        </span>
      ) : null}
    </label>
  );
}

function Seg({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const labelId = useId();
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const first = useRef(true);

  const movePill = useCallback((animate: boolean) => {
    const bar = barRef.current;
    const pill = pillRef.current;
    if (!bar || !pill) return;
    const tab = bar.querySelector<HTMLElement>(`[data-seg="${value}"]`);
    if (!tab) return;
    if (!animate) pill.style.transition = "none";
    pill.style.transform = `translateX(${tab.offsetLeft}px)`;
    pill.style.width = `${tab.offsetWidth}px`;
    if (!animate) {
      void pill.offsetWidth;
      pill.style.transition = "";
    }
  }, [value]);

  useEffect(() => {
    movePill(!first.current);
    first.current = false;
    const onResize = () => movePill(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [movePill, options]);

  return (
    <div className="ds-field">
      <p className="ds-label" id={labelId}>
        {label}
      </p>
      <div
        ref={barRef}
        className="ds-seg t-tabs"
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={(event) => {
          const dir =
            event.key === "ArrowRight" || event.key === "ArrowDown"
              ? 1
              : event.key === "ArrowLeft" || event.key === "ArrowUp"
                ? -1
                : 0;
          if (!dir) return;
          event.preventDefault();
          const group = event.currentTarget;
          const index = options.findIndex((option) => option.value === value);
          const next = options[(index + dir + options.length) % options.length];
          if (!next) return;
          onChange(next.value);
          queueMicrotask(() => {
            (group.querySelector(`[data-seg="${next.value}"]`) as HTMLButtonElement | null)?.focus();
          });
        }}
      >
        <span ref={pillRef} className="t-tabs-pill" aria-hidden="true" />
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            data-seg={option.value}
            className={`t-tab ${value === option.value ? "is-on" : ""}`}
            aria-checked={value === option.value}
            tabIndex={value === option.value ? 0 : -1}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PreviewCard({
  testId,
  label,
  src,
  kind,
  inspect,
  spec,
  locale,
  hinge = false,
  clone,
  slide,
  transform,
  onTransform,
}: {
  testId: string;
  label: string;
  src?: string;
  kind: "outer" | "inner";
  inspect: SourceInspect | null;
  spec: { width: number; height: number };
  locale: Locale;
  hinge?: boolean;
  clone: CloneResult["label"] | null;
  slide: number;
  transform: CropTransform;
  onTransform: (patch: Partial<CropTransform>) => void;
}) {
  const specLabel = `${spec.width}×${spec.height}`;
  const dragRef = useRef<{ pointerId: number; x: number; y: number; focusX: number; focusY: number } | null>(null);
  const metrics = inspect
    ? compositionMetrics(inspect.width, inspect.height, spec.width, spec.height, transform)
    : null;
  const metricTone = metrics?.severity ?? "ok";
  return (
    <figure data-testid={testId} data-slide={slide}>
      <figcaption className="duo-caption text-left">{label}</figcaption>
      <div className="preview-stage">
        <div
          className={`preview-glass t-resize ${kind === "outer" ? "preview-outer" : "preview-inner"} ${src ? "t-skel is-revealed" : "preview-empty"} ${kind === "inner" && hinge && src ? "is-hinge" : "hinge-off"} ${src && transform.fit === "cover" ? "is-draggable" : ""}`}
          data-testid={`${testId}-canvas`}
          onPointerDown={(event) => {
            if (!src || transform.fit !== "cover") return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              focusX: transform.x,
              focusY: transform.y,
            };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            const rect = event.currentTarget.getBoundingClientRect();
            onTransform({
              x: drag.focusX - (event.clientX - drag.x) / Math.max(rect.width, 1),
              y: drag.focusY - (event.clientY - drag.y) / Math.max(rect.height, 1),
            });
          }}
          onPointerUp={(event) => {
            if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          {src ? (
            <>
              <div className="t-skel-skeleton" aria-hidden="true">
                <span />
              </div>
              <div className="t-skel-content">
                {/* User-generated preview from canvas.toDataURL */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={label} />
              </div>
            </>
          ) : (
            <span className="preview-empty-copy">{t(locale, "tool_empty")}</span>
          )}
          {kind === "inner" ? <span className="division" aria-hidden="true" /> : null}
        </div>
      </div>
      {src ? (
        <div className="crop-controls" data-testid={`${testId}-crop-controls`}>
          <div className="crop-fit" role="group" aria-label={t(locale, "tool_crop_mode")}>
            <button
              type="button"
              className={transform.fit === "cover" ? "is-on" : ""}
              aria-pressed={transform.fit === "cover"}
              onClick={() => onTransform({ fit: "cover" })}
            >
              {t(locale, "tool_crop_fill")}
            </button>
            <button
              type="button"
              className={transform.fit === "contain" ? "is-on" : ""}
              aria-pressed={transform.fit === "contain"}
              onClick={() => onTransform({ fit: "contain" })}
            >
              {t(locale, "tool_crop_show_all")}
            </button>
            <button
              type="button"
              onClick={() => onTransform({ x: 0.5, y: 0.5 })}
            >
              {t(locale, "tool_crop_reset")}
            </button>
          </div>
          {transform.fit === "cover" ? (
            <div className="crop-axis-controls">
              <label>
                <span>{t(locale, "tool_crop_horizontal")}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(transform.x * 100)}
                  onChange={(event) => onTransform({ x: Number(event.target.value) / 100 })}
                />
              </label>
              <label>
                <span>{t(locale, "tool_crop_vertical")}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(transform.y * 100)}
                  onChange={(event) => onTransform({ y: Number(event.target.value) / 100 })}
                />
              </label>
            </div>
          ) : null}
          {metrics ? (
            <p className={`crop-metrics is-${metricTone}`} data-testid={`${testId}-metrics`}>
              {tf(locale, "tool_crop_metrics", {
                crop: metrics.cropPercent.toFixed(1),
                scale: metrics.scale.toFixed(2),
              })}
            </p>
          ) : null}
          <p className="crop-hint">{transform.fit === "cover" ? t(locale, "tool_crop_drag_hint") : t(locale, "tool_crop_contain_hint")}</p>
        </div>
      ) : null}
      <ul className="space-y-1 text-xs text-[var(--muted)]">
        <li>
          {inspect
            ? inspect.hasAlpha
              ? t(locale, "tool_check_alpha_flat")
              : t(locale, "tool_check_alpha_ok")
            : t(locale, "tool_check_await")}
        </li>
        <li>
          {t(locale, "tool_label_orientation")}: {specLabel}
        </li>
        <li>
          {inspect
            ? inspect.colorSpace === "other"
              ? t(locale, "tool_check_rgb_bad")
              : t(locale, "tool_check_rgb_ok")
            : t(locale, "tool_check_await")}
        </li>
        {kind === "inner" ? <li>{t(locale, "tool_check_hinge")}</li> : null}
        <li data-testid={`${testId}-clone`}>
          {clone ? tf(locale, "tool_check_clone", { label: t(locale, `clone_${clone}`) }) : t(locale, "tool_check_clone_wait")}
        </li>
        <li>{inspect ? t(locale, "tool_check_zip") : t(locale, "tool_check_zip_wait")}</li>
      </ul>
    </figure>
  );
}

function Filmstrip({
  testId,
  files,
  active,
  locale,
  onSelect,
  onRemove,
}: {
  testId: string;
  files: File[];
  active: number;
  locale: Locale;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  if (files.length === 0) return null;

  function setShifts(activeIdx: number | null, phase: "in" | "out") {
    if (!rootRef.current) return;
    const cs = getComputedStyle(document.documentElement);
    const num = (name: string, fallback: number) => {
      const parsed = parseFloat(cs.getPropertyValue(name));
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    const ease = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
    const lift = num("--avatar-lift", -4);
    const falloff = num("--avatar-falloff", 0.45);
    const scale = num("--avatar-scale", 1.05);
    const timing =
      phase === "out"
        ? ease("--avatar-ease-out", "cubic-bezier(0.34, 3.85, 0.64, 1)")
        : ease("--avatar-ease-in", "cubic-bezier(0.22, 1, 0.36, 1)");
    rootRef.current.querySelectorAll<HTMLElement>(".t-avatar").forEach((el, index) => {
      el.style.transitionTimingFunction = timing;
      if (activeIdx == null) {
        el.style.setProperty("--shift", "0px");
        el.style.setProperty("--scale-active", "1");
        return;
      }
      const distance = Math.abs(index - activeIdx);
      el.style.setProperty("--shift", `${(lift * Math.pow(falloff, distance)).toFixed(3)}px`);
      el.style.setProperty("--scale-active", index === activeIdx ? String(scale) : "1");
    });
  }

  return (
    <div ref={rootRef} className="t-avatar-group" onMouseLeave={() => setShifts(null, "out")}>
      <ol className="filmstrip" data-testid={testId}>
        {files.map((file, index) => {
          const seq = String(index + 1).padStart(2, "0");
          return (
            <li key={`${file.name}-${index}`} className="filmstrip-item t-avatar">
              <button
                type="button"
                className={`filmstrip-thumb ${index === active ? "is-on" : ""}`}
                data-testid={`${testId}-${seq}`}
                aria-current={index === active}
                aria-label={tf(locale, "tool_slide", { n: seq })}
                onMouseEnter={() => setShifts(index, "in")}
                onClick={() => onSelect(index)}
              >
                {seq}
                <span className="filmstrip-name">{file.name}</span>
              </button>
              <button
                type="button"
                className="filmstrip-remove"
                data-testid={`${testId}-remove-${seq}`}
                aria-label={tf(locale, "tool_remove_slide", { n: seq })}
                onClick={() => onRemove(index)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function DigitCount({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const group = ref.current;
    if (!group) return;
    group.classList.remove("is-animating");
    group.replaceChildren();
    value.split("").forEach((ch, index, chars) => {
      const span = document.createElement("span");
      span.className = "t-digit";
      span.textContent = ch;
      if (index === chars.length - 2) span.dataset.stagger = "1";
      else if (index === chars.length - 1) span.dataset.stagger = "2";
      group.appendChild(span);
    });
    void group.offsetHeight;
    group.classList.add("is-animating");
  }, [value]);
  return (
    <>
      <span className="sr-only">{value}</span>
      <span ref={ref} className="t-digit-group" aria-hidden="true" />
    </>
  );
}

function SwapLabel({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(text);
  useEffect(() => {
    const el = ref.current;
    if (!el || prev.current === text) {
      if (el) el.textContent = text;
      return;
    }
    const dur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--text-swap-dur")) || 150;
    el.classList.add("is-exit");
    const timer = window.setTimeout(() => {
      el.textContent = text;
      el.classList.remove("is-exit");
      el.classList.add("is-enter-start");
      void el.offsetHeight;
      el.classList.remove("is-enter-start");
      prev.current = text;
    }, dur);
    return () => window.clearTimeout(timer);
  }, [text]);
  return <span ref={ref} className="t-text-swap">{text}</span>;
}

function DsToggle({
  pressed,
  onToggle,
  testId,
  children,
}: {
  pressed: boolean;
  onToggle: () => void;
  testId: string;
  children: ReactNode;
}) {
  const [init, setInit] = useState(false);
  return (
    <button
      type="button"
      className="ds-toggle"
      data-testid={testId}
      aria-pressed={pressed}
      onClick={() => {
        setInit(true);
        onToggle();
      }}
    >
      <span className="text-sm">{children}</span>
      <span className={`ds-toggle-track t-toggle ${init ? "is-init" : ""}`} data-on={pressed ? "true" : "false"}>
        <span className="ds-toggle-thumb t-toggle-thumb" />
      </span>
    </button>
  );
}

function CloneTip({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  const groupRef = useRef<HTMLSpanElement>(null);
  function hide() {
    const tip = groupRef.current?.querySelector<HTMLElement>(".t-tt");
    if (!tip) return;
    tip.setAttribute("data-show", "false");
    tip.setAttribute("aria-hidden", "true");
  }
  function place() {
    const group = groupRef.current;
    const tip = group?.querySelector<HTMLElement>(".t-tt");
    const text = group?.querySelector<HTMLElement>(".t-tt-text");
    const trigger = group?.querySelector<HTMLElement>(".t-tt-trigger");
    if (!group || !tip || !text || !trigger) return;
    const showing = tip.getAttribute("data-show") === "true";
    text.textContent = hint;
    const cs = getComputedStyle(tip);
    const width = Math.ceil(text.scrollWidth + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight));
    const g = group.getBoundingClientRect();
    const r = trigger.getBoundingClientRect();
    const x = r.left - g.left + r.width / 2 - width / 2;
    if (!showing) {
      tip.style.transition = "none";
      tip.style.width = `${width}px`;
      tip.style.setProperty("--tt-x", `${x}px`);
      void tip.offsetWidth;
      tip.style.transition = "";
    } else {
      tip.style.width = `${width}px`;
      tip.style.setProperty("--tt-x", `${x}px`);
    }
    tip.setAttribute("data-show", "true");
    tip.setAttribute("aria-hidden", "false");
  }
  return (
    <span ref={groupRef} className="t-tt-group" onPointerLeave={hide}>
      <span className="t-tt-trigger" data-tooltip={hint} onPointerEnter={place} onFocus={place} onBlur={hide}>
        {children}
      </span>
      <span className="t-tt" data-show="false" aria-hidden="true">
        <span className="t-tt-text">{label}</span>
      </span>
    </span>
  );
}

function StatusLine({
  text,
  kind,
  testId,
}: {
  text: string | null;
  kind: "ok" | "err" | "busy" | "info";
  testId: string;
}) {
  if (!text) return null;
  return (
    <p
      className={`t-toast is-open mt-3 text-sm ${kind === "err" ? "t-input is-error is-shaking" : ""}`}
      data-testid={testId}
      data-kind={kind}
    >
      {kind === "busy" ? (
        <span className="t-think">
          <span className="t-think-sizer">{text}</span>
          <span className="t-think-text" data-text={text}>
            {text}
          </span>
        </span>
      ) : (
        <>
          {kind === "ok" ? (
            <span className="t-success-check mr-2 inline-block align-middle" data-state="in">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 8.5L6.2 12L13 4.5" />
              </svg>
            </span>
          ) : null}
          {text}
        </>
      )}
    </p>
  );
}

function drawTarget(
  bitmap: ImageBitmap,
  options: RenderOptions,
  spec: Pick<SizeSpec, "slot" | "orientation" | "width" | "height">,
  cropTransform?: CropTransform,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  if (options.background === "gradient") {
    const gradient = ctx.createLinearGradient(0, 0, 0, spec.height);
    gradient.addColorStop(0, options.gradientFrom);
    gradient.addColorStop(1, options.gradientTo);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = options.solidColor;
  }
  ctx.fillRect(0, 0, spec.width, spec.height);
  if (options.background === "blur") {
    ctx.filter = "blur(28px)";
    const cover = coverRect(bitmap.width, bitmap.height, spec.width, spec.height);
    ctx.drawImage(bitmap, cover.left, cover.top, cover.width, cover.height);
    ctx.filter = "none";
  }
  const transform = normalizeCropTransform(cropTransform, options.fit);
  const rect = compositionMetrics(
    bitmap.width,
    bitmap.height,
    spec.width,
    spec.height,
    transform,
  ).rect;
  ctx.drawImage(bitmap, rect.left, rect.top, rect.width, rect.height);
  const layout = textOverlayLayout(spec, options.titlePosition);
  if (options.title || options.subtitle) {
    ctx.fillStyle = "#F4F1EA";
    ctx.textAlign = "center";
    const family = options.titleFont === "serif" ? "Georgia, serif" : "system-ui";
    if (options.title) {
      ctx.font = `700 ${layout.titleSize}px ${family}`;
      ctx.fillText(options.title, layout.x, layout.yTitle, layout.maxWidth);
    }
    if (options.subtitle) {
      ctx.globalAlpha = 0.82;
      ctx.font = `700 ${layout.subtitleSize}px ${family}`;
      ctx.fillText(options.subtitle, layout.x, layout.ySubtitle, layout.maxWidth);
      ctx.globalAlpha = 1;
    }
  }
  return canvas.toDataURL("image/jpeg", 0.7);
}

function startZipDownload(url: string, filename: string) {
  if (typeof window === "undefined" || "Cypress" in window) return;
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}
