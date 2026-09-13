"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
import { createBrowserSupabase } from "@/lib/supabase/client";
import { containRect, coverRect } from "@/lib/pipeline/geometry";
import { checkoutReturnPath, startCheckout } from "@/lib/checkout";
import type { CheckoutKind } from "@/lib/plans";
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

const outerPreview = SIZE_SPECS.find((spec) => spec.id === "outer-p")!;
const innerPreview = SIZE_SPECS.find((spec) => spec.id === "inner-p")!;

export function ToolApp({ locale }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-5 py-10 text-[var(--muted)]">…</div>}>
      <ToolAppInner locale={locale} />
    </Suspense>
  );
}

function ToolAppInner({ locale }: Props) {
  const prefix = localePrefix(locale);
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<RenderOptions>(DEFAULT_RENDER_OPTIONS);
  const [appName, setAppName] = useState("MyApp");
  const [include69, setInclude69] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [previews, setPreviews] = useState<{ outer: string; inner: string } | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [session, setSession] = useState<"out" | "in">("out");
  const [showAuth, setShowAuth] = useState(false);
  const [paywall, setPaywall] = useState<"trial" | "69" | null>(null);
  const [upgradeDismissed, setUpgradeDismissed] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
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

  const warning = useMemo(() => {
    if (files.length === 0) return null;
    try {
      return checkSourceCount(files.length).warning ?? null;
    } catch (error) {
      return error instanceof Error ? error.message : "error";
    }
  }, [files.length]);

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
    const payload = (await response.json()) as BillingStatus;
    setBilling(payload);
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void refreshBilling();
    });
    return () => listener.subscription.unsubscribe();
  }, [refreshBilling]);

  const drawPreviews = useCallback(async (file: File, next: RenderOptions) => {
    const bitmap = await createImageBitmap(file);
    const outer = drawTarget(
      bitmap,
      next,
      next.orientation === "portrait" ? outerPreview : SIZE_SPECS.find((s) => s.id === "outer-l")!,
    );
    const inner = drawTarget(
      bitmap,
      next,
      next.orientation === "portrait" ? innerPreview : SIZE_SPECS.find((s) => s.id === "inner-l")!,
    );
    setPreviews({ outer, inner });
    bitmap.close();
  }, []);

  function isAllowedImage(file: File) {
    return /image\/(png|jpeg)/.test(file.type) || /\.(png|jpe?g)$/i.test(file.name);
  }

  function onFiles(list: FileList | File[]) {
    const incoming = Array.from(list).filter(isAllowedImage);
    const next = incoming.slice(0, MAX_IMAGES);
    setFiles(next);
    setZipUrl(null);
    if (next[0]) void drawPreviews(next[0], options);
    else setPreviews(null);
  }

  function updateOptions(patch: Partial<RenderOptions>) {
    const next = { ...options, ...patch };
    setOptions(next);
    if (files[0]) void drawPreviews(files[0], next);
  }

  function explainError(code: string) {
    if (code === "AUTH_REQUIRED") return t(locale, "error_auth");
    if (code === "TRIAL_EXHAUSTED") return t(locale, "error_trial");
    if (code === "DAILY_LIMIT") return t(locale, "error_daily");
    if (code === "IPHONE_69_GATED") return t(locale, "error_69");
    return t(locale, "error_export");
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
      const paths: string[] = [];
      for (const file of files) {
        const ext = file.type === "image/png" ? "png" : "jpg";
        const path = `${sessionData.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("uploads").upload(path, file, {
          contentType: file.type,
          upsert: true,
        });
        if (error) throw error;
        paths.push(path);
      }
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paths,
          appName,
          include69,
          options,
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
      if (!response.ok) throw new Error(payload.error || "Export impossible");
      if (payload.url) {
        setZipUrl(payload.url);
        setStatus(payload.warning === "TOO_FEW" ? t(locale, "tool_warn") : t(locale, "tool_zip_ready"));
        void refreshBilling();
      }
    } catch (error) {
      setStatus(error instanceof Error ? explainError(error.message) : t(locale, "error_export"));
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

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-4xl">{t(locale, "tool_title")}</h1>
          <p className={`ds-pill ${pillMute ? "ds-pill-mute" : "ds-pill-ink"}`}>{remainingLabel}</p>
        </div>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">{t(locale, "hero_lead")}</p>
        <label
          className={`ds-drop mt-8 ${over ? "is-over" : ""}`}
          onDragEnter={() => setOver(true)}
          onDragLeave={() => setOver(false)}
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setOver(false);
            onFiles(event.dataTransfer.files);
          }}
        >
          <input
            type="file"
            accept="image/png,image/jpeg"
            multiple
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(event) => event.target.files && onFiles(event.target.files)}
          />
          <span>{t(locale, "tool_drop")}</span>
          <span className="mt-2 text-sm text-[var(--muted)]">
            {files.length} / {MAX_IMAGES}
          </span>
        </label>
        {warning === "TOO_FEW" ? (
          <p className="mt-3 text-sm text-amber-800">
            {t(locale, "tool_warn")} ({WARN_MIN_IMAGES}+)
          </p>
        ) : null}
        {files.length >= MAX_IMAGES ? <p className="mt-3 text-sm text-amber-800">{t(locale, "tool_cap")}</p> : null}
        <div className="preview-duo mt-8">
          <PreviewCard label={t(locale, "tool_preview_outer")} src={previews?.outer} kind="outer" />
          <PreviewCard label={t(locale, "tool_preview_inner")} src={previews?.inner} kind="inner" />
        </div>
      </section>
      <aside className="h-fit border-t border-[var(--line)] pt-5 lg:border-t-0 lg:pt-0">
        <div className="ds-field">
          <p className="ds-label">{t(locale, "tool_label_app")}</p>
          <input value={appName} onChange={(event) => setAppName(event.target.value)} className="ds-input w-full" />
        </div>
        <Seg
          label={t(locale, "tool_label_orientation")}
          value={options.orientation}
          options={[
            { value: "portrait", label: t(locale, "tool_orient_portrait") },
            { value: "landscape", label: t(locale, "tool_orient_landscape") },
          ]}
          onChange={(value) => updateOptions({ orientation: value as Orientation })}
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
          <p className="ds-label">{t(locale, "tool_label_title")}</p>
          <input
            value={options.title}
            onChange={(event) => updateOptions({ title: event.target.value })}
            className="ds-input w-full"
          />
        </div>
        <div className="ds-field">
          <p className="ds-label">{t(locale, "tool_label_subtitle")}</p>
          <input
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
        <button
          type="button"
          disabled={busy || files.length === 0}
          onClick={() => void onExport()}
          className="ds-cta mt-6 w-full"
        >
          {t(locale, "tool_download")}
        </button>
        {!signedIn ? (
          <p className="mt-3 text-xs text-[var(--muted)]">
            {t(locale, "tool_need_account")}{" "}
            <Link href={`${prefix}/signup`} className="ds-link">
              {t(locale, "nav_signup")}
            </Link>
          </p>
        ) : null}
        {status ?? urlStatus ? <p className="mt-3 text-sm">{status ?? urlStatus}</p> : null}
        {zipUrl ? (
          <a href={zipUrl} className="mt-3 inline-block text-sm underline">
            {t(locale, "tool_open_zip")}
          </a>
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
  return (
    <div className="ds-field">
      <p className="ds-label">{label}</p>
      <div className="ds-seg" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? "is-on" : ""}
            aria-pressed={value === option.value}
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
  label,
  src,
  kind,
}: {
  label: string;
  src?: string;
  kind: "outer" | "inner";
}) {
  return (
    <figure>
      <figcaption className="duo-caption mb-3 text-left">{label}</figcaption>
      <div className={`preview-glass ${kind === "outer" ? "preview-outer" : "preview-inner"} ${src ? "" : "preview-empty"}`}>
        {src ? (
          // User-generated preview from canvas.toDataURL
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} className="h-full w-full object-contain" />
        ) : (
          <span>—</span>
        )}
      </div>
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
