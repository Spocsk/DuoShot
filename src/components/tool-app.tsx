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
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import gsap from "gsap";
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_RENDER_OPTIONS,
  MAX_IMAGES,
  WARN_MIN_IMAGES,
  normalizeCropTransform,
  connectPreviewStyle,
  duoChassisAspect,
  duoSpec,
  textOverlayLayout,
  zipFolderName,
  type CropTransform,
  type DeviceSlot,
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
import { checkoutReturnPath, isCheckoutKind, startCheckout } from "@/lib/checkout";
import { trackProduct } from "@/lib/analytics-client";
import type { CheckoutKind } from "@/lib/plans";
import {
  defaultSet,
  createSetStore,
  importLocalDrafts,
  loadSetMetas as readDraftMetas,
  type SetMeta,
} from "@/lib/sets-store";
import { Overlay } from "@/components/overlay";
import { PaywallModal } from "@/components/paywall-modal";
import { AuthForm } from "@/components/auth-form";
import { localePrefix, reviewPath } from "@/lib/site";
import { mapLimit } from "@/lib/map-limit";
import { mergeSideFiles } from "@/lib/merge-side-files";
import { checkFoldImage } from "@/lib/fold-ocr-browser";
import type { FoldCheckStatus } from "@/lib/fold-detection";
import type { Worker as OcrWorker } from "tesseract.js";

type Props = { locale: Locale };

type BillingStatus = {
  plan?: string;
  source?: string;
  remainingFreeExports?: number | null;
  canUse69?: boolean;
  checkoutAvailable?: boolean;
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
type FoldCheck = { key: string; status: FoldCheckStatus; count: number };

export function ToolApp({ locale }: Props) {
  const [owner, setOwner] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createBrowserSupabase();
    let current = true;
    let authChanged = false;
    void supabase.auth.getUser().then(({ data }) => { if (current && !authChanged) setOwner(data.user?.id ?? "guest"); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { authChanged = true; setOwner(session?.user.id ?? "guest"); });
    return () => { current = false; data.subscription.unsubscribe(); };
  }, []);
  return (
    <main id="main" className="flex-1">
      <Suspense fallback={<div className="mx-auto max-w-6xl px-5 py-10 text-[var(--muted)]">…</div>}>
        {owner ? <ToolAppInner key={owner} locale={locale} owner={owner} /> : <p role="status">{locale === "fr" ? "Chargement de l’atelier…" : "Loading workspace…"}</p>}
      </Suspense>
    </main>
  );
}

function ToolAppInner({ locale, owner }: Props & { owner: string }) {
  const [storageError, setStorageError] = useState(false);
  const [draftSource] = useState<"guest" | "legacy" | null>(() => owner !== "guest" && readDraftMetas("guest").length ? "guest" : readDraftMetas("legacy").length ? "legacy" : null);
  const { loadSetMetas, saveSetMetas, loadActiveId, saveActiveId, loadSetFiles, saveSetFiles, deleteSetFiles } = useMemo(() => createSetStore(owner, () => setStorageError(true)), [owner]);
  const prefix = localePrefix(locale);
  const searchParams = useSearchParams();
  const [sets, setSets] = useState<SetMeta[]>([BOOT_SET]);
  const [activeId, setActiveId] = useState<string>(BOOT_SET.id);
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const active = sets.find((item) => item.id === activeId) ?? sets[0];
  const [outerFiles, setOuterFiles] = useState<File[]>([]);
  const [innerFiles, setInnerFiles] = useState<File[]>([]);
  const options = useMemo(() => ({ ...DEFAULT_RENDER_OPTIONS, ...active?.renderOptions }), [active?.renderOptions]);
  const include69 = active?.include69 ?? false;
  const [showHinge, setShowHinge] = useState(true);
  const [previewMode, setPreviewMode] = useState<"device" | "pixels">("pixels");
  const [assumeClone, setAssumeClone] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"ok" | "err" | "busy" | "info">("info");
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [zipName, setZipName] = useState("app.zip");
  const [exportImages, setExportImages] = useState<Array<{slot: string; index: number; width: number; height: number; format: string}>>([]);
  const [busyExport, setBusyExport] = useState(false);
  const [busyReview, setBusyReview] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [toolPanel, setToolPanel] = useState<"captures" | "adjust" | "review">("captures");
  const [mobileView, setMobileView] = useState<"outer" | "inner" | "compare">("outer");
  const [adjustSide, setAdjustSide] = useState<"outer" | "inner">("outer");
  const completedSetsRef = useRef<Set<string>>(new Set());
  const [sameSetOpen, setSameSetOpen] = useState(false);
  const [previews, setPreviews] = useState<{ outer: string; inner: string } | null>(null);
  const [outerInspects, setOuterInspects] = useState<SourceInspect[]>([]);
  const [innerInspects, setInnerInspects] = useState<SourceInspect[]>([]);
  const [foldChecks, setFoldChecks] = useState<Record<number, FoldCheck>>({});
  const foldCacheRef = useRef(new Map<string, FoldCheck>());
  const foldFileIdsRef = useRef(new WeakMap<File, number>());
  const nextFoldFileIdRef = useRef(1);
  const ocrWorkerRef = useRef<Promise<OcrWorker> | null>(null);
  const ocrQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [qualityAcknowledged, setQualityAcknowledged] = useState(false);
  const [appUsageConfirmed, setAppUsageConfirmed] = useState(false);
  const [clones, setClones] = useState<CloneResult[]>([]);
  const [billingError, setBillingError] = useState(false);
  const [activationTimedOut, setActivationTimedOut] = useState(false);
  const [activationAttempt, setActivationAttempt] = useState(0);
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [session, setSession] = useState<"loading" | "out" | "in">("loading");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
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
  const signedIn = session === "in";
  const checkoutFlag = searchParams.get("checkout");
  const upgradeRequested = searchParams.get("upgrade") === "1" && !upgradeDismissed;
  const requestedPlan = searchParams.get("plan") ?? undefined;
  const preferredUpgradeKind = isCheckoutKind(requestedPlan) ? requestedPlan : undefined;
  const urlStatus =
    checkoutFlag === "success"
      ? billing?.source === "stripe" && billing.plan !== "free"
        ? t(locale, "checkout_success")
        : locale === "fr" ? (activationTimedOut ? "Activation non confirmée. Vérifie à nouveau le statut de l’abonnement." : "Retour du paiement. Vérification de l’activation en cours…") : (activationTimedOut ? "Activation not confirmed. Check your subscription status again." : "Returned from checkout. Checking activation…")
      : checkoutFlag === "cancel"
        ? t(locale, "checkout_cancel")
        : null;

  const sameSet = active?.sameSet ?? false;
  const effectiveInner = sameSet ? outerFiles : innerFiles;
  const unpaired = !sameSet && outerFiles.length > 0 && innerFiles.length > 0 && outerFiles.length !== innerFiles.length;
  const cloneForced = sameSet;
  const hasExportable = outerFiles.length > 0 && (sameSet || innerFiles.length > 0);
  useEffect(() => {
    if (!active || completedSetsRef.current.has(active.id) || !hasExportable) return;
    completedSetsRef.current.add(active.id);
    setToolPanel("adjust");
  }, [active, hasExportable]);
  const outerSlide = outerFiles[slideIndex];
  const innerSlide = effectiveInner[slideIndex];
  const orientation: Orientation = active?.orientation ?? "portrait";
  const globalFit = active?.fitMode ?? DEFAULT_RENDER_OPTIONS.fit;
  const renderOptions = useMemo(
    () => ({ ...options, fit: globalFit, orientation }),
    [options, globalFit, orientation],
  );
  const outerSpec = duoSpec("duo-outer", orientation);
  const innerSpec = duoSpec("duo-inner", orientation);
  const outerTransforms = active?.transforms?.outer ?? EMPTY_TRANSFORMS;
  const innerTransforms = active?.transforms?.inner ?? EMPTY_TRANSFORMS;
  const outerTransform = useMemo(
    () => normalizeCropTransform(outerTransforms[slideIndex], globalFit),
    [globalFit, outerTransforms, slideIndex],
  );
  const innerTransform = useMemo(
    () => normalizeCropTransform(innerTransforms[slideIndex], globalFit),
    [globalFit, innerTransforms, slideIndex],
  );
  const outerInspect = outerInspects[slideIndex] ?? null;
  const effectiveInnerInspects = sameSet ? outerInspects : innerInspects;
  const innerInspect = effectiveInnerInspects[slideIndex] ?? null;

  useEffect(() => {
    let cancelled = false;
    const jobs = effectiveInner.map((file, index) => {
      let fileId = foldFileIdsRef.current.get(file);
      if (!fileId) {
        fileId = nextFoldFileIdRef.current++;
        foldFileIdsRef.current.set(file, fileId);
      }
      const transform = normalizeCropTransform(innerTransforms[index], globalFit);
      return { file, index, transform, key: [activeId, fileId, orientation, options.solidColor, transform.fit, transform.x, transform.y, transform.zoom].join(":") };
    });
    setFoldChecks((previous) => Object.fromEntries(jobs.map((job) => [job.index,
      foldCacheRef.current.get(job.key) ?? (previous[job.index]?.key === job.key ? previous[job.index] : { key: job.key, status: "checking", count: 0 }),
    ])));
    const timer = window.setTimeout(() => { void (async () => {
      for (const job of jobs) {
        if (cancelled) return;
        if (foldCacheRef.current.has(job.key)) continue;
        try {
          ocrWorkerRef.current ??= import("tesseract.js").then(async ({ createWorker, PSM }) => {
            const worker = await createWorker(["eng", "fra"]);
            await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
            return worker;
          });
          const worker = await ocrWorkerRef.current;
          if (cancelled) return;
          const scan = ocrQueueRef.current.then(() => cancelled ? null : checkFoldImage(job.file, innerSpec, job.transform, worker, options.solidColor));
          ocrQueueRef.current = scan.then(() => undefined, () => undefined);
          const count = await scan;
          if (count === null) return;
          if (cancelled) return;
          const result: FoldCheck = { key: job.key, status: count > 0 ? "warning" : "clear", count };
          foldCacheRef.current.set(job.key, result);
          setFoldChecks((previous) => previous[job.index]?.key === job.key ? { ...previous, [job.index]: result } : previous);
        } catch {
          if (cancelled) return;
          const result: FoldCheck = { key: job.key, status: "error", count: 0 };
          setFoldChecks((previous) => previous[job.index]?.key === job.key ? { ...previous, [job.index]: result } : previous);
        }
      }
    })(); }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [activeId, effectiveInner, innerSpec, innerTransforms, globalFit, options.solidColor, orientation]);

  useEffect(() => () => {
    void ocrWorkerRef.current?.then((worker) => worker.terminate()).catch(() => {});
  }, []);

  const foldWarningCount = Object.values(foldChecks).filter((check) => check.status === "warning").length;
  const currentFoldCheck = foldChecks[slideIndex];

  const qualityItems = useMemo(() => {
    const outer = outerInspects.map((inspect, index) => ({
      side: "outer" as const,
      index,
      ...compositionMetrics(
        inspect.width,
        inspect.height,
        outerSpec.width,
        outerSpec.height,
        normalizeCropTransform(outerTransforms[index], globalFit),
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
        normalizeCropTransform(innerTransforms[index], globalFit),
      ),
    }));
    return [...outer, ...inner];
  }, [effectiveInnerInspects, innerSpec.height, innerSpec.width, innerTransforms, globalFit, outerInspects, outerSpec.height, outerSpec.width, outerTransforms]);
  const severeQualityCount = qualityItems.filter((item) => item.severity === "severe").length;
  const cloneAlert = cloneForced || clones.some((item) => item.label === "risk");
  const preparationChecks = [
    hasExportable,
    hasExportable && !unpaired,
    hasExportable && !cloneAlert,
    hasExportable && severeQualityCount === 0,
    appUsageConfirmed,
    Boolean(zipUrl && exportImages.length),
  ];
  const preparationScore = Math.round(preparationChecks.filter(Boolean).length / preparationChecks.length * 100);

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
    setBillingError(false);
    try {
      const supabase = createBrowserSupabase();
      const { data } = await supabase.auth.getUser();
      if (!data.user) { setSession("out"); setBilling(null); return; }
      setSession("in");
      const response = await fetch("/api/billing/status", { cache: "no-store" });
      if (!response.ok) throw new Error("BILLING_UNAVAILABLE");
      setBilling(await response.json() as BillingStatus);
    } catch { setBilling(null); setBillingError(true); }
  }, []);

  useEffect(() => {
    if (checkoutFlag !== "success" || (billing?.source === "stripe" && billing.plan !== "free")) return;
    const timer = window.setInterval(() => void refreshBilling(), 2000);
    const timeout = window.setTimeout(() => { window.clearInterval(timer); setActivationTimedOut(true); }, 60000);
    return () => { window.clearInterval(timer); window.clearTimeout(timeout); };
  }, [billing?.plan, billing?.source, checkoutFlag, refreshBilling, activationAttempt]);

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
  }, [loadActiveId, loadSetFiles, loadSetMetas, saveActiveId, saveSetMetas]);

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
    [active, sets, session, saveSetMetas],
  );

  useEffect(() => {
    const max = Math.max(outerFiles.length, effectiveInner.length, 1) - 1;
    queueMicrotask(() => setSlideIndex((index) => Math.min(index, max)));
  }, [outerFiles.length, effectiveInner.length]);

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

  async function onSideFiles(side: "outer" | "inner", list: FileList | File[] | DataTransfer | null) {
    const selected = takeFiles(list);
    const checked = await Promise.all(selected.slice(0, MAX_IMAGES).map(async (file) => {
      if (!isAllowedImage(file) || file.size > 50 * 1024 * 1024) return null;
      try { const bitmap = await createImageBitmap(file); bitmap.close(); return file; } catch { return null; }
    }));
    const incoming = checked.filter((file): file is File => file !== null);
    if (incoming.length < selected.length) flashStatus(locale === "fr" ? "Certains fichiers ont été ignorés : PNG ou JPEG lisibles, 50 Mo maximum et 10 captures par côté." : "Some files were skipped: readable PNG or JPEG, up to 50 MB and 10 screenshots per side.", "err");
    const current = side === "outer" ? outerFiles : innerFiles;
    const next = mergeSideFiles(current, incoming);
    if (next.length > current.length) {
      void trackProduct("captures_added", { side, count: next.length - current.length });
    }
    if (side === "outer") setOuterFiles(next);
    else {
      setInnerFiles(next);
      if (outerFiles.length === 0) { setMobileView("inner"); setAdjustSide("inner"); }
    }
    setQualityAcknowledged(false);
    setAppUsageConfirmed(false);
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
    setAppUsageConfirmed(false);
    setZipUrl(null);
    if (active) void saveSetFiles(active.id, side, next).catch(() => {});
  }

  function updateOptions(patch: Partial<RenderOptions>) {
    patchActive({ renderOptions: { ...options, ...patch } });
    setQualityAcknowledged(false);
    setAppUsageConfirmed(false);
    setZipUrl(null);
  }

  function updateGlobalFit(fit: FitMode) {
    if (!active) return;
    const current = active.transforms ?? { outer: [], inner: [] };
    const transforms = {
      outer: Array.from({ length: Math.max(current.outer.length, outerFiles.length) }, (_, index) => ({ ...normalizeCropTransform(current.outer[index], globalFit), fit })),
      inner: Array.from({ length: Math.max(current.inner.length, effectiveInner.length) }, (_, index) => ({ ...normalizeCropTransform(current.inner[index], globalFit), fit })),
    };
    const nextSets = sets.map((item) => item.id === active.id ? { ...item, fitMode: fit, transforms } : item);
    setSets(nextSets);
    saveSetMetas(nextSets);
    setQualityAcknowledged(false);
    setAppUsageConfirmed(false);
    setZipUrl(null);
  }

  function updateCropTransform(side: "outer" | "inner", index: number, patch: Partial<CropTransform>) {
    if (!active) return;
    const currentTransforms = active.transforms ?? { outer: [], inner: [] };
    const sideTransforms = [...currentTransforms[side]];
    sideTransforms[index] = normalizeCropTransform({
      ...normalizeCropTransform(sideTransforms[index], globalFit),
      ...patch,
    });
    const transforms = { ...currentTransforms, [side]: sideTransforms };
    const nextSets = sets.map((item) => item.id === active.id ? { ...item, transforms } : item);
    setSets(nextSets);
    saveSetMetas(nextSets);
    setQualityAcknowledged(false);
    setAppUsageConfirmed(false);
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
    if (code === "EXPORT_TOO_LARGE") return locale === "fr" ? "Le ZIP dépasse la limite de stockage. Réduis le nombre de paires ou choisis JPEG." : "The ZIP exceeds the storage limit. Use fewer pairs or choose JPEG.";
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
            outer: outerFiles.map((_, index) => normalizeCropTransform(outerTransforms[index], globalFit)),
            inner: effectiveInner.map((_, index) => normalizeCropTransform(innerTransforms[index], globalFit)),
          },
        }),
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
        flashStatus(explainError(payload.error || "EXPORT_FAILED"), "err");
        return;
      }
      if (!payload.url) throw new Error("STORAGE_UNAVAILABLE");
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
      flashStatus(error instanceof Error ? explainError(error.message) : t(locale, "error_export"), "err");
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
          EXPORT_EXPIRED: ["Ce ZIP a expiré après 24 h. Tes captures locales restent disponibles.", "This ZIP expired after 24 hours. Your local screenshots remain available."],
          EXPORT_DELETED: ["Ce fichier a été supprimé du serveur.", "This file has been removed from the server."],
          AUTH_REQUIRED: ["Reconnecte-toi pour récupérer ce fichier.", "Sign in again to retrieve this file."],
        };
        const message = messages[payload.error ?? ""];
        flashStatus(message ? message[locale === "fr" ? 0 : 1] : locale === "fr" ? "Téléchargement indisponible. Réessaie sans générer un nouvel export." : "Download unavailable. Retry without generating another export.", "err");
        return;
      }
      setZipUrl(payload.url);
      window.location.assign(payload.url);
    } catch { flashStatus(locale === "fr" ? "Erreur réseau. Réessaie le téléchargement ; aucun essai supplémentaire n’est consommé." : "Network error. Retry the download; no additional trial is consumed.", "err"); }
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
            outer: outerFiles.map((_, index) => normalizeCropTransform(outerTransforms[index], globalFit)),
            inner: effectiveInner.map((_, index) => normalizeCropTransform(innerTransforms[index], globalFit)),
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
      void trackProduct("review_failed", { reason: "network_or_storage" });
      const code = error instanceof Error ? error.message : "STUDIO_REQUIRED";
      if (code === "STUDIO_REQUIRED") setReviewUpgrade(true);
      flashStatus(explainError(code), "err");
    } finally {
      setBusyReview(false);
    }
  }

  async function onCheckout(kind: CheckoutKind) {
    if (!billing?.checkoutAvailable) { flashStatus(locale === "fr" ? "Les paiements ne sont pas encore ouverts." : "Payments are not open yet.", "info"); return; }
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
    setToolPanel("captures");
    setMobileView("outer");
    setQualityAcknowledged(false);
    setAppUsageConfirmed(false);
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
    billingError ? (locale === "fr" ? "Statut temporairement indisponible" : "Status temporarily unavailable") : !billing && session === "in"
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
    <div className="studio-tool-shell mx-auto max-w-[92rem] px-5 pb-24 pt-5" data-tool-panel={toolPanel}>
      <header className="tool-command-bar" id="tool-create">
        <div className="tool-command-brand"><span className="tool-command-dot" aria-hidden="true" /><span>{locale === "fr" ? "Atelier" : "Workspace"}</span></div>
        <div className="tool-command-set">
          <div className="ds-set-bar">
          <div className="ds-field !mt-0 min-w-0 flex-1 basis-64">
            <p className="mb-2 text-xs text-[var(--muted)]">{locale === "fr" ? "Brouillons sur cet appareil · sans synchronisation" : "Drafts on this device · no synchronization"}</p>
            {storageError ? <p role="alert" className="ds-warn text-sm">{locale === "fr" ? "Sauvegarde locale impossible. Garde cet onglet ouvert et libère de l’espace avant de réessayer." : "Local save failed. Keep this tab open and free up storage before retrying."}</p> : null}
            {draftSource ? <button className="ds-text-btn" onClick={() => void importLocalDrafts(draftSource, owner).then(() => window.location.reload()).catch(() => setStorageError(true))}>{locale === "fr" ? "Récupérer explicitement les brouillons anonymes ou anciens dans ce compte" : "Import anonymous or older drafts into this account"}</button> : null}
            {billingError ? <button className="ds-text-btn" onClick={() => void refreshBilling()}>{locale === "fr" ? "Réessayer le statut" : "Retry status"}</button> : null}
            {activationTimedOut ? <button className="ds-text-btn" onClick={() => { setActivationTimedOut(false); setActivationAttempt((n) => n + 1); }}>{locale === "fr" ? "Revérifier l’activation" : "Check activation again"}</button> : null}
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
</div>
        <div className="tool-command-orientation">
          <Seg
          label={t(locale, "tool_label_orientation")}
          value={orientation}
          options={[
            { value: "portrait", label: t(locale, "tool_orient_portrait") },
            { value: "landscape", label: t(locale, "tool_orient_landscape") },
          ]}
          onChange={(value) => {
            patchActive({ orientation: value as Orientation });
            setQualityAcknowledged(false);
            setAppUsageConfirmed(false);
            setZipUrl(null);
          }}
        />
</div>
        <div className="tool-command-account">
          {session === "loading" ? <span className="ds-pill ds-pill-mute" role="status" data-testid="tool-quota-loading">{locale === "fr" ? "Chargement…" : "Loading…"}</span> : !signedIn ? <button type="button" className="ds-pill ds-pill-ink" data-testid="tool-quota" onClick={() => setShowAuth(true)}>{locale === "fr" ? "Invité" : "Guest"}</button> : <span className={`ds-pill ${pillMute ? "ds-pill-mute" : "ds-pill-ink"}`} data-testid="tool-quota">{remainingLabel}</span>}
        </div>
      </header>
      {urlStatus && toolPanel !== "review" ? <div className="tool-return-status"><StatusLine text={urlStatus} kind="info" testId="tool-status" /></div> : null}
      <div className="tool-workspace">
        <section className="studio-tool-main min-w-0" aria-label={locale === "fr" ? "Aperçu des captures" : "Screenshot preview"}>
          <div className="tool-canvas-heading" id="tool-inspect">
            <div><p className="tool-eyebrow">{locale === "fr" ? "Votre composition" : "Your composition"}</p><h1>{active?.name?.trim() || t(locale, "tool_label_app")}</h1></div>
            <span className="tool-canvas-count">{Math.max(outerFiles.length, effectiveInner.length) ? `${String(slideIndex + 1).padStart(2, "0")} / ${String(Math.max(outerFiles.length, effectiveInner.length)).padStart(2, "0")}` : (locale === "fr" ? "Aucune paire" : "No pairs")}</span>
          </div>
          <ToolCanvas mobileView={mobileView} locale={locale} slideIndex={slideIndex} onMobileView={setMobileView}>
        <div
          className={`preview-duo mt-5${orientation === "landscape" ? " is-landscape" : ""}${previewMode === "pixels" ? " is-pixels" : ""}`}
          style={previewMode === "pixels" ? connectPreviewStyle(outerSpec, innerSpec) as CSSProperties : undefined}
        >
          <PreviewCard
            testId="preview-outer"
            label={t(locale, "tool_preview_outer")}
            src={previews?.outer}
            inspect={outerInspect}
            kind="outer"
            spec={outerSpec}
            locale={locale}
            orientation={orientation}
            previewMode={previewMode}
            slide={slideIndex}
            transform={outerTransform}
            onTransform={(patch) => updateCropTransform("outer", slideIndex, patch)}
            onImportFiles={(files) => onSideFiles("outer", files)}
          />
          <PreviewCard
            testId="preview-inner"
            label={t(locale, "tool_preview_inner")}
            src={previews?.inner}
            inspect={innerInspect}
            kind="inner"
            spec={innerSpec}
            locale={locale}
            orientation={orientation}
            previewMode={previewMode}
            hinge={showHinge}
            slide={slideIndex}
            transform={innerTransform}
            onTransform={(patch) => updateCropTransform("inner", slideIndex, patch)}
            onImportFiles={(files) => onSideFiles("inner", files)}
          />
        </div>
          </ToolCanvas>
          <PairStrip outerFiles={outerFiles} innerFiles={effectiveInner} active={slideIndex} locale={locale} sameSet={sameSet} onSelect={setSlideIndex} onRemove={(side, index) => removeSideFile(side === "inner" && sameSet ? "outer" : side, index)} />
          {cloneAlert || unpaired || severeQualityCount > 0 || foldWarningCount > 0 ? <div className="tool-alert-summary" role="status"><span aria-hidden="true">◇</span><span>{locale === "fr" ? "Des points demandent votre attention dans Vérifier." : "Some items need your attention in Check."}</span><button type="button" onClick={() => setToolPanel("review")}>{locale === "fr" ? "Voir le bilan" : "View report"}</button></div> : null}
        </section>
        <aside id="tool-deliver" className="studio-tool-inspector min-w-0" aria-label={locale === "fr" ? "Commandes de l’atelier" : "Workspace controls"}>
          <ToolPanelTabs value={toolPanel} onChange={setToolPanel} locale={locale} />
          <div key={toolPanel} className="tool-panel-content" id={`tool-panel-${toolPanel}`} role="tabpanel" aria-labelledby={`tool-tab-${toolPanel}`}>
            {toolPanel === "captures" ? <>
              <div className="tool-panel-heading"><h2>{locale === "fr" ? "Vos captures" : "Your screenshots"}</h2><p>{locale === "fr" ? "Importez les vues de votre app. Jusqu’à 10 paires." : "Import your app screens. Up to 10 pairs."}</p></div>
              <div id="tool-import" className="tool-import-stack">
                <div className="mt-5 grid gap-4 md:grid-cols-2">
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
              </div>
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
                    setZipUrl(null);
                  }}
                >
                  {t(locale, "tool_same_set")}
                </DsToggle>
              </div>
            </div>
          </div>
        </div>
              <div className="tool-panel-fields">
                <div className="ds-field">
          <label className="ds-label" htmlFor="tool-input-app">
            {t(locale, "tool_label_app")}
          </label>
          <input
            id="tool-input-app"
            value={active?.name ?? ""}
            onChange={(event) => { patchActive({ name: event.target.value }); setZipUrl(null); }}
            className="ds-input w-full"
          />
        </div>
              </div>
              <a href="/api/example-zip?v=2" data-testid="tool-example" className="ds-text-btn mt-4">{t(locale, "tool_example")}</a>
            </> : null}
            {toolPanel === "adjust" ? <>
              <div className="tool-panel-heading"><h2>{locale === "fr" ? "Ajuster" : "Adjust"}</h2><p>{locale === "fr" ? "Cadrez la vue sélectionnée. Les changements apparaissent sur le canvas." : "Frame the selected view. Changes appear on the canvas."}</p></div>
              <div className="tool-adjust-side" role="group" aria-label={locale === "fr" ? "Vue à ajuster" : "View to adjust"}>
                <button type="button" className={adjustSide === "outer" ? "is-on" : ""} aria-pressed={adjustSide === "outer"} onClick={() => {setAdjustSide("outer"); setMobileView("outer");}}>{locale === "fr" ? "Fermé" : "Closed"}</button>
                <button type="button" className={adjustSide === "inner" ? "is-on" : ""} aria-pressed={adjustSide === "inner"} onClick={() => {setAdjustSide("inner"); setMobileView("inner");}}>{locale === "fr" ? "Ouvert" : "Open"}</button>
              </div>
              <CropControls testId={`preview-${adjustSide}`} locale={locale} previewMode={previewMode} inspect={adjustSide === "outer" ? outerInspect : innerInspect} spec={adjustSide === "outer" ? outerSpec : innerSpec} transform={adjustSide === "outer" ? outerTransform : innerTransform} onTransform={(patch) => updateCropTransform(adjustSide, slideIndex, patch)} />
              {innerSlide ? <div className={`tool-fold-check is-${currentFoldCheck?.status ?? "checking"}`} role="status" data-testid="tool-fold-check"><strong>{locale === "fr" ? "Texte au pli · vue ouverte" : "Fold text · open view"}</strong><span>{foldStatusText(locale, currentFoldCheck)}</span></div> : null}
              <div className="tool-view-settings">
                <div className="review-view-controls">
          <div className="review-view-switch" role="group" aria-label={locale === "fr" ? "Affichage de la composition" : "Composition view"}>
            <button
              type="button"
              className={previewMode === "device" ? "is-on" : ""}
              aria-pressed={previewMode === "device"}
              data-testid="tool-device-view"
              onClick={() => setPreviewMode("device")}
            >
              {t(locale, "review_device_view")}
            </button>
            <button
              type="button"
              className={previewMode === "pixels" ? "is-on" : ""}
              aria-pressed={previewMode === "pixels"}
              data-testid="tool-pixel-view"
              onClick={() => setPreviewMode("pixels")}
            >
              {t(locale, "review_pixel_view")}
            </button>
          </div>
        </div>
              </div>
        <details className="tool-advanced mt-5">
          <summary>{locale === "fr" ? "Réglages avancés" : "Advanced settings"}</summary>
          <div className="pt-2">
        <Seg
          label={t(locale, "tool_label_fit")}
          value={globalFit}
          options={[
            { value: "contain", label: t(locale, "tool_fit_contain") },
            { value: "cover", label: t(locale, "tool_fit_cover") },
            { value: "smart", label: t(locale, "tool_fit_smart") },
          ]}
          onChange={(value) => updateGlobalFit(value as FitMode)}
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
              patchActive({ include69: next });
              setZipUrl(null);
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
            </> : null}
            {toolPanel === "review" ? <>
              <div className="tool-panel-heading"><h2>{locale === "fr" ? "Vérifier" : "Check"}</h2><p>{locale === "fr" ? "Terminez ces étapes avant de préparer les fichiers." : "Complete these steps before preparing files."}</p></div>
              <div className="tool-review-actions">
                <p className="tool-eyebrow">{locale === "fr" ? "À faire" : "To do"}</p>
                <ul>
                  <li data-done={hasExportable && !unpaired}>{locale === "fr" ? "Compléter les vues fermé et ouvert" : "Complete the closed and open views"}</li>
                  <li data-done={severeQualityCount === 0 && !cloneAlert}>{locale === "fr" ? "Examiner les alertes de cadrage et de similarité" : "Review framing and similarity alerts"}</li>
                  <li data-done={appUsageConfirmed}>{locale === "fr" ? "Confirmer le contenu de l’app" : "Confirm the app content"}</li>
                </ul>
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
        <section className="ds-readiness mb-6" aria-label={locale === "fr" ? "Bilan de préparation" : "Readiness report"} data-testid="readiness-report">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl">{locale === "fr" ? "Bilan du set" : "Set report"}</h2>
            <strong className="font-mono text-xl" data-testid="readiness-score">{preparationScore}/100</strong>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">{locale === "fr" ? "Score des contrôles applicables validés. Ne prédit pas l’approbation Apple." : "Share of applicable checks passed. Does not predict Apple approval."}</p>
          <p className="ds-label mt-5">{locale === "fr" ? "Contrôles techniques" : "Technical checks"}</p>
          <ul className="mt-2 space-y-2 text-sm">
            {[
              [preparationChecks[0], locale === "fr" ? "Captures fermé et ouvert présentes" : "Closed and open screenshots present"],
              [preparationChecks[1], locale === "fr" ? "Paires complètes" : "Pairs complete"],
              [preparationChecks[5], locale === "fr" ? "Fichiers finaux vérifiés et enregistrés" : "Final files verified and stored"],
            ].map(([passed, label], index) => (
              <li key={index} className="flex gap-2"><span aria-hidden="true">{passed ? "✓" : "○"}</span><span className="sr-only">{passed ? (locale === "fr" ? "Validé : " : "Passed: ") : (locale === "fr" ? "En attente : " : "Pending: ")}</span>{label}</li>
            ))}
          </ul>
          <details className="tool-source-details">
            <summary>{locale === "fr" ? `Sources de la paire ${String(slideIndex + 1).padStart(2, "0")}` : `Pair ${String(slideIndex + 1).padStart(2, "0")} sources`}</summary>
            {([[
              locale === "fr" ? "Fermé" : "Closed", outerInspect, outerSpec,
            ], [
              locale === "fr" ? "Ouvert" : "Open", innerInspect, innerSpec,
            ]] as const).map(([name, inspect, spec]) => (
              <div key={name} className="tool-source-row">
                <strong>{name} · {spec.width} × {spec.height}</strong>
                <span>{inspect ? inspect.hasAlpha ? t(locale, "tool_check_alpha_flat") : t(locale, "tool_check_alpha_ok") : t(locale, "tool_check_await")}</span>
                <span>{inspect ? inspect.colorSpace === "other" ? t(locale, "tool_check_rgb_bad") : t(locale, "tool_check_rgb_ok") : t(locale, "tool_check_await")}</span>
                <span>{inspect ? t(locale, "tool_check_zip") : t(locale, "tool_check_zip_wait")}</span>
              </div>
            ))}
          </details>
          <p className="ds-label mt-5">{locale === "fr" ? "Alertes visuelles" : "Visual alerts"}</p>
          <ul className="mt-2 space-y-2 text-sm">
            <li className="flex gap-2"><span aria-hidden="true">{preparationChecks[2] ? "✓" : "◇"}</span><span className="sr-only">{preparationChecks[2] ? (locale === "fr" ? "Validé : " : "Passed: ") : (locale === "fr" ? "À examiner : " : "Review: ")}</span>{locale === "fr" ? "Similarité entre les vues" : "Similarity between views"}</li>
            <li className="flex gap-2"><span aria-hidden="true">{preparationChecks[3] ? "✓" : "◇"}</span><span className="sr-only">{preparationChecks[3] ? (locale === "fr" ? "Validé : " : "Passed: ") : (locale === "fr" ? "À examiner : " : "Review: ")}</span>{locale === "fr" ? "Cadrage de chaque capture" : "Framing of each screenshot"}</li>
            {qualityItems.filter((item) => item.severity !== "ok").map((item) => (
              <li key={`${item.side}-${item.index}`} className="pl-5 text-[var(--warn)]">
                {item.side === "outer" ? (locale === "fr" ? "Fermé" : "Closed") : (locale === "fr" ? "Ouvert" : "Open")} {String(item.index + 1).padStart(2, "0")} · {locale === "fr" ? "rognage" : "crop"} {item.cropPercent.toFixed(0)} % · {locale === "fr" ? "agrandissement" : "upscale"} {item.scale.toFixed(1)}×
              </li>
            ))}
            {effectiveInner.map((_, index) => <li key={`fold-${index}`} className={`pl-5 ${foldChecks[index]?.status === "warning" ? "text-[var(--warn)]" : "text-[var(--muted)]"}`} data-testid={`fold-check-${index}`}>
              {locale === "fr" ? "Ouvert" : "Open"} {String(index + 1).padStart(2, "0")} · {foldStatusText(locale, foldChecks[index])}
            </li>)}
            {clones.filter((item) => item.label !== "ok").map((item) => (
              <li key={`clone-${item.index}`} className="pl-5 text-[var(--warn)]">
                {locale === "fr" ? "Paire" : "Pair"} {String(item.index + 1).padStart(2, "0")} · {locale === "fr" ? "similarité à examiner" : "similarity needs review"}
              </li>
            ))}
          </ul>
          <p className="ds-label mt-5">{locale === "fr" ? "Confirmation humaine" : "Human confirmation"}</p>
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" checked={appUsageConfirmed} onChange={(event) => setAppUsageConfirmed(event.target.checked)} className="mt-1" data-testid="confirm-app-usage" />
            <span>{locale === "fr" ? "J’ai vérifié que chaque visuel montre ma vraie app en usage, dans le bon état d’écran, et que le contenu importé reste lisible près du pli." : "I checked that every image shows my real app in use, in the correct screen state, and that imported content remains readable near the fold."}</span>
          </label>
          {cloneAlert || severeQualityCount > 0 || foldWarningCount > 0 ? <p className="mt-3 text-sm text-[var(--warn)]">{locale === "fr" ? "Les alertes restent à examiner, même si vous confirmez la vérification visuelle." : "Warnings still need review, even after visual confirmation."}</p> : null}
        </section>
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
            <p className="mt-3 text-sm text-[var(--muted)]">{locale === "fr" ? "Décompresse le ZIP pour obtenir les deux séries d’images. Le fichier reste récupérable pendant 24 h, sans nouvel essai. Le clic demande le téléchargement ; vérifie ensuite le fichier dans ton navigateur. Le dépôt manuel dépend de l’ouverture des emplacements Duo dans App Store Connect." : "Unzip the archive to get both image sets. Retrieve it again within 24 hours without another trial. Clicking requests a download; check the file in your browser. Manual upload depends on Duo slots becoming available in App Store Connect."}</p>
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
            </> : null}
          </div>
        </aside>
      </div>
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
            mode={authMode}
            variant="modal"
            nextPath={upgradeRequested && preferredUpgradeKind ? `${prefix}/tool?upgrade=1&plan=${preferredUpgradeKind}` : `${prefix}/tool`}
            onSuccess={() => {
              setShowAuth(false);
              void refreshBilling();
            }}
          />
          <button type="button" className="ds-text-btn mt-4" onClick={() => setAuthMode((mode) => mode === "signup" ? "login" : "signup")}>
            {authMode === "signup" ? (locale === "fr" ? "Déjà un compte ? Se connecter" : "Already have an account? Sign in") : (locale === "fr" ? "Créer un compte" : "Create an account")}
          </button>
        </Overlay>
      ) : null}
      {paywall || (upgradeRequested && session === "in") ? (
        <PaywallModal
          available={billing?.checkoutAvailable === true}
          locale={locale}
          reason={paywall ?? "trial"}
          busy={checkoutBusy}
          preferredKind={upgradeRequested ? preferredUpgradeKind : undefined}
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

type ToolPanel = "captures" | "adjust" | "review";

function ToolPanelTabs({ value, onChange, locale }: {value: ToolPanel; onChange: (value: ToolPanel) => void; locale: Locale}) {
  const labels = locale === "fr" ? {captures: "Captures", adjust: "Ajuster", review: "Vérifier"} : {captures: "Screenshots", adjust: "Adjust", review: "Check"};
  return <div className="tool-panel-tabs" role="tablist" aria-label={locale === "fr" ? "Commandes" : "Controls"}>{(["captures", "adjust", "review"] as const).map((panel) => <button key={panel} type="button" role="tab" id={`tool-tab-${panel}`} data-testid={`tool-tab-${panel}`} aria-controls={value === panel ? `tool-panel-${panel}` : undefined} aria-selected={value === panel} tabIndex={value === panel ? 0 : -1} className={value === panel ? "is-on" : ""} onClick={() => onChange(panel)} onKeyDown={(event) => { const dir = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0; if (!dir) return; event.preventDefault(); const panels = ["captures", "adjust", "review"] as const; const next = panels[(panels.indexOf(panel) + dir + panels.length) % panels.length]; onChange(next); requestAnimationFrame(() => document.getElementById(`tool-tab-${next}`)?.focus()); }}>{labels[panel]}</button>)}</div>;
}

function ToolCanvas({mobileView, onMobileView, slideIndex, locale, children}: {mobileView: "outer" | "inner" | "compare"; onMobileView: (value: "outer" | "inner" | "compare") => void; slideIndex: number; locale: Locale; children: ReactNode}) {
  const labels = locale === "fr" ? {outer: "Fermé", inner: "Ouvert", compare: "Comparer"} : {outer: "Closed", inner: "Open", compare: "Compare"};
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
    <div className="tool-mobile-view" role="group" aria-label={locale === "fr" ? "Vue du canvas" : "Canvas view"}>{(["outer", "inner", "compare"] as const).map((view) => <button key={view} type="button" aria-pressed={mobileView === view} className={mobileView === view ? "is-on" : ""} onClick={() => onMobileView(view)}>{labels[view]}</button>)}</div>
    {children}
  </div>;
}

function PairStrip({outerFiles, innerFiles, active, locale, sameSet, onSelect, onRemove}: {outerFiles: File[]; innerFiles: File[]; active: number; locale: Locale; sameSet: boolean; onSelect: (index: number) => void; onRemove: (side: "outer" | "inner", index: number) => void}) {
  const count = Math.max(outerFiles.length, innerFiles.length);
  if (!count) return <p className="tool-pair-empty">{locale === "fr" ? "Importez votre première paire depuis Captures." : "Import your first pair in Screenshots."}</p>;
  return <div className="tool-pair-strip" aria-label={locale === "fr" ? "Paires de captures" : "Screenshot pairs"}><div className="tool-pair-strip-head"><span>{locale === "fr" ? "Paires" : "Pairs"}</span><span>{count} / {MAX_IMAGES}</span></div><div className="tool-pair-list">{Array.from({length: count}, (_, index) => { const outer = outerFiles[index]; const inner = innerFiles[index]; return <div className={`tool-pair-item ${index === active ? "is-active" : ""}`} key={index}><button type="button" className="tool-pair-select" aria-current={index === active ? "true" : undefined} aria-label={`${locale === "fr" ? "Paire" : "Pair"} ${index + 1}: ${outer ? (locale === "fr" ? "fermé présent" : "closed present") : (locale === "fr" ? "fermé manquant" : "closed missing")}, ${inner ? (locale === "fr" ? "ouvert présent" : "open present") : (locale === "fr" ? "ouvert manquant" : "open missing")}`} onClick={() => onSelect(index)}><strong>{String(index + 1).padStart(2, "0")}</strong><span className="tool-pair-marks"><i data-present={Boolean(outer)} /><i data-present={Boolean(inner)} /></span></button><div className="tool-pair-remove">{outer ? <button type="button" aria-label={`${locale === "fr" ? "Retirer la vue fermé de la paire" : "Remove closed view from pair"} ${index + 1}`} onClick={() => onRemove("outer", index)}>× <span>{locale === "fr" ? "Fermé" : "Closed"}</span></button> : null}{inner && !sameSet ? <button type="button" aria-label={`${locale === "fr" ? "Retirer la vue ouvert de la paire" : "Remove open view from pair"} ${index + 1}`} onClick={() => onRemove("inner", index)}>× <span>{locale === "fr" ? "Ouvert" : "Open"}</span></button> : null}</div></div>; })}</div></div>;
}

function foldStatusText(locale: Locale, check?: FoldCheck): string {
  if (!check || check.status === "checking") return locale === "fr" ? "Analyse en cours…" : "Checking…";
  if (check.status === "error") return locale === "fr" ? "Analyse indisponible : vérifiez visuellement le pli." : "Check unavailable: inspect the fold visually.";
  if (check.status === "warning") return locale === "fr" ? "Texte possiblement sous le pli : vérifiez la lisibilité." : "Possible text beneath the fold: check legibility.";
  return locale === "fr" ? "Aucun chevauchement détecté ; vérifiez le rendu final." : "No overlap detected; review the final image.";
}

function CropControls({testId, locale, previewMode, inspect, spec, transform, onTransform}: {testId: string; locale: Locale; previewMode: "device" | "pixels"; inspect: SourceInspect | null; spec: SizeSpec; transform: CropTransform; onTransform: (patch: Partial<CropTransform>) => void}) {
  if (!inspect) return <p className="tool-adjust-empty">{locale === "fr" ? "Importez cette vue pour régler son cadrage." : "Import this view to adjust its framing."}</p>;
  const metrics = compositionMetrics(inspect.width, inspect.height, spec.width, spec.height, transform);
  const cropHint = metrics.fit === "cover" ? t(locale, previewMode === "pixels" ? "tool_crop_drag_hint" : "tool_crop_device_hint") : t(locale, "tool_crop_contain_hint");
  const onRangeKey = (event: ReactKeyboardEvent<HTMLInputElement>, axis: "x" | "y") => {
    const delta = event.key === "ArrowRight" || event.key === "ArrowUp" ? 0.01 : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -0.01 : null;
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : delta == null ? null : Math.max(0, Math.min(1, Math.round((transform[axis] + delta) * 100) / 100));
    if (next == null) return;
    event.preventDefault();
    onTransform({[axis]: next});
  };
  const canMoveX = metrics.overflowX >= 1;
  const canMoveY = metrics.overflowY >= 1;
  return <div className="crop-controls tool-crop-controls" data-testid={`${testId}-crop-controls`}>
    <div className="crop-toolbar">
      <div className="crop-fit" role="group" aria-label={t(locale, "tool_crop_mode")}>
        <button type="button" className={metrics.fit === "cover" ? "is-on" : ""} aria-pressed={metrics.fit === "cover"} onClick={() => onTransform({fit: "cover"})}>{t(locale, "tool_crop_fill")}</button>
        <button type="button" className={metrics.fit === "contain" ? "is-on" : ""} aria-pressed={metrics.fit === "contain"} onClick={() => onTransform({fit: "contain"})}>{t(locale, "tool_crop_show_all")}</button>
      </div>
      {transform.fit === "smart" ? <p className="crop-hint" data-testid={`${testId}-smart-result`}>{locale === "fr" ? `Smart a choisi « ${metrics.fit === "cover" ? "Remplir" : "Tout afficher"} » pour cette capture.` : `Smart chose “${metrics.fit === "cover" ? "Fill" : "Show all"}” for this capture.`}</p> : null}
      <button type="button" className="crop-reset" onClick={() => onTransform({x: 0.5, y: 0.5, zoom: 1})}>{t(locale, "tool_crop_reset")}</button>
    </div>
    {metrics.fit === "cover" ? <div className="crop-axis-controls">
      <label><span>{locale === "fr" ? "Zoom" : "Zoom"} · {Math.round((transform.zoom ?? 1) * 100)} %</span><input type="range" min="100" max="200" value={Math.round((transform.zoom ?? 1) * 100)} onChange={(event) => onTransform({zoom: Number(event.currentTarget.value) / 100})} /></label>
      <label><span>{t(locale, "tool_crop_horizontal")}</span><input type="range" min="0" max="100" disabled={!canMoveX} value={Math.round(transform.x * 100)} onChange={(event) => onTransform({x: Number(event.currentTarget.value) / 100})} onKeyDown={(event) => onRangeKey(event, "x")} /></label>
      <label><span>{t(locale, "tool_crop_vertical")}</span><input type="range" min="0" max="100" disabled={!canMoveY} value={Math.round(transform.y * 100)} onChange={(event) => onTransform({y: Number(event.currentTarget.value) / 100})} onKeyDown={(event) => onRangeKey(event, "y")} /></label>
      {!canMoveY ? <p className="crop-hint">{locale === "fr" ? "Aucune marge verticale à cette échelle. Augmentez le zoom pour déplacer l’image vers le haut ou le bas." : "No vertical room at this scale. Increase zoom to move the image up or down."}</p> : null}
    </div> : null}
    <div className="crop-readout"><p className={`crop-metrics is-${metrics.severity}`} data-testid={`${testId}-metrics`}>{tf(locale, "tool_crop_metrics", {crop: metrics.cropPercent.toFixed(1), scale: metrics.scale.toFixed(2)})}</p><p className="crop-hint">{cropHint}</p></div>
  </div>;
}

function PreviewCard({
  testId,
  label,
  src,
  inspect,
  kind,
  spec,
  locale,
  orientation,
  previewMode,
  hinge = false,
  slide,
  transform,
  onTransform,
  onImportFiles,
}: {
  testId: string;
  label: string;
  src?: string;
  inspect: SourceInspect | null;
  kind: "outer" | "inner";
  spec: { width: number; height: number };
  locale: Locale;
  orientation: Orientation;
  previewMode: "device" | "pixels";
  hinge?: boolean;
  slide: number;
  transform: CropTransform;
  onTransform: (patch: Partial<CropTransform>) => void;
  onImportFiles: (files: FileList | null) => void;
}) {
  const dragRef = useRef<{ pointerId: number; x: number; y: number; focusX: number; focusY: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const effectiveFit = inspect ? compositionMetrics(inspect.width, inspect.height, spec.width, spec.height, transform).fit : transform.fit;
  const canvasAspect = previewMode === "pixels"
    ? `${spec.width}/${spec.height}`
    : duoChassisAspect(kind, orientation);
  return (
    <figure data-testid={testId} data-slide={slide}>
      <figcaption className="duo-caption text-left">{label}</figcaption>
      <div className="preview-stage">
        <div
          className={`preview-glass t-resize ${kind === "outer" ? "preview-outer" : "preview-inner"} ${src ? "t-skel is-revealed" : "preview-empty"} ${kind === "inner" && hinge && src ? "is-hinge" : "hinge-off"} ${src && previewMode === "pixels" && effectiveFit === "cover" ? "is-draggable" : ""}`}
          data-testid={`${testId}-canvas`}
          data-aspect={canvasAspect}
          onPointerDown={(event) => {
            if (!src || previewMode !== "pixels" || effectiveFit !== "cover") return;
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
            if (!inspect) return;
            const metrics = compositionMetrics(inspect.width, inspect.height, spec.width, spec.height, transform);
            onTransform({
              x: metrics.overflowX >= 1 ? drag.focusX - (event.clientX - drag.x) * spec.width / Math.max(rect.width * metrics.overflowX, 1) : drag.focusX,
              y: metrics.overflowY >= 1 ? drag.focusY - (event.clientY - drag.y) * spec.height / Math.max(rect.height * metrics.overflowY, 1) : drag.focusY,
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
            <div className="preview-empty-copy">
              <span>{label} · {spec.width} × {spec.height}</span>
              <button type="button" className="tool-empty-action" onClick={() => inputRef.current?.click()}>{locale === "fr" ? "Importer" : "Import"}</button>
              <input ref={inputRef} type="file" accept="image/png,image/jpeg" multiple className="sr-only" aria-label={`${locale === "fr" ? "Importer" : "Import"} ${label}`} onChange={(event) => { onImportFiles(event.target.files); event.target.value = ""; }} />
            </div>
          )}
          {kind === "inner" ? <span className="division" aria-hidden="true" /> : null}
        </div>
      </div>
    </figure>
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
      role={kind === "err" ? "alert" : "status"}
      aria-live={kind === "err" ? "assertive" : "polite"}
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
