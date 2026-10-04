import JSZip from "jszip";
import type { DbClient } from "@/lib/supabase/types";
import type { DeviceSlot, Orientation } from "../specs";
import { completeRender, type RenderJob } from "../render/jobs";
import { AscError, createAscClient, isAscId, md5Hex, type AscClientOptions } from "./client";
import { ASC_MAX_SCREENSHOTS_PER_SET, ASC_PREFERRED_69_SIZE, displayTypeFor } from "./config";
import { loadAscCredentials } from "./credentials";
import { readWorkspaceBilling } from "../workspace-billing";
import { isProPlan } from "../plans";

export type AscTarget = { slot: DeviceSlot; displayType: string };

/** Queued with kind `asc_upload`; the files come from an export ZIP already rendered for the workspace. */
export type AscUploadPayload = {
  exportId: string;
  appId: string;
  versionId: string;
  localizationId: string;
  /** Delete the screenshots already in each target set before uploading. */
  replaceExisting: boolean;
  /** Display mapping snapshotted at enqueue time from ASC_DISPLAY_TYPES. */
  targets: AscTarget[];
};

export type AscFileState = "pending" | "uploading" | "processing" | "complete" | "failed";
export type AscFileProgress = { slot: DeviceSlot; index: number; displayType: string; state: AscFileState; error?: string };
export type AscProgress = { total: number; done: number; files: AscFileProgress[] };

const SLOTS: DeviceSlot[] = ["duo-outer", "duo-inner", "iphone-69"];
const UUID = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
/** The worker route may run 15 minutes; leave room to commit the result. */
export const ASC_JOB_BUDGET_MS = 10 * 60_000;
/** ZIPs and sources are purged after 24 hours. */
export const EXPORT_MAX_AGE_MS = 24 * 3_600_000;
/** Rollback deletes run after an abort, so they get their own short timeout. */
const CLEANUP_TIMEOUT_MS = 10_000;

export function parseAscUploadPayload(input: unknown): AscUploadPayload {
  const value = input as Partial<AscUploadPayload> | null;
  if (!value || typeof value !== "object") throw new Error("INVALID_REQUEST");
  if (typeof value.exportId !== "string" || !UUID.test(value.exportId)) throw new Error("INVALID_REQUEST");
  for (const id of [value.appId, value.versionId, value.localizationId]) if (!isAscId(id)) throw new Error("INVALID_REQUEST");
  if (!Array.isArray(value.targets) || !value.targets.length || value.targets.length > SLOTS.length) throw new Error("INVALID_REQUEST");
  const targets = value.targets.map((target) => {
    if (!target || !SLOTS.includes(target.slot) || target.displayType !== displayTypeFor(target.slot)) throw new Error("INVALID_REQUEST");
    return { slot: target.slot, displayType: target.displayType };
  });
  if (new Set(targets.map((target) => target.slot)).size !== targets.length) throw new Error("INVALID_REQUEST");
  return {
    exportId: value.exportId, appId: value.appId!, versionId: value.versionId!, localizationId: value.localizationId!,
    replaceExisting: value.replaceExisting === true, targets,
  };
}

/** Slots of an export that App Store Connect can receive today, and those it cannot. */
export function ascTargetsForExport(include69: boolean): { targets: AscTarget[]; skipped: DeviceSlot[] } {
  const present: DeviceSlot[] = include69 ? SLOTS : ["duo-outer", "duo-inner"];
  const targets: AscTarget[] = [];
  const skipped: DeviceSlot[] = [];
  for (const slot of present) {
    const displayType = displayTypeFor(slot);
    if (displayType) targets.push({ slot, displayType }); else skipped.push(slot);
  }
  return { targets, skipped };
}

export type PlannedFile = { slot: DeviceSlot; index: number; displayType: string; fileName: string; path: string };

/**
 * Picks the ZIP entries for each target, in slide order. Paths look like
 * `[client/]app/<slot>-<orientation>/[WxH/]NN.png`; 6.9" keeps only the largest size.
 */
export function planAscFiles(paths: string[], targets: AscTarget[]): PlannedFile[] {
  const planned: PlannedFile[] = [];
  for (const target of targets) {
    const files: PlannedFile[] = [];
    for (const path of paths) {
      const parts = path.split("/");
      const folder = parts.findIndex((part) => /^(duo-outer|duo-inner|iphone-69)-(portrait|landscape)$/.test(part));
      if (folder < 0 || !parts[folder]!.startsWith(`${target.slot}-`)) continue;
      const orientation = parts[folder]!.slice(target.slot.length + 1) as Orientation;
      const rest = parts.slice(folder + 1);
      if (target.slot === "iphone-69" ? rest.length !== 2 || rest[0] !== ASC_PREFERRED_69_SIZE[orientation] : rest.length !== 1) continue;
      const match = /^(\d{2})\.(png|jpg)$/.exec(rest.at(-1)!);
      if (!match) continue;
      const index = Number(match[1]);
      files.push({ slot: target.slot, index, displayType: target.displayType, path, fileName: `duoshot-${parts[folder]}-${match[1]}.${match[2]}` });
    }
    files.sort((a, b) => a.index - b.index);
    planned.push(...files.slice(0, ASC_MAX_SCREENSHOTS_PER_SET));
  }
  return planned;
}

type Options = AscClientOptions & { budgetMs?: number };
const fail = (code: string) => Response.json({ error: code }, { status: 400 });

/**
 * Worker entry for `asc_upload`. Returns a Response like the other executors:
 * success commits the job; an error response is committed by the worker.
 */
export async function executeAscUpload(admin: DbClient, job: RenderJob, options: Options = {}): Promise<Response> {
  // A reclaimed attempt cannot know which screenshots Apple already accepted;
  // retrying would duplicate them in the user's listing.
  if ((job.attempts ?? 1) > 1) return fail("ASC_RETRY_UNSAFE");
  let payload: AscUploadPayload;
  try { payload = parseAscUploadPayload(job.payload); } catch { return fail("INVALID_REQUEST"); }
  const now = options.now ?? Date.now;
  const started = now();

  // The job may have waited in the queue: membership, plan and role are checked again now.
  const billing = await readWorkspaceBilling(admin, job.user_id);
  if (!billing.ok) return fail(billing.error);
  if (billing.membership.workspace_id !== job.workspace_id) return fail("NO_WORKSPACE");
  if (!isProPlan(billing.entitlements.plan)) return fail("PAID_PLAN_REQUIRED");
  if (payload.replaceExisting && billing.membership.role !== "owner") return fail("OWNER_REQUIRED");

  const { data: exported, error: exportError } = await admin.from("export_sets")
    .select("storage_path, created_at").eq("id", payload.exportId).eq("workspace_id", job.workspace_id).maybeSingle();
  if (exportError) return fail("ASC_UNAVAILABLE");
  if (!exported?.storage_path || now() - Date.parse(exported.created_at) > EXPORT_MAX_AGE_MS) return fail("EXPORT_EXPIRED");
  const { data: blob, error: downloadError } = await admin.storage.from("exports").download(exported.storage_path);
  if (downloadError || !blob) return fail("EXPORT_EXPIRED");
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const planned = planAscFiles(Object.keys(zip.files).filter((path) => !zip.files[path]!.dir), payload.targets);
  if (!planned.length) return fail("NOTHING_TO_UPLOAD");

  let credentials;
  try { credentials = await loadAscCredentials(admin, job.workspace_id); } catch (error) {
    return fail(error instanceof Error && error.message === "ASC_KEY_UNREADABLE" ? "ASC_KEY_UNREADABLE" : "ASC_UNAVAILABLE");
  }
  if (!credentials) return fail("ASC_NOT_CONNECTED");
  const client = createAscClient(credentials, options);
  // Rollback must still reach Apple after the heartbeat aborted the job: no abort
  // signal, short per-request timeout.
  const cleanup = createAscClient(credentials, { ...options, signal: undefined, requestTimeoutMs: CLEANUP_TIMEOUT_MS });

  const progress: AscProgress = {
    total: planned.length, done: 0,
    files: planned.map(({ slot, index, displayType }) => ({ slot, index, displayType, state: "pending" })),
  };
  const report = async () => {
    progress.done = progress.files.filter((file) => file.state === "complete" || file.state === "failed").length;
    const { error } = await admin.rpc("report_render_progress", { p_job: job.id, p_lease: job.lease_token, p_progress: structuredClone(progress) });
    if (error) console.warn("asc_progress_failed", { jobId: job.id });
  };

  const assetIds: string[] = [];
  try {
    await report();
    // Capacity first, read-only: Apple holds at most ten screenshots per set and the
    // previous ones are only removed after the new ones are live, so both must fit.
    const sets = new Map<DeviceSlot, { id: string | null; displayType: string; previous: string[]; uploaded: string[] }>();
    for (const target of payload.targets) {
      const incoming = planned.filter((file) => file.slot === target.slot).length;
      if (!incoming) continue;
      const id = await client.findScreenshotSet(payload.localizationId, target.displayType);
      const previous = id ? await client.listScreenshotIds(id) : [];
      if (previous.length + incoming > ASC_MAX_SCREENSHOTS_PER_SET) throw new AscError("ASC_CONFLICT", 409, "SET_FULL");
      sets.set(target.slot, { id, displayType: target.displayType, previous, uploaded: [] });
    }
    for (const set of sets.values()) set.id ??= await client.ensureScreenshotSet(payload.localizationId, set.displayType);

    for (const [position, file] of planned.entries()) {
      const set = sets.get(file.slot)!;
      progress.files[position]!.state = "uploading";
      await report();
      const bytes = new Uint8Array(await zip.file(file.path)!.async("uint8array"));
      const { id, operations } = await client.reserveScreenshot(set.id!, file.fileName, bytes.byteLength);
      // Known from the reservation on, so a failure can remove it from the user's set.
      assetIds[position] = id;
      await client.uploadParts(operations, bytes);
      await client.commitScreenshot(id, md5Hex(bytes));
      set.uploaded.push(id);
      progress.files[position]!.state = "processing";
    }
    await report();

    const budget = (options.budgetMs ?? ASC_JOB_BUDGET_MS) - (now() - started);
    const states = await client.waitForScreenshots(assetIds, {
      timeoutMs: Math.max(0, budget),
      onState: (id, state) => {
        const file = progress.files[assetIds.indexOf(id)]!;
        file.state = state === "COMPLETE" ? "complete" : "failed";
        if (state === "FAILED") file.error = "ASC_PROCESSING_FAILED";
      },
    });
    const failed = Object.values(states).filter((state) => state !== "COMPLETE");
    if (failed.length) throw new AscError(failed.includes("FAILED") ? "ASC_PROCESSING_FAILED" : "ASC_PROCESSING_TIMEOUT");
    await report();

    // The new set is live: only now remove what it replaces, then make the order explicit
    // (kept shots first, then ours by slide index).
    let replaced = 0;
    let reordered = true;
    for (const set of sets.values()) {
      if (payload.replaceExisting) {
        for (const id of set.previous) {
          try { await client.deleteScreenshot(id); replaced++; } catch { reordered = false; }
        }
      }
      const order = payload.replaceExisting ? set.uploaded : [...set.previous, ...set.uploaded];
      try { await client.reorderScreenshots(set.id!, order); } catch { reordered = false; }
    }
    const result = {
      appId: payload.appId, versionId: payload.versionId, localizationId: payload.localizationId,
      uploaded: assetIds.length, replaced, reordered, files: progress.files,
      skipped: ascTargetsForExport(true).skipped,
    };
    await completeRender(admin, job, result);
    return Response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "RENDER_LEASE_LOST") return Response.json({ error: "RENDER_LEASE_LOST" }, { status: 409 });
    const code = error instanceof AscError
      ? (error.appleCode === "SET_FULL" ? "ASC_SET_FULL" : error.code)
      : "ASC_UPLOAD_FAILED";
    // All or nothing: remove every asset this job created (stuck reservations, FAILED
    // or slow ones too) so a retry neither duplicates screenshots nor fills the set.
    // The previous screenshots were never touched.
    for (const [position, id] of assetIds.entries()) {
      if (!id) continue;
      const file = progress.files[position]!;
      // The file that broke keeps the job's code; still-processing files timed out; the rest were rolled back.
      if (file.state === "uploading" || (file.state === "processing" && code === "ASC_PROCESSING_TIMEOUT")) file.error = code;
      else if (file.state !== "failed") file.error = "ASC_ROLLED_BACK";
      file.state = "failed";
      try { await cleanup.deleteScreenshot(id); } catch { file.error = "ASC_CLEANUP_FAILED"; }
    }
    try { await report(); } catch { /* the failure code below is what matters */ }
    if (!(error instanceof AscError)) console.error("asc_upload_failed", { jobId: job.id, message: error instanceof Error ? error.message : String(error) });
    return fail(code);
  }
}
