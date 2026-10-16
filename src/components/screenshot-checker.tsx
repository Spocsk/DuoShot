"use client";

import { useRef, useState } from "react";
import { Button } from "./ui/button";
import { inspectScreenshot } from "@/lib/screenshot-checker-browser";
import { duoSlotSummary } from "@/lib/screenshot-checker";
import { formatInches, type Locale } from "@/lib/specs";
import type { screenshotCheckerCopy } from "@/lib/screenshot-checker-copy";

type Result = { name: string; inspection: Awaited<ReturnType<typeof inspectScreenshot>> | null };

export function ScreenshotChecker({ locale, labels }: {
  locale: Locale;
  labels: ReturnType<typeof screenshotCheckerCopy>["labels"];
}) {
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const processing = useRef(false);
  const duo = duoSlotSummary(results.map((result) => result.inspection?.match ?? null));

  async function check(files: File[]) {
    if (!files.length || processing.current) return;
    processing.current = true;
    setBusy(true);
    try {
      // Sequential decoding bounds canvas memory even for a large batch.
      for (const file of files) {
        let inspection: Result["inspection"] = null;
        try { inspection = await inspectScreenshot(file); } catch { /* Show an error for this file and keep checking. */ }
        setResults((previous) => [...previous, { name: file.name, inspection }]);
      }
    } finally {
      processing.current = false;
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return <section className="mt-8 min-w-0 wrap-anywhere" aria-labelledby="checker-input-label">
    <div
      data-testid="checker-drop"
      className={`rounded-xl border-2 border-dashed p-6 sm:p-10 ${dragging ? "border-[var(--ink)]" : "border-[var(--line)]"}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void check(Array.from(event.dataTransfer.files));
      }}
    >
      <p className="text-lg">{labels.drop}</p>
      <label id="checker-input-label" htmlFor="checker-files" className="mt-4 block font-medium">{labels.input}</label>
      <input ref={input} id="checker-files" type="file" accept="image/*" multiple disabled={busy}
        className="mt-3 block w-full max-w-full text-sm file:mr-3 file:rounded file:border file:border-[var(--line)] file:px-4 file:py-2 focus-visible:outline-2 focus-visible:outline-offset-4"
        aria-describedby="checker-privacy"
        onChange={(event) => { void check(Array.from(event.currentTarget.files ?? [])); }} />
    </div>
    <div aria-live="polite" aria-atomic="true" role="status" className="mt-6">
      <p>{busy ? labels.checking : results.length ? `${labels.results} ${results.length}` : labels.empty}</p>
      {results.length > 0 && <>
        <p className="mt-2" data-testid="checker-duo-count">{labels.duoCount} {labels.outer}: {duo.counts["duo-outer"]}/10 · {labels.inner}: {duo.counts["duo-inner"]}/10</p>
        {duo.overLimit && <p className="mt-2 font-semibold" data-testid="checker-duo-limit">{labels.tooMany}</p>}
      </>}
    </div>
    <p className="mt-3 text-sm text-[var(--muted)]">{labels.duoRule}</p>
    <ul aria-label={labels.results} aria-live="polite" aria-relevant="additions" aria-busy={busy} className="mt-4 space-y-3">
      {results.map(({ name, inspection }, index) => {
        const match = inspection?.match;
        return <li key={index} data-testid="checker-result" className="rounded-lg border border-[var(--line)] p-4">
          <p className="font-semibold">{name}</p>
          {inspection ? <>
            <p className="mt-2 font-mono">{inspection.width} × {inspection.height} px</p>
            <p className="mt-2">{match
              ? `${match.producedByDuoShot ? labels.matched : labels.appleOnly} ${match.slot === "duo-outer" ? `iPhone Duo — ${labels.outer}` : match.slot === "duo-inner" ? `iPhone Duo — ${labels.inner}` : `iPhone ${formatInches(match.inches, locale)}`} · ${match.orientation === "portrait" ? labels.portrait : labels.landscape}`
              : labels.wrongSize}</p>
            <p className="mt-2">{inspection.transparent ? labels.transparent : inspection.alphaChannel ? labels.alpha : labels.opaque}</p>
            {!inspection.supportedFormat && <p className="mt-2">{labels.format}</p>}
          </> : <p className="mt-2">{labels.error}</p>}
        </li>;
      })}
    </ul>
    {results.length > 0 && <Button as="button" variant="secondary" className="mt-4" disabled={busy}
      onClick={() => { setResults([]); if (input.current) input.current.value = ""; }}>{labels.clear}</Button>}
  </section>;
}
