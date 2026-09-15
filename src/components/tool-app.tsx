"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_RENDER_OPTIONS,
  MAX_IMAGES,
  SIZE_SPECS,
  WARN_MIN_IMAGES,
  type FitMode,
  type Locale,
  type Orientation,
  type OutputFormat,
  type RenderOptions,
} from "@/lib/specs";
import { t, tf } from "@/lib/i18n";
import { checkSourceCount } from "@/lib/pipeline/validate";
import { hashFromFile } from "@/lib/pipeline/clone-hash-browser";
import { inspectFile, type SourceInspect } from "@/lib/pipeline/source-inspect";
import { scorePair, type CloneResult } from "@/lib/pipeline/clone-score";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { containRect, coverRect } from "@/lib/pipeline/geometry";
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
import { localePrefix } from "@/lib/site";

type Props = { locale: Locale };

type BillingStatus = {
  plan?: string;
  remainingFreeExports?: number | null;
  canUse69?: boolean;
};

const BOOT_SET: SetMeta = {
  id: "boot",
  name: "MyApp",
  clientName: "",
  orientation: "portrait",
  sameSet: false,
};

const outerPreview = SIZE_SPECS.find((spec) => spec.id === "outer-p")!;
const innerPreview = SIZE_SPECS.find((spec) => spec.id === "inner-p")!;

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
  const [hydrated, setHydrated] = useState(false);
  const active = sets.find((item) => item.id === activeId) ?? sets[0];
  const [outerFiles, setOuterFiles] = useState<File[]>([]);
  const [innerFiles, setInnerFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<RenderOptions>(DEFAULT_RENDER_OPTIONS);
  const [include69, setInclude69] = useState(false);
  const [showHinge, setShowHinge] = useState(true);
  const [assumeClone, setAssumeClone] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState<{ outer: string; inner: string } | null>(null);
  const [outerInspect, setOuterInspect] = useState<SourceInspect | null>(null);
  const [innerInspect, setInnerInspect] = useState<SourceInspect | null>(null);
  const [clones, setClones] = useState<CloneResult[]>([]);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [session, setSession] = useState<"out" | "in">("out");
  const [showAuth, setShowAuth] = useState(false);
  const [paywall, setPaywall] = useState<"trial" | "69" | null>(null);
  const [upgradeDismissed, setUpgradeDismissed] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [reviewUpgrade, setReviewUpgrade] = useState(false);
  const setsRef = useRef<HTMLDetailsElement>(null);
  const [setsOpen, setSetsOpen] = useState(false);
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
  const effectiveInner = sameSet || innerFiles.length === 0 ? outerFiles : innerFiles;
  const unpaired = !sameSet && outerFiles.length > 0 && innerFiles.length > 0 && outerFiles.length !== innerFiles.length;
  const cloneForced = sameSet || (outerFiles.length > 0 && innerFiles.length === 0);

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
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void refreshBilling();
    });
    return () => listener.subscription.unsubscribe();
  }, [refreshBilling]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const existing = loadSetMetas();
    if (existing.length === 0) {
      const first = defaultSet();
      try {
        saveSetMetas([first]);
        saveActiveId(first.id);
      } catch {
        /* private mode */
      }
      setSets([first]);
      setActiveId(first.id);
      return;
    }
    const current = loadActiveId() ?? existing[0]!.id;
    setSets(existing);
    setActiveId(current);
    let cancelled = false;
    void (async () => {
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

  const drawPreviews = useCallback(
    async (outer: File | undefined, inner: File | undefined, next: RenderOptions) => {
      const outerFile = outer ?? inner;
      const innerFile = inner ?? outer;
      if (!outerFile || !innerFile) return;
      const [outerBit, innerBit] = await Promise.all([createImageBitmap(outerFile), createImageBitmap(innerFile)]);
      const outerSpec = next.orientation === "portrait" ? outerPreview : SIZE_SPECS.find((s) => s.id === "outer-l")!;
      const innerSpec = next.orientation === "portrait" ? innerPreview : SIZE_SPECS.find((s) => s.id === "inner-l")!;
      setPreviews({
        outer: drawTarget(outerBit, next, outerSpec),
        inner: drawTarget(innerBit, next, innerSpec),
      });
      outerBit.close();
      innerBit.close();
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!outerFiles[0] && !effectiveInner[0]) {
        setPreviews(null);
        return;
      }
      void drawPreviews(outerFiles[0], effectiveInner[0], options);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [drawPreviews, outerFiles, effectiveInner, options]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const o = outerFiles[0] ? await inspectFile(outerFiles[0]) : null;
      const i = effectiveInner[0] ? await inspectFile(effectiveInner[0]) : null;
      if (!cancelled) {
        setOuterInspect(o);
        setInnerInspect(i);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [outerFiles, effectiveInner]);

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

  function isAllowedImage(file: File) {
    return /image\/(png|jpeg)/.test(file.type) || /\.(png|jpe?g)$/i.test(file.name);
  }

  function onSideFiles(side: "outer" | "inner", list: FileList | File[] | DataTransfer | null) {
    const incoming = takeFiles(list).filter(isAllowedImage).slice(0, MAX_IMAGES);
    if (side === "outer") setOuterFiles(incoming);
    else setInnerFiles(incoming);
    setZipUrl(null);
    if (active) void saveSetFiles(active.id, side, incoming).catch(() => {});
  }

  function updateOptions(patch: Partial<RenderOptions>) {
    setOptions({ ...options, ...patch });
  }

  function explainError(code: string) {
    if (code === "AUTH_REQUIRED") return t(locale, "error_auth");
    if (code === "TRIAL_EXHAUSTED") return t(locale, "error_trial");
    if (code === "DAILY_LIMIT") return t(locale, "error_daily");
    if (code === "IPHONE_69_GATED") return t(locale, "error_69");
    if (code === "CLONE_RISK") return t(locale, "error_clone");
    if (code === "STUDIO_REQUIRED") return t(locale, "error_studio");
    if (code === "NO_WORKSPACE") return t(locale, "error_workspace");
    if (code === "UPLOAD_FAILED" || code === "UPLOAD_MISSING") return t(locale, "error_upload");
    return t(locale, "error_export");
  }

  async function uploadSide(userId: string, files: File[]) {
    const supabase = createBrowserSupabase();
    const paths: string[] = [];
    for (const file of files) {
      const ext = file.type === "image/png" ? "png" : "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("uploads").upload(path, file, {
        contentType: file.type,
        upsert: true,
      });
      if (error) throw new Error("UPLOAD_FAILED");
      paths.push(path);
    }
    return paths;
  }

  async function onExport() {
    setBusy(true);
    setStatus(null);
    setZipUrl(null);
    try {
      const supabase = createBrowserSupabase();
      const { data: sessionData } = await supabase.auth.getUser();
      if (!sessionData.user) {
        setShowAuth(true);
        setStatus(t(locale, "error_auth"));
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
      const outerPaths = await uploadSide(sessionData.user.id, outerFiles);
      const innerPaths = sameSet ? outerPaths : await uploadSide(sessionData.user.id, innerFiles.length ? innerFiles : outerFiles);
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
          options: { ...options, orientation: active?.orientation ?? options.orientation, burnHinge: options.burnHinge },
        }),
      });
      const payload = (await response.json()) as { url?: string; error?: string; warning?: string };
      if (payload.error === "TRIAL_EXHAUSTED") {
        setPaywall("trial");
        setStatus(t(locale, "error_trial"));
        return;
      }
      if (payload.error === "IPHONE_69_GATED") {
        setPaywall("69");
        setStatus(t(locale, "error_69"));
        return;
      }
      if (payload.error === "CLONE_RISK") {
        setStatus(t(locale, "error_clone"));
        return;
      }
      if (!response.ok) {
        setStatus(explainError(payload.error || "EXPORT_FAILED"));
        return;
      }
      if (payload.url) {
        setZipUrl(payload.url);
        startZipDownload(payload.url);
        setStatus(
          payload.warning === "TOO_FEW"
            ? t(locale, "tool_warn")
            : payload.warning === "UNPAIRED"
              ? t(locale, "tool_warn_unpaired")
              : t(locale, "tool_zip_ready"),
        );
        void refreshBilling();
      }
    } catch (error) {
      setStatus(error instanceof Error ? explainError(error.message) : t(locale, "error_export"));
    } finally {
      setBusy(false);
    }
  }

  async function onReview() {
    setBusy(true);
    setReviewUpgrade(false);
    try {
      const supabase = createBrowserSupabase();
      const { data: sessionData } = await supabase.auth.getUser();
      if (!sessionData.user) {
        setShowAuth(true);
        setStatus(t(locale, "error_auth"));
        return;
      }
      const outerPaths = await uploadSide(sessionData.user.id, outerFiles);
      const innerPaths = sameSet ? outerPaths : await uploadSide(sessionData.user.id, innerFiles.length ? innerFiles : outerFiles);
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outerPaths,
          innerPaths,
          sameSet: cloneForced,
          appName: active?.name || "App",
          clientName: active?.clientName || "",
          orientation: active?.orientation ?? options.orientation,
        }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok) {
        if (payload.error === "STUDIO_REQUIRED") setReviewUpgrade(true);
        setStatus(explainError(payload.error || "STUDIO_REQUIRED"));
        return;
      }
      if (payload.url) {
        const absolute = `${window.location.origin}${payload.url}`;
        setReviewUrl(absolute);
        await navigator.clipboard.writeText(absolute);
        setReviewStatus(t(locale, "tool_review_copied"));
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : "STUDIO_REQUIRED";
      if (code === "STUDIO_REQUIRED") setReviewUpgrade(true);
      setStatus(explainError(code));
    } finally {
      setBusy(false);
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
      setStatus(error instanceof Error ? error.message : t(locale, "error_export"));
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
    setOuterFiles(await loadSetFiles(id, "outer"));
    setInnerFiles(await loadSetFiles(id, "inner"));
    setZipUrl(null);
  }

  function closeSets() {
    setsRef.current?.removeAttribute("open");
    setSetsOpen(false);
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
    billing?.plan === "studio"
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
  const hasFiles = outerFiles.length > 0 || innerFiles.length > 0;
  const cloneLabel = clones[0]?.label ?? (cloneForced && hasFiles ? "risk" : null);

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-4xl">{t(locale, "tool_title")}</h1>
          <p className={`ds-pill ${pillMute ? "ds-pill-mute" : "ds-pill-ink"}`}>{remainingLabel}</p>
        </div>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">{t(locale, "tool_lead")}</p>
        <div className="ds-set-bar mt-6">
          <div className="ds-field !mt-0 min-w-0 flex-1 basis-64">
            <p className="ds-label" id="tool-sets-label">
              {t(locale, "tool_sets")}
            </p>
            <details
              className="ds-listbox"
              ref={setsRef}
              onToggle={(event) => setSetsOpen(event.currentTarget.open)}
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
                onKeyDown={onSetsTriggerKey}
              >
                <span>{active?.name?.trim() ? active.name : t(locale, "tool_label_app")}</span>
                <span className="ds-listbox-caret" aria-hidden="true" />
              </summary>
              <ul
                id="tool-sets-menu"
                className="ds-listbox-menu"
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
            label={t(locale, "tool_drop_outer")}
            count={outerFiles.length}
            onFiles={(list) => onSideFiles("outer", list)}
          />
          <DropZone
            testId="drop-inner"
            label={t(locale, "tool_drop_inner")}
            count={sameSet ? outerFiles.length : innerFiles.length}
            onFiles={(list) => onSideFiles("inner", list)}
          />
        </div>
        <div className="mt-4">
          <button
            type="button"
            className="ds-toggle"
            data-testid="toggle-same-set"
            aria-pressed={sameSet}
            onClick={() => patchActive({ sameSet: !sameSet })}
          >
            <span className="text-sm">{t(locale, "tool_same_set")}</span>
            <span className="ds-toggle-track">
              <span className="ds-toggle-thumb" />
            </span>
          </button>
        </div>
        {cloneForced ? (
          <p className="ds-warn" role="status" data-testid="warn-clone">
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
        <div className="preview-duo mt-8">
          <PreviewCard
            testId="preview-outer"
            label={t(locale, "tool_preview_outer")}
            src={previews?.outer}
            kind="outer"
            inspect={outerInspect}
            specLabel="1398×2034"
            locale={locale}
            clone={cloneLabel}
          />
          <PreviewCard
            testId="preview-inner"
            label={t(locale, "tool_preview_inner")}
            src={previews?.inner}
            kind="inner"
            inspect={innerInspect}
            specLabel="2007×2853"
            locale={locale}
            hinge={showHinge}
            clone={cloneLabel}
          />
        </div>
        {clones.length > 1 ? (
          <ol className="mt-4 font-mono text-xs text-[var(--muted)]">
            {clones.map((item) => (
              <li key={item.index}>
                {String(item.index + 1).padStart(2, "0")} · {t(locale, `clone_${item.label}`)}
              </li>
            ))}
          </ol>
        ) : null}
      </section>
      <aside className="h-fit border-t border-[var(--line)] pt-5 lg:border-t-0 lg:pt-0">
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
          value={active?.orientation ?? options.orientation}
          options={[
            { value: "portrait", label: t(locale, "tool_orient_portrait") },
            { value: "landscape", label: t(locale, "tool_orient_landscape") },
          ]}
          onChange={(value) => {
            patchActive({ orientation: value as Orientation });
            updateOptions({ orientation: value as Orientation });
          }}
        />
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
          <button
            type="button"
            className="ds-toggle"
            data-testid="toggle-hinge"
            aria-pressed={showHinge}
            onClick={() => setShowHinge((value) => !value)}
          >
            <span className="text-sm">{t(locale, "tool_hinge_toggle")}</span>
            <span className="ds-toggle-track">
              <span className="ds-toggle-thumb" />
            </span>
          </button>
        </div>
        <div className="ds-field">
          <button
            type="button"
            className="ds-toggle"
            data-testid="toggle-burn-hinge"
            aria-pressed={Boolean(options.burnHinge)}
            onClick={() => updateOptions({ burnHinge: !options.burnHinge })}
          >
            <span className="text-sm">{t(locale, "tool_burn_hinge")}</span>
            <span className="ds-toggle-track">
              <span className="ds-toggle-thumb" />
            </span>
          </button>
          <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{t(locale, "tool_burn_hinge_hint")}</p>
        </div>
        <div className="ds-field">
          <button
            type="button"
            className="ds-toggle"
            data-testid="toggle-69"
            aria-pressed={include69}
            onClick={() => {
              const next = !include69;
              setInclude69(next);
              if (next && (!billing || billing.canUse69 === false)) setPaywall("69");
            }}
          >
            <span className="text-sm">{t(locale, "tool_label_69")}</span>
            <span className="ds-toggle-track">
              <span className="ds-toggle-thumb" />
            </span>
          </button>
        </div>
        {cloneLabel === "risk" ? (
          <div className="ds-field">
            <button
              type="button"
              className="ds-toggle"
              data-testid="toggle-assume-clone"
              aria-pressed={assumeClone}
              onClick={() => setAssumeClone((value) => !value)}
            >
              <span className="text-sm">{t(locale, "tool_assume_clone")}</span>
              <span className="ds-toggle-track">
                <span className="ds-toggle-thumb" />
              </span>
            </button>
            <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{t(locale, "tool_assume_clone_hint")}</p>
          </div>
        ) : null}
        <button
          type="button"
          disabled={busy || !hasFiles}
          data-testid="tool-download"
          onClick={() => void onExport()}
          className="ds-cta mt-6 w-full"
        >
          {busy ? t(locale, "tool_preparing") : t(locale, "tool_download")}
        </button>
        <button
          type="button"
          disabled={busy || !hasFiles}
          data-testid="tool-review"
          onClick={() => void onReview()}
          className="ds-cta-ghost mt-3 w-full"
        >
          {t(locale, "tool_review_share")}
        </button>
          <a href="/api/example-zip?v=2" data-testid="tool-example" className="ds-text-btn mt-3">
          {t(locale, "tool_example")}
        </a>
        {!signedIn ? (
          <p className="mt-3 text-xs text-[var(--muted)]">
            {t(locale, "tool_need_account")}{" "}
            <Link href={`${prefix}/signup`} className="ds-link">
              {t(locale, "nav_signup")}
            </Link>
          </p>
        ) : null}
        {status ?? urlStatus ? <p className="mt-3 text-sm" data-testid="tool-status">{status ?? urlStatus}</p> : null}
        {reviewStatus ? <p className="mt-2 text-sm" data-testid="review-copied">{reviewStatus}</p> : null}
        {zipUrl ? (
          <a href={zipUrl} data-testid="tool-zip-link" className="ds-text-btn mt-3">
            {t(locale, "tool_open_zip")}
          </a>
        ) : null}
        {reviewUrl ? (
          <a href={reviewUrl} data-testid="review-url" className="ds-text-btn mt-2">
            {reviewUrl}
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
  count,
  onFiles,
}: {
  testId: string;
  label: string;
  count: number;
  onFiles: (list: FileList | File[] | DataTransfer | null) => void;
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;
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
      className={`ds-drop ${over ? "is-over" : ""}`}
      data-testid={testId}
      data-count={count}
      onDragEnter={() => setOver(true)}
      onDragLeave={() => setOver(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const files = takeFiles(event.dataTransfer);
        if (files.length) onFiles(files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        aria-label={label}
        data-testid={`${testId}-input`}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      <span>{label}</span>
      <span className="mt-2 text-sm text-[var(--muted)]">
        {count} / {MAX_IMAGES}
      </span>
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
  return (
    <div className="ds-field">
      <p className="ds-label" id={labelId}>
        {label}
      </p>
      <div
        className="ds-seg"
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
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            data-seg={option.value}
            className={value === option.value ? "is-on" : ""}
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
  specLabel,
  locale,
  hinge = false,
  clone,
}: {
  testId: string;
  label: string;
  src?: string;
  kind: "outer" | "inner";
  inspect: SourceInspect | null;
  specLabel: string;
  locale: Locale;
  hinge?: boolean;
  clone: CloneResult["label"] | null;
}) {
  return (
    <figure data-testid={testId}>
      <figcaption className="duo-caption text-left">{label}</figcaption>
      <div className="preview-stage">
        <div
          className={`preview-glass ${kind === "outer" ? "preview-outer" : "preview-inner"} ${src ? "" : "preview-empty"} ${hinge ? "is-hinge" : "hinge-off"}`}
        >
          {src ? (
            // User-generated preview from canvas.toDataURL
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={label} className="h-full w-full object-cover" />
          ) : (
            <span>—</span>
          )}
        </div>
      </div>
      <ul className="space-y-1 text-xs text-[var(--muted)]">
        <li>
          {inspect?.hasAlpha ? t(locale, "tool_check_alpha_flat") : t(locale, "tool_check_alpha_ok")}
        </li>
        <li>
          {t(locale, "tool_label_orientation")}: {specLabel}
        </li>
        <li>{inspect?.colorSpace === "other" ? t(locale, "tool_check_rgb_bad") : t(locale, "tool_check_rgb_ok")}</li>
        {kind === "inner" ? <li>{t(locale, "tool_check_hinge")}</li> : null}
        {clone ? <li>{t(locale, `clone_${clone}`)}</li> : null}
        <li>{t(locale, "tool_check_zip")}</li>
      </ul>
    </figure>
  );
}

function drawTarget(
  bitmap: ImageBitmap,
  options: RenderOptions,
  spec: { width: number; height: number },
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
  const rect =
    options.fit === "contain"
      ? containRect(bitmap.width, bitmap.height, spec.width, spec.height)
      : coverRect(bitmap.width, bitmap.height, spec.width, spec.height);
  ctx.drawImage(bitmap, rect.left, rect.top, rect.width, rect.height);
  if (options.title) {
    ctx.fillStyle = "#F4F1EA";
    ctx.textAlign = "center";
    ctx.font = `700 ${Math.round(spec.width * 0.046)}px system-ui`;
    const y = options.titlePosition === "top" ? spec.height * 0.08 : spec.height * 0.88;
    ctx.fillText(options.title, spec.width / 2, y);
  }
  return canvas.toDataURL("image/jpeg", 0.7);
}

function startZipDownload(url: string) {
  if (typeof window === "undefined" || "Cypress" in window) return;
  window.location.assign(url);
}
