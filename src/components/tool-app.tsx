"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
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
import { t } from "@/lib/i18n";
import { checkSourceCount } from "@/lib/pipeline/validate";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { containRect, coverRect } from "@/lib/pipeline/geometry";

type Props = { locale: Locale };

const outerPreview = SIZE_SPECS.find((spec) => spec.id === "outer-p")!;
const innerPreview = SIZE_SPECS.find((spec) => spec.id === "inner-p")!;

export function ToolApp({ locale }: Props) {
  const prefix = locale === "en" ? "/en" : "";
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<RenderOptions>(DEFAULT_RENDER_OPTIONS);
  const [appName, setAppName] = useState("MyApp");
  const [include69, setInclude69] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState<{ outer: string; inner: string } | null>(null);

  const warning = useMemo(() => {
    if (files.length === 0) return null;
    try {
      return checkSourceCount(files.length).warning ?? null;
    } catch (error) {
      return error instanceof Error ? error.message : "error";
    }
  }, [files.length]);

  const drawPreviews = useCallback(
    async (file: File, next: RenderOptions) => {
      const bitmap = await createImageBitmap(file);
      const outer = drawTarget(bitmap, next, next.orientation === "portrait" ? outerPreview : SIZE_SPECS.find((s) => s.id === "outer-l")!);
      const inner = drawTarget(bitmap, next, next.orientation === "portrait" ? innerPreview : SIZE_SPECS.find((s) => s.id === "inner-l")!);
      setPreviews({ outer, inner });
      bitmap.close();
    },
    [],
  );

  function onFiles(list: FileList | File[]) {
    const incoming = Array.from(list).filter((file) => /image\/(png|jpeg)/.test(file.type));
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

  async function onExport() {
    setBusy(true);
    setStatus(null);
    setZipUrl(null);
    try {
      const supabase = createBrowserSupabase();
      const { data: sessionData } = await supabase.auth.getUser();
      if (!sessionData.user) {
        setStatus(t(locale, "tool_need_account"));
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
      if (!response.ok) throw new Error(payload.error || "Export impossible");
      if (payload.url) {
        setZipUrl(payload.url);
        setStatus(payload.warning || (locale === "fr" ? "ZIP prêt." : "ZIP ready."));
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">{t(locale, "tool_title")}</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">{t(locale, "hero_lead")}</p>
        <label className="mt-8 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--accent)]/40 bg-[#141821] text-center">
          <input
            type="file"
            accept="image/png,image/jpeg"
            multiple
            className="hidden"
            onChange={(event) => event.target.files && onFiles(event.target.files)}
          />
          <span>{t(locale, "tool_drop")}</span>
          <span className="mt-2 text-sm text-[var(--muted)]">
            {files.length} / {MAX_IMAGES}
          </span>
        </label>
        {warning === "TOO_FEW" ? (
          <p className="mt-3 text-sm text-amber-300">
            {t(locale, "tool_warn")} ({WARN_MIN_IMAGES}+)
          </p>
        ) : null}
        {files.length >= MAX_IMAGES ? (
          <p className="mt-3 text-sm text-amber-300">{t(locale, "tool_cap")}</p>
        ) : null}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <PreviewCard
            label="Outer 5.4″"
            src={previews?.outer}
            orientation={options.orientation}
            kind="outer"
          />
          <PreviewCard
            label="Inner 7.6″"
            src={previews?.inner}
            orientation={options.orientation}
            kind="inner"
          />
        </div>
      </section>
      <aside className="h-fit rounded-3xl border border-white/10 bg-[#141821] p-5">
        <label className="grid gap-1 text-sm">
          App
          <input
            value={appName}
            onChange={(event) => setAppName(event.target.value)}
            className="rounded-xl border border-white/10 bg-[#0B0D12] px-3 py-2"
          />
        </label>
        <fieldset className="mt-4 grid gap-2 text-sm">
          <legend>Orientation</legend>
          {(["portrait", "landscape"] as Orientation[]).map((value) => (
            <label key={value} className="flex gap-2">
              <input
                type="radio"
                checked={options.orientation === value}
                onChange={() => updateOptions({ orientation: value })}
              />
              {value}
            </label>
          ))}
        </fieldset>
        <fieldset className="mt-4 grid gap-2 text-sm">
          <legend>Fit</legend>
          {(["contain", "cover", "smart"] as FitMode[]).map((value) => (
            <label key={value} className="flex gap-2">
              <input
                type="radio"
                checked={options.fit === value}
                onChange={() => updateOptions({ fit: value })}
              />
              {value}
            </label>
          ))}
        </fieldset>
        <fieldset className="mt-4 grid gap-2 text-sm">
          <legend>Fond</legend>
          {(["solid", "gradient", "blur"] as RenderOptions["background"][]).map((value) => (
            <label key={value} className="flex gap-2">
              <input
                type="radio"
                checked={options.background === value}
                onChange={() => updateOptions({ background: value })}
              />
              {value}
            </label>
          ))}
          <input
            type="color"
            value={options.solidColor}
            onChange={(event) => updateOptions({ solidColor: event.target.value })}
          />
        </fieldset>
        <label className="mt-4 grid gap-1 text-sm">
          Titre
          <input
            value={options.title}
            onChange={(event) => updateOptions({ title: event.target.value })}
            className="rounded-xl border border-white/10 bg-[#0B0D12] px-3 py-2"
          />
        </label>
        <label className="mt-3 grid gap-1 text-sm">
          Sous-titre
          <input
            value={options.subtitle}
            onChange={(event) => updateOptions({ subtitle: event.target.value })}
            className="rounded-xl border border-white/10 bg-[#0B0D12] px-3 py-2"
          />
        </label>
        <div className="mt-3 flex gap-3 text-sm">
          <label>
            <input
              type="radio"
              checked={options.titlePosition === "top"}
              onChange={() => updateOptions({ titlePosition: "top" })}
            />{" "}
            haut
          </label>
          <label>
            <input
              type="radio"
              checked={options.titlePosition === "bottom"}
              onChange={() => updateOptions({ titlePosition: "bottom" })}
            />{" "}
            bas
          </label>
        </div>
        <div className="mt-2 flex gap-3 text-sm">
          <label>
            <input
              type="radio"
              checked={options.titleFont === "sans"}
              onChange={() => updateOptions({ titleFont: "sans" })}
            />{" "}
            sans
          </label>
          <label>
            <input
              type="radio"
              checked={options.titleFont === "serif"}
              onChange={() => updateOptions({ titleFont: "serif" })}
            />{" "}
            serif
          </label>
        </div>
        <div className="mt-3 flex gap-3 text-sm">
          {(["png", "jpeg"] as OutputFormat[]).map((value) => (
            <label key={value}>
              <input
                type="radio"
                checked={options.format === value}
                onChange={() => updateOptions({ format: value })}
              />{" "}
              {value === "png" ? "PNG-24" : "JPEG q90"}
            </label>
          ))}
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={include69} onChange={(event) => setInclude69(event.target.checked)} />
          6.9″ (Indie/Studio)
        </label>
        <button
          type="button"
          disabled={busy || files.length === 0}
          onClick={onExport}
          className="mt-6 w-full rounded-full bg-[var(--accent)] py-3 font-medium text-[#111]"
        >
          {t(locale, "tool_download")}
        </button>
        <p className="mt-3 text-xs text-[var(--muted)]">
          {t(locale, "tool_need_account")}{" "}
          <Link href={`${prefix}/signup`} className="underline">
            {t(locale, "nav_signup")}
          </Link>
        </p>
        {status ? <p className="mt-3 text-sm">{status}</p> : null}
        {zipUrl ? (
          <a href={zipUrl} className="mt-3 inline-block text-sm text-[var(--accent)] underline">
            Ouvrir l’URL signée
          </a>
        ) : null}
      </aside>
    </div>
  );
}

function PreviewCard({
  label,
  src,
  orientation,
  kind,
}: {
  label: string;
  src?: string;
  orientation: Orientation;
  kind: "outer" | "inner";
}) {
  const portrait = orientation === "portrait";
  const aspect = kind === "outer" ? (portrait ? "1398/2034" : "2034/1398") : portrait ? "2007/2853" : "2853/2007";
  return (
    <figure className="rounded-[24px] border border-white/10 bg-[#0B0D12] p-4">
      <figcaption className="mb-3 text-sm text-[var(--muted)]">{label}</figcaption>
      <div
        className="overflow-hidden rounded-[18px] bg-[#1a2030]"
        style={{ aspectRatio: aspect }}
      >
        {src ? (
          // User-generated preview from canvas.toDataURL
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">—</div>
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
