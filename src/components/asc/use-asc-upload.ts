"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AscApp = { id: string; name: string; bundleId: string };
export type AscVersion = { id: string; versionString: string; state: string; platform: string };
export type AscLocalization = { id: string; locale: string };
export type AscFileProgress = { slot: string; index: number; displayType: string; state: "pending" | "uploading" | "processing" | "complete" | "failed"; error?: string };
export type AscUploadResult = {
  appId?: string; uploaded: number; replaced?: number; reordered?: boolean; files: AscFileProgress[]; skipped: string[];
};
export type AscUploadState =
  | { phase: "idle" }
  | { phase: "queued" | "running"; progress?: { total: number; done: number; files: AscFileProgress[] } }
  | { phase: "completed"; result: AscUploadResult }
  | { phase: "failed"; error: string; progress?: { total: number; done: number; files: AscFileProgress[] } };

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "ASC_UNAVAILABLE");
  return payload;
}

/**
 * Client side of the App Store Connect upload for the tool: Apple lookups, then
 * a queued `asc_upload` job polled through /api/render-jobs/:id.
 */
export function useAscUpload() {
  const [state, setState] = useState<AscUploadState>({ phase: "idle" });
  /** Export the current state belongs to, so a newer export starts from idle. */
  const [exportId, setExportId] = useState<string | null>(null);
  const cancelled = useRef(false);

  const listApps = useCallback(async () => (await readJson<{ apps: AscApp[] }>(await fetch("/api/asc/apps"))).apps, []);
  const listVersions = useCallback(async (appId: string) =>
    (await readJson<{ versions: AscVersion[] }>(await fetch(`/api/asc/apps/${encodeURIComponent(appId)}/versions`))).versions, []);
  const listLocalizations = useCallback(async (versionId: string) =>
    (await readJson<{ localizations: AscLocalization[] }>(await fetch(`/api/asc/versions/${encodeURIComponent(versionId)}/localizations`))).localizations, []);

  const upload = useCallback(async (input: { exportId: string; appId: string; versionId: string; localizationId: string; replaceExisting?: boolean }) => {
    cancelled.current = false;
    setExportId(input.exportId);
    setState({ phase: "queued" });
    try {
      const { jobId } = await readJson<{ jobId: string }>(await fetch("/api/asc/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(input),
      }));
      const deadline = Date.now() + 31 * 60_000;
      while (!cancelled.current && Date.now() < deadline) {
        const response = await fetch(`/api/render-jobs/${jobId}`, { cache: "no-store" });
        if (response.status >= 500) { await new Promise((resolve) => setTimeout(resolve, 3000)); continue; }
        const payload = await readJson<{ state: string; error?: string; result?: unknown; progress?: { total: number; done: number; files: AscFileProgress[] } }>(response);
        if (payload.state === "completed") { setState({ phase: "completed", result: payload.result as AscUploadResult }); return; }
        if (payload.state === "failed") { setState({ phase: "failed", error: payload.error ?? "ASC_UPLOAD_FAILED", progress: payload.progress }); return; }
        setState({ phase: payload.state === "running" ? "running" : "queued", progress: payload.progress });
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      if (!cancelled.current) setState({ phase: "failed", error: "RENDER_PENDING" });
    } catch (error) {
      setState({ phase: "failed", error: error instanceof Error ? error.message : "ASC_UNAVAILABLE" });
    }
  }, []);

  const stop = useCallback(() => { cancelled.current = true; }, []);
  /** Back to idle after a finished or failed upload; a running job keeps being polled. */
  const reset = useCallback(() => {
    setState((current) => (current.phase === "completed" || current.phase === "failed" ? { phase: "idle" } : current));
  }, []);
  // The job keeps running server-side; only the polling stops with the component.
  useEffect(() => () => { cancelled.current = true; }, []);
  return { state, exportId, listApps, listVersions, listLocalizations, upload, stop, reset };
}
