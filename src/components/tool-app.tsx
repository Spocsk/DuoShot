"use client";

import { MAX_SOURCE_BYTES, MAX_SOURCE_PIXELS } from "@/lib/pipeline/limits";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_RENDER_OPTIONS,
  MAX_IMAGES,
  WARN_MIN_IMAGES,
  normalizeCropTransform,
  connectPreviewStyle,
  duoSpec,
  zipFolderName,
  type CropTransform,
  type DeviceSlot,
  type FitMode,
  type Locale,
  type Orientation,
  type OutputFormat,
  type RenderOptions,
} from "@/lib/specs";
import { t, tf } from "@/lib/i18n";
import { checkSourceCount } from "@/lib/pipeline/validate";
import { inspectFile } from "@/lib/pipeline/source-inspect";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { compositionMetrics } from "@/lib/pipeline/geometry";
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
import { localePrefix } from "@/lib/site";
import { mergeSideFiles } from "@/lib/merge-side-files";
import { foldStatusText, useFoldChecks } from "@/components/tool/fold-check";
import { quotaLabel, useBilling } from "@/components/tool/use-billing";
import { useSetsMenu } from "@/components/tool/set-picker";
import { useAppSync } from "@/components/tool/use-app-sync";
import { usePreviews } from "@/components/tool/use-previews";
import { useSourceChecks } from "@/components/tool/use-source-checks";
import { useRenderJobs } from "@/components/tool/use-render-jobs";
import { isAllowedImage, takeFiles } from "@/components/tool/files";
import { CloneTip, DsToggle, Seg, StatusLine, SwapLabel } from "@/components/tool/controls";
import { DropZone } from "@/components/tool/drop-zone";
import { PairStrip, ToolCanvas, ToolPanelTabs } from "@/components/tool/canvas";
import { CropControls, PreviewCard } from "@/components/tool/preview-card";

type Props = { locale: Locale };

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
  const [draftsLoaded, setDraftsLoaded] = useState(false);
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
  const [slideIndex, setSlideIndex] = useState(0);
  const [toolPanel, setToolPanel] = useState<"captures" | "adjust" | "review">("captures");
  const [mobileView, setMobileView] = useState<"outer" | "inner" | "compare">("outer");
  const [adjustSide, setAdjustSide] = useState<"outer" | "inner">("outer");
  const completedSetsRef = useRef<Set<string>>(new Set());
  const [sameSetOpen, setSameSetOpen] = useState(false);
  const [qualityAcknowledged, setQualityAcknowledged] = useState(false);
  const [appUsageConfirmed, setAppUsageConfirmed] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [paywall, setPaywall] = useState<"trial" | "69" | null>(null);
  const [upgradeDismissed, setUpgradeDismissed] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const upgradeRequested = searchParams.get("upgrade") === "1" && !upgradeDismissed;
  const requestedPlan = searchParams.get("plan") ?? undefined;
  const preferredUpgradeKind = isCheckoutKind(requestedPlan) ? requestedPlan : undefined;
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
  const foldChecks = useFoldChecks({ activeId, effectiveInner, innerSpec, innerTransforms, globalFit, solidColor: options.solidColor, orientation });
  const foldWarningCount = Object.values(foldChecks).filter((check) => check.status === "warning").length;
  const currentFoldCheck = foldChecks[slideIndex];

  const warning = useMemo(() => {
    const count = Math.max(outerFiles.length, effectiveInner.length);
    if (count === 0) return null;
    try {
      return checkSourceCount(count).warning ?? null;
    } catch (error) {
      return error instanceof Error ? error.message : "error";
    }
  }, [outerFiles.length, effectiveInner.length]);

  const { billing, setBilling, billingError, session, activationTimedOut, retryActivation, refreshBilling, urlStatus } = useBilling(locale, searchParams);
  const signedIn = session === "in";

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
          setDraftsLoaded(true);
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
      setDraftsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadActiveId, loadSetFiles, loadSetMetas, saveActiveId, saveSetMetas]);

  const { setsRef, setsOpen, setSetsOpen, setsClosing, setSetsClosing, closeSets, onSetsTriggerKey, onSetsMenuKey } = useSetsMenu();
  const syncApp = useAppSync(saveSetMetas, setSets);

  const patchActive = useCallback(
    (patch: Partial<SetMeta>) => {
      if (!active) return;
      const next = sets.map((item) => (item.id === active.id ? { ...item, ...patch } : item));
      setSets(next);
      saveSetMetas(next);
      const touchesApp = "name" in patch || "clientName" in patch || "orientation" in patch;
      if (session === "in" && touchesApp) {
        const current = next.find((item) => item.id === active.id);
        if (current) syncApp(current);
      }
    },
    [active, sets, session, saveSetMetas, syncApp],
  );

  useEffect(() => {
    const max = Math.max(outerFiles.length, effectiveInner.length, 1) - 1;
    queueMicrotask(() => setSlideIndex((index) => Math.min(index, max)));
  }, [outerFiles.length, effectiveInner.length]);

  const previews = usePreviews(outerSlide, innerSlide, renderOptions, outerTransform, innerTransform);
  const { outerInspects, innerInspects, clones } = useSourceChecks(outerFiles, innerFiles, effectiveInner, cloneForced);

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

  function flashStatus(message: string, kind: "ok" | "err" | "busy" | "info") {
    setStatus(message);
    setStatusKind(kind);
  }

  const {
    zipName, exportImages, busyExport, busyReview, downloadId,
    reviewUrl, reviewStatus, reviewSetStatus, reviewUpgrade,
    onExport, onDownload, onReview,
  } = useRenderJobs({
    locale, owner, draftsLoaded, active, billing, setBilling, refreshBilling,
    setStatus, setStatusKind, flashStatus, setToolPanel, setShowAuth, setPaywall,
    zipUrl, setZipUrl, patchActive, outerFiles, innerFiles, effectiveInner, sameSet,
    cloneForced, include69, assumeClone, severeQualityCount, qualityAcknowledged,
    orientation, globalFit, renderOptions, outerTransforms, innerTransforms,
  });
  const preparationChecks = [
    hasExportable,
    hasExportable && !unpaired,
    hasExportable && !cloneAlert,
    hasExportable && severeQualityCount === 0,
    appUsageConfirmed,
    Boolean(zipUrl && exportImages.length),
  ];
  const preparationScore = Math.round(preparationChecks.filter(Boolean).length / preparationChecks.length * 100);
  // Mirrors the Check panel's "To do" list so the export action says what is still open.
  const missingSteps = [
    unpaired ? (locale === "fr" ? "compléter les vues fermé et ouvert" : "complete the closed and open views") : null,
    severeQualityCount > 0 || cloneAlert ? (locale === "fr" ? "examiner les alertes de cadrage et de similarité" : "review framing and similarity alerts") : null,
    !appUsageConfirmed ? (locale === "fr" ? "confirmer le contenu de l’app" : "confirm the app content") : null,
  ].filter((step): step is string => step !== null);

  async function onSideFiles(side: "outer" | "inner", list: FileList | File[] | DataTransfer | null) {
    const selected = takeFiles(list);
    const checked = await Promise.all(selected.slice(0, MAX_IMAGES).map(async (file) => {
      if (!isAllowedImage(file) || file.size > MAX_SOURCE_BYTES) return null;
      try { const metadata = await inspectFile(file); if (metadata.width * metadata.height > MAX_SOURCE_PIXELS) return null; const bitmap = await createImageBitmap(file); const allowed = bitmap.width * bitmap.height <= MAX_SOURCE_PIXELS; bitmap.close(); return allowed ? file : null; } catch { return null; }
    }));
    const incoming = checked.filter((file): file is File => file !== null);
    if (incoming.length < selected.length) flashStatus(locale === "fr" ? "Certains fichiers ont été ignorés : PNG ou JPEG lisibles, 50 Mo et 40 mégapixels maximum, 10 captures par côté." : "Some files were skipped: readable PNG or JPEG, up to 50 MB and 40 megapixels, 10 screenshots per side.", "err");
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
  const remainingLabel = quotaLabel(locale, billing, billingError, session);
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
                aria-describedby="tool-sets-description"
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
          <div className="tool-command-notes">
            <p id="tool-sets-description" className="text-xs text-[var(--muted)]">{locale === "fr" ? "Brouillons sur cet appareil · sans synchronisation" : "Drafts on this device · no synchronization"}</p>
            {storageError ? <p role="alert" className="ds-warn text-sm">{locale === "fr" ? "Sauvegarde locale impossible. Gardez cet onglet ouvert et libérez de l’espace avant de réessayer." : "Local save failed. Keep this tab open and free up storage before retrying."}</p> : null}
            {draftSource ? <button className="ds-text-btn" onClick={() => void importLocalDrafts(draftSource, owner).then(() => window.location.reload()).catch(() => setStorageError(true))}>{locale === "fr" ? "Récupérer explicitement les brouillons anonymes ou anciens dans ce compte" : "Import anonymous or older drafts into this account"}</button> : null}
            {billingError ? <button className="ds-text-btn" onClick={() => void refreshBilling()}>{locale === "fr" ? "Réessayer le statut" : "Retry status"}</button> : null}
            {activationTimedOut ? <button className="ds-text-btn" onClick={() => retryActivation()}>{locale === "fr" ? "Revérifier l’activation" : "Check activation again"}</button> : null}
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
          closeLabel={locale === "fr" ? "Fermer" : "Close"}
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
