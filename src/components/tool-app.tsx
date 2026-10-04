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
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_RENDER_OPTIONS,
  MAX_IMAGES,
  normalizeCropTransform,
  connectPreviewStyle,
  duoSpec,
  type CropTransform,
  type FitMode,
  type Locale,
  type Orientation,
  type RenderOptions,
} from "@/lib/specs";
import { t } from "@/lib/i18n";
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
import { useFoldChecks } from "@/components/tool/fold-check";
import { quotaLabel, useBilling } from "@/components/tool/use-billing";
import { SetPicker, useSetsMenu } from "@/components/tool/set-picker";
import { CapturesPanel } from "@/components/tool/captures-panel";
import { AdjustPanel, AdvancedSettings } from "@/components/tool/adjust-panel";
import { ReadinessReport, ReviewAlerts } from "@/components/tool/check-panel";
import { DeliveryActions } from "@/components/tool/delivery-actions";
import { useAppSync } from "@/components/tool/use-app-sync";
import { usePreviews } from "@/components/tool/use-previews";
import { useSourceChecks } from "@/components/tool/use-source-checks";
import { useRenderJobs } from "@/components/tool/use-render-jobs";
import { isAllowedImage, takeFiles } from "@/components/tool/files";
import { Seg, StatusLine } from "@/components/tool/controls";
import { PairStrip, ToolCanvas, ToolPanelTabs } from "@/components/tool/canvas";
import { PreviewCard } from "@/components/tool/preview-card";

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

  const setsMenu = useSetsMenu();
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

  const jobs = useRenderJobs({
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
    Boolean(zipUrl && jobs.exportImages.length),
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
    setsMenu.closeSets();
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

  return (
    <div className="studio-tool-shell mx-auto max-w-[92rem] px-5 pb-24 pt-5" data-tool-panel={toolPanel}>
      <header className="tool-command-bar" id="tool-create">
        <div className="tool-command-brand"><span className="tool-command-dot" aria-hidden="true" /><span>{locale === "fr" ? "Atelier" : "Workspace"}</span></div>
        <div className="tool-command-set">
          <SetPicker locale={locale} hydrated={hydrated} sets={sets} active={active} menu={setsMenu} switchSet={switchSet} addSet={addSet} removeSet={removeSet} />
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
            {toolPanel === "captures" ? <CapturesPanel
              locale={locale} active={active} outerSpec={outerSpec} innerSpec={innerSpec} outerFiles={outerFiles} innerFiles={innerFiles}
              effectiveInner={effectiveInner} sameSet={sameSet} cloneForced={cloneForced} unpaired={unpaired} warning={warning}
              sameSetOpen={sameSetOpen} setSameSetOpen={setSameSetOpen} onSideFiles={onSideFiles} patchActive={patchActive} setZipUrl={setZipUrl}
            /> : null}
            {toolPanel === "adjust" ? <>
              <AdjustPanel
                locale={locale} adjustSide={adjustSide} setAdjustSide={setAdjustSide} setMobileView={setMobileView} previewMode={previewMode}
                setPreviewMode={setPreviewMode} outerInspect={outerInspect} innerInspect={innerInspect} outerSpec={outerSpec} innerSpec={innerSpec}
                outerTransform={outerTransform} innerTransform={innerTransform} updateCropTransform={updateCropTransform} slideIndex={slideIndex}
                innerSlide={innerSlide} currentFoldCheck={currentFoldCheck}
              />
              <AdvancedSettings
                locale={locale} globalFit={globalFit} updateGlobalFit={updateGlobalFit} options={options} updateOptions={updateOptions}
                showHinge={showHinge} setShowHinge={setShowHinge} include69={include69} patchActive={patchActive} setZipUrl={setZipUrl}
                billing={billing} setPaywall={setPaywall} cloneLabel={cloneLabel} assumeClone={assumeClone} setAssumeClone={setAssumeClone}
              />
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
              <ReviewAlerts locale={locale} severeQualityCount={severeQualityCount} qualityAcknowledged={qualityAcknowledged} setQualityAcknowledged={setQualityAcknowledged} clones={clones} slideIndex={slideIndex} setSlideIndex={setSlideIndex} />
              <ReadinessReport
                locale={locale} preparationScore={preparationScore} preparationChecks={preparationChecks} slideIndex={slideIndex}
                outerInspect={outerInspect} innerInspect={innerInspect} outerSpec={outerSpec} innerSpec={innerSpec} qualityItems={qualityItems}
                effectiveInner={effectiveInner} foldChecks={foldChecks} clones={clones} appUsageConfirmed={appUsageConfirmed}
                setAppUsageConfirmed={setAppUsageConfirmed} cloneAlert={cloneAlert} severeQualityCount={severeQualityCount} foldWarningCount={foldWarningCount}
              />
              <DeliveryActions
                locale={locale} prefix={prefix} active={active} patchActive={patchActive} zipUrl={zipUrl} setZipUrl={setZipUrl}
                hasExportable={hasExportable} missingSteps={missingSteps} session={session} setShowAuth={setShowAuth} status={status}
                statusKind={statusKind} urlStatus={urlStatus} orientation={orientation} billing={billing} checkoutBusy={checkoutBusy}
                onCheckout={onCheckout} jobs={jobs}
              />
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
