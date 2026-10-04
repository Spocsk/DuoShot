"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Overlay } from "@/components/overlay";
import { t, tf } from "@/lib/i18n";
import type { Locale, Orientation } from "@/lib/specs";
import { type useAscUpload, type AscApp, type AscFileProgress, type AscLocalization, type AscVersion } from "./use-asc-upload";
import {
  ascAppUrl, ascErrorKey, ascFileErrorKey, ascFilePlan, ascFileStateKey, ascGate, autoPick,
  type AscPlannedFile, type AscToolStatus, type ExportImage,
} from "./asc-tool-state";

type Props = {
  locale: Locale;
  prefix: string;
  exportId: string;
  images: ExportImage[];
  orientation: Orientation;
  /** Leaves the dialog for Adjust with the 6.9″ toggle in view. */
  onEnable69: () => void;
};

/**
 * Secondary Export action under "Download ZIP". Renders nothing while the
 * connector flag is off: GET /api/asc/connection answers 404 then.
 */
export function AscToolAction(props: Props & { upload: ReturnType<typeof useAscUpload> }) {
  const { locale, prefix, exportId } = props;
  const [status, setStatus] = useState<AscToolStatus | null>(null);
  const [open, setOpen] = useState(false);
  // The hook lives in the tool so an upload survives step changes; a finished
  // result only belongs to the export it was sent from.
  const stale = props.upload.exportId !== exportId && (props.upload.state.phase === "completed" || props.upload.state.phase === "failed");
  const upload = stale ? { ...props.upload, state: { phase: "idle" } as const } : props.upload;
  const ids = useId();

  useEffect(() => {
    let live = true;
    void fetch("/api/asc/connection", { cache: "no-store" })
      .then(async (response) => (response.ok ? ((await response.json()) as AscToolStatus) : null))
      .then((payload) => { if (live) setStatus(payload); })
      .catch(() => undefined);
    return () => { live = false; };
  }, []);

  const gate = ascGate(status);
  if (gate === "hidden") return null;

  if (gate === "locked") {
    return (
      <div className="tool-asc" data-testid="asc-tool-locked">
        <button type="button" className="ds-cta-ghost w-full" disabled aria-describedby={`${ids}-locked`}>
          <LockIcon />{t(locale, "asct_send")}
        </button>
        <p id={`${ids}-locked`} className="tool-asc-note">
          {t(locale, "asct_locked_hint")}{" "}
          <Link href={`${prefix}/pricing`} className="ds-link" data-testid="asc-tool-pricing">{t(locale, "asct_locked_link")}</Link>
        </p>
      </div>
    );
  }

  if (gate === "not_connected") {
    return (
      <div className="tool-asc" data-testid="asc-tool-not-connected">
        <p className="tool-asc-note">
          {t(locale, "asct_not_connected_hint")}{" "}
          <Link href={`${prefix}/account#connexions`} className="ds-link" data-testid="asc-tool-connect">{t(locale, "asct_connect_link")}</Link>
        </p>
      </div>
    );
  }

  const phase = upload.state.phase;
  const label = phase === "queued" || phase === "running" ? t(locale, "asct_sending")
    : phase === "completed" ? t(locale, "asct_sent") : t(locale, "asct_send");
  return (
    <div className="tool-asc">
      <button type="button" className="ds-cta-ghost w-full" data-testid="asc-tool-open" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {label}
      </button>
      {/* Portaled: the dock's backdrop-filter would otherwise contain the fixed overlay. */}
      {open ? createPortal(
        <Overlay onClose={() => setOpen(false)} labelledBy={`${ids}-title`} closeLabel={t(locale, "asct_close")}>
          <AscUploadDialog {...props} titleId={`${ids}-title`} owner={status?.owner === true} upload={upload}
            onEnable69={() => { setOpen(false); props.onEnable69(); }} />
        </Overlay>,
        document.body,
      ) : null}
    </div>
  );
}

type Lookup<T> = { state: "idle" | "loading" | "ready" | "error"; items: T[]; error?: string; retry: () => void };
type Loaded<T> = { key: string; attempt: number; items: T[]; error?: string; ok: boolean };

/** One Apple lookup keyed by its parent id; a null key means nothing to load yet. */
function useLookup<T>(key: string | null, load: (key: string) => Promise<T[]>): Lookup<T> {
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (key === null) return;
    let live = true;
    load(key).then(
      (items) => { if (live) setLoaded({ key, attempt, items, ok: true }); },
      (error: unknown) => { if (live) setLoaded({ key, attempt, items: [], ok: false, error: error instanceof Error ? error.message : undefined }); },
    );
    return () => { live = false; };
  }, [key, attempt, load]);
  const retry = () => setAttempt((n) => n + 1);
  const current = key !== null && loaded?.key === key && loaded.attempt === attempt ? loaded : null;
  if (key === null) return { state: "idle", items: [], retry };
  if (!current) return { state: "loading", items: [], retry };
  return current.ok ? { state: "ready", items: current.items, retry } : { state: "error", items: [], error: current.error, retry };
}

function AscUploadDialog({ locale, exportId, images, orientation, onEnable69, titleId, owner, upload }: Props & {
  titleId: string;
  owner: boolean;
  upload: ReturnType<typeof useAscUpload>;
}) {
  const { state, listApps, listVersions, listLocalizations } = upload;
  const plan = useMemo(() => ascFilePlan(images, orientation), [images, orientation]);
  const [chosenApp, setChosenApp] = useState("");
  const [chosenVersion, setChosenVersion] = useState("");
  const [chosenLocalization, setChosenLocalization] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const ids = useId();

  // A single option is picked for the user; each level loads from the one above.
  const apps = useLookup<AscApp>(plan.send.length && state.phase === "idle" ? "apps" : null, listApps);
  const appId = chosenApp || autoPick(apps.items);
  const versions = useLookup<AscVersion>(appId || null, listVersions);
  const versionId = chosenVersion || autoPick(versions.items);
  const localizations = useLookup<AscLocalization>(versionId || null, listLocalizations);
  const localizationId = chosenLocalization || autoPick(localizations.items);

  const view = !plan.send.length ? "no69"
    : state.phase === "idle" ? "form"
    : state.phase === "completed" ? "done"
    : state.phase === "failed" ? "error" : "progress";

  // Each view replaces the controls that held focus: move it to the new heading.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstView = useRef(view);
  useEffect(() => {
    if (view === firstView.current) return;
    firstView.current = "";
    headingRef.current?.focus();
  }, [view]);

  const progress = state.phase === "queued" || state.phase === "running" || state.phase === "failed" ? state.progress : undefined;
  const announcement = view === "progress"
    ? (progress ? tf(locale, "asct_progress_summary", { done: progress.done, total: progress.total }) : t(locale, "asct_progress_queued"))
    : view === "done" ? t(locale, "asct_success_title")
    : view === "error" ? t(locale, "asct_error_title") : "";

  async function confirm() {
    if (submitting || state.phase !== "idle" || !appId || !versionId || !localizationId) return;
    setSubmitting(true);
    try {
      await upload.upload({ exportId, appId, versionId, localizationId, replaceExisting: owner && replaceExisting });
    } finally {
      setSubmitting(false);
    }
  }

  const size = plan.send[0] ? `${plan.send[0].width} × ${plan.send[0].height}` : "";
  const heading = view === "no69" ? t(locale, "asct_no69_title")
    : view === "progress" ? t(locale, "asct_progress_title")
    : view === "done" ? t(locale, "asct_success_title")
    : view === "error" ? t(locale, "asct_error_title") : t(locale, "asct_dialog_title");

  return (
    <div className="tool-asc-dialog" data-testid="asc-dialog" data-view={view}>
      <h2 id={titleId} ref={headingRef} tabIndex={-1} className="font-display text-2xl">{heading}</h2>
      <p className="sr-only" role="status" aria-live="polite" data-testid="asc-live">{announcement}</p>

      {view === "no69" ? <>
        <p className="mt-3 text-sm text-[var(--muted)]">{t(locale, "asct_no69_body")}</p>
        <SkippedFiles locale={locale} files={plan.skipped} />
        <button type="button" className="ds-cta mt-5 w-full" data-testid="asc-enable-69" onClick={onEnable69}>{t(locale, "asct_enable69")}</button>
      </> : null}

      {view === "form" ? <>
        <p className="mt-3 text-sm text-[var(--muted)]">{t(locale, "asct_dialog_lead")}</p>
        <div className="mt-5 grid gap-4">
          <Picker
            id={`${ids}-app`} label={t(locale, "asct_app")} locale={locale} lookup={apps} empty={t(locale, "asct_no_apps")} testId="asc-app"
            value={appId} onChange={(value) => { setChosenApp(value); setChosenVersion(""); setChosenLocalization(""); }}
            options={apps.items.map((app) => ({ value: app.id, label: `${app.name} · ${app.bundleId}` }))}
          />
          {appId ? <Picker
            id={`${ids}-version`} label={t(locale, "asct_version")} locale={locale} lookup={versions} empty={t(locale, "asct_no_versions")} testId="asc-version"
            value={versionId} onChange={(value) => { setChosenVersion(value); setChosenLocalization(""); }}
            options={versions.items.map((version) => ({ value: version.id, label: `${version.versionString} · ${version.platform === "IOS" ? "iOS" : version.platform}` }))}
          /> : null}
          {versionId ? <Picker
            id={`${ids}-loc`} label={t(locale, "asct_localization")} locale={locale} lookup={localizations} empty={t(locale, "asct_no_localizations")} testId="asc-localization"
            value={localizationId} onChange={setChosenLocalization}
            options={localizations.items.map((item) => ({ value: item.id, label: languageLabel(locale, item.locale) }))}
          /> : null}
        </div>

        <section className="mt-5" aria-labelledby={`${ids}-files`} data-testid="asc-send-files">
          <h3 id={`${ids}-files`} className="ds-label">{t(locale, "asct_files_title")}</h3>
          <p className="mt-1 text-sm">{tf(locale, "asct_files_count", { n: plan.send.length, size })}</p>
          <FileList files={plan.send} />
        </section>
        <SkippedFiles locale={locale} files={plan.skipped} />

        {owner ? (
          <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm" htmlFor={`${ids}-replace`}>
            <input id={`${ids}-replace`} type="checkbox" className="mt-1" checked={replaceExisting} data-testid="asc-replace"
              aria-describedby={`${ids}-replace-hint`} onChange={(event) => setReplaceExisting(event.target.checked)} />
            <span>
              {t(locale, "asct_replace")}
              <span id={`${ids}-replace-hint`} className="mt-1 block text-xs text-[var(--muted)]">{t(locale, "asct_replace_hint")}</span>
            </span>
          </label>
        ) : <p className="mt-5 text-xs text-[var(--muted)]">{t(locale, "asct_keep_hint")}</p>}

        <button type="button" className="ds-cta mt-5 w-full" data-testid="asc-confirm"
          disabled={submitting || !appId || !versionId || !localizationId} onClick={() => void confirm()}>
          {tf(locale, "asct_confirm", { n: plan.send.length })}
        </button>
      </> : null}

      {view === "progress" ? <>
        <p className="mt-3 text-sm" data-testid="asc-progress-summary">
          {progress ? tf(locale, "asct_progress_summary", { done: progress.done, total: progress.total }) : t(locale, "asct_progress_queued")}
        </p>
        {progress ? <progress className="tool-asc-progress mt-3" max={progress.total} value={progress.done} aria-label={t(locale, "asct_progress_title")} /> : null}
        <ProgressList locale={locale} files={progress?.files ?? []} />
        <p className="mt-4 text-xs text-[var(--muted)]">{t(locale, "asct_progress_keep")}</p>
      </> : null}

      {view === "done" && state.phase === "completed" ? <>
        <p className="mt-3 text-sm" data-testid="asc-success">{tf(locale, "asct_success_body", { n: state.result.uploaded })}</p>
        {state.result.replaced ? <p className="mt-1 text-sm">{tf(locale, "asct_success_replaced", { n: state.result.replaced })}</p> : null}
        {state.result.reordered === false ? <p className="ds-warn mt-3">{t(locale, "asct_success_order")}</p> : null}
        <ProgressList locale={locale} files={state.result.files ?? []} />
        <a className="ds-cta mt-5 w-full" href={ascAppUrl(state.result.appId ?? appId)} target="_blank" rel="noopener noreferrer" data-testid="asc-open">
          {t(locale, "asct_open")}
        </a>
      </> : null}

      {view === "error" && state.phase === "failed" ? <>
        <p className="ds-warn mt-3" role="alert" data-testid="asc-error">{t(locale, ascErrorKey(state.error))}</p>
        <ProgressList locale={locale} files={state.progress?.files ?? []} />
        <button type="button" className="ds-cta-ghost mt-5 w-full" data-testid="asc-retry" onClick={upload.reset}>{t(locale, "asct_retry")}</button>
      </> : null}
    </div>
  );
}

function Picker({ id, label, locale, lookup, empty, value, onChange, options, testId }: {
  id: string; label: string; locale: Locale; lookup: Lookup<unknown>; empty: string;
  value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; testId: string;
}) {
  return (
    <div className="ds-field grid gap-1">
      <label className="ds-label" htmlFor={id}>{label}</label>
      {lookup.state === "error" ? (
        <p className="ds-warn" role="alert" data-testid={`${testId}-error`}>
          {t(locale, ascErrorKey(lookup.error))}{" "}
          <button type="button" className="ds-text-btn" onClick={lookup.retry}>{t(locale, "asct_retry")}</button>
        </p>
      ) : lookup.state === "ready" && !options.length ? (
        <p className="text-sm text-[var(--muted)]" data-testid={`${testId}-empty`}>{empty}</p>
      ) : (
        <select id={id} className="ds-input w-full" data-testid={testId} value={value} disabled={lookup.state !== "ready"}
          aria-busy={lookup.state === "loading"} onChange={(event) => onChange(event.target.value)}>
          <option value="">{lookup.state === "ready" ? t(locale, "asct_choose") : t(locale, "asct_loading")}</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      )}
    </div>
  );
}

function FileList({ files }: { files: AscPlannedFile[] }) {
  return (
    <ul className="tool-asc-files mt-2">
      {files.map((file) => <li key={`${file.slot}-${file.index}`}><code>{file.name}</code></li>)}
    </ul>
  );
}

function SkippedFiles({ locale, files }: { locale: Locale; files: AscPlannedFile[] }) {
  const ids = useId();
  if (!files.length) return null;
  return (
    <section className="mt-5" aria-labelledby={`${ids}-skipped`} data-testid="asc-skipped-files">
      <h3 id={`${ids}-skipped`} className="ds-label">{t(locale, "asct_skipped_title")}</h3>
      <p className="mt-1 text-sm" data-testid="asc-skipped-reason">{t(locale, "asct_skipped_reason")}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{tf(locale, "asct_skipped_count", { n: files.length })}</p>
      <FileList files={files} />
    </section>
  );
}

function ProgressList({ locale, files }: { locale: Locale; files: AscFileProgress[] }) {
  if (!files.length) return null;
  return (
    <ol className="tool-asc-files mt-3" data-testid="asc-progress-files">
      {files.map((file) => (
        <li key={`${file.slot}-${file.index}`} data-state={file.state}>
          <span>{locale === "fr" ? "6,9″" : "6.9″"} · {String(file.index).padStart(2, "0")}</span>
          <span className="tool-asc-file-state">
            {t(locale, ascFileStateKey(file.state))}
            {file.state === "failed" && file.error ? ` · ${t(locale, ascFileErrorKey(file.error))}` : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

function languageLabel(locale: Locale, code: string): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: "language" }).of(code);
    return name && name !== code ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" className="mr-2 inline-block">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5.2a2.5 2.5 0 015 0V7" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
