import type JSZip from "jszip";
import sharp from "sharp";
import type { DbClient } from "../supabase/types";
import { completeRender, type RenderJob } from "../render/jobs";
import { DUO_SLOT_MAX } from "../duo-selection";
import { AscError } from "./client";
import { ASC_MAX_SCREENSHOTS_PER_SET } from "./config";
import { createAssetLibraryClient } from "./asset-library";
import { duoSlotLimit, expectedImageSpec, placementLimit, resolveDuoGroup, resolveImageGroup, type AssetLibraryRefData, type ImageSpec } from "./asset-library-refdata";
import type { AscCredentials } from "./jwt";
import { ASC_JOB_BUDGET_MS, ascTargetsForExport, type AscProgress, type AscUploadPayload, type PlannedFile, type UploadJobOptions } from "./upload-job";

const fail = (code: string) => Response.json({ error: code }, { status: 400 });

/** Asset Library strategy. The legacy executor keeps its existing transaction boundaries. */
export async function executeAssetLibraryUpload(input: {
  admin: DbClient; job: RenderJob; payload: AscUploadPayload; zip: JSZip; planned: PlannedFile[];
  credentials: AscCredentials; options: UploadJobOptions; started: number;
}): Promise<Response> {
  const { admin, job, payload, zip, planned, credentials, options, started } = input;
  const now = options.now ?? Date.now;
  const deadline = started + (options.budgetMs ?? ASC_JOB_BUDGET_MS);
  const checkDeadline = () => { if (now() >= deadline) throw new AscError("ASC_PROCESSING_TIMEOUT"); };
  const client = createAssetLibraryClient(credentials, { ...options, deadline });
  const cleanup = createAssetLibraryClient(credentials, { ...options, signal: undefined, requestTimeoutMs: 10_000 });
  const progress: AscProgress = { total: planned.length, done: 0,
    files: planned.map(({ slot, index, displayType }) => ({ slot, index, displayType, state: "pending" })) };
  const report = async () => {
    progress.done = progress.files.filter((file) => file.state === "complete" || file.state === "failed").length;
    const { error } = await admin.rpc("report_render_progress", { p_job: job.id, p_lease: job.lease_token, p_progress: structuredClone(progress) });
    if (error) console.warn("asc_progress_failed", { jobId: job.id });
  };
  const assetIds: string[] = [];
  const placements: { id: string; position: number }[] = [];
  let currentPosition: number | undefined;
  // Once ordering succeeds, cleanup must preserve replacements even if deleting
  // old placements or recording the result encounters a failure.
  let finalized = false;
  try {
    await report();
    checkDeadline();
    const duoCount = planned.filter((file) => file.slot !== "iphone-69").length;
    let ref: AssetLibraryRefData;
    try { ref = await client.getRefData(); } catch (error) {
      if (duoCount > DUO_SLOT_MAX) throw new Error("DUO_SLOT_LIMIT");
      throw error;
    }
    checkDeadline();
    const libraryId = await client.getAssetLibraryId(payload.appId);
    checkDeadline();
    await client.ensureVersionEditable(payload.localizationId);
    checkDeadline();
    const duoGroup = duoCount ? resolveDuoGroup(ref) : undefined;
    if (duoCount > duoSlotLimit(ref, duoGroup)) throw new Error("DUO_SLOT_LIMIT");

    const groups = new Map<string, { previous: string[]; positions: number[]; uploaded: string[] }>();
    const specs: { group: string; spec: ImageSpec & { specId: string } }[] = [];
    // Resolve specs from actual image bytes; every lookup and capacity check is
    // read-only and completes before the first reservation.
    for (const [position, file] of planned.entries()) {
      const metadata = await sharp(await zip.file(file.path)!.async("nodebuffer")).metadata();
      checkDeadline();
      if (!metadata.width || !metadata.height || !["png", "jpeg"].includes(metadata.format ?? "")) throw new AscError("ASC_INVALID");
      const group = file.slot === "iphone-69" ? resolveImageGroup(ref, metadata.width, metadata.height) : duoGroup!;
      // expectedImageSpec enforces the exact pixel size (min==max). Reject alpha
      // up front too: screenshot specs set alphaAllowed:false, and Apple only
      // surfaces the rejection after a wasted reservation and transfer.
      const spec = expectedImageSpec(ref, group, metadata.width, metadata.height);
      if (metadata.hasAlpha && spec.alphaAllowed !== true) throw new AscError("ASC_INVALID", 0, undefined, `Canal alpha interdit pour ${spec.shortName ?? spec.specId}.`);
      specs[position] = { group, spec };
      if (!groups.has(group)) groups.set(group, { previous: [], positions: [], uploaded: [] });
      groups.get(group)!.positions.push(position);
    }
    for (const [group, state] of groups) {
      state.previous = await client.listPlacements(payload.localizationId, group);
      checkDeadline();
      const limit = group === duoGroup ? duoSlotLimit(ref, group) : placementLimit(ref, group) ?? ASC_MAX_SCREENSHOTS_PER_SET;
      if (state.previous.length + state.positions.length > limit) throw new AscError("ASC_CONFLICT", 409, "SET_FULL");
    }

    for (const [position, file] of planned.entries()) {
      currentPosition = position;
      const progressFile = progress.files[position]!;
      progressFile.state = "uploading";
      await report();
      checkDeadline();
      const { group, spec } = specs[position]!;
      await client.uploadImage({ libraryId, fileName: file.fileName, bytes: await zip.file(file.path)!.async("uint8array"),
        refData: ref, group, expectedSpec: spec,
        timeoutMs: Math.max(0, deadline - now()),
        onReserved: (id) => { assetIds[position] = id; },
        onProcessing: async () => { progressFile.state = "processing"; await report(); },
      });
      checkDeadline();
    }
    // No placements until every image has processed with the intended spec.
    for (const [position, id] of assetIds.entries()) {
      checkDeadline();
      currentPosition = position;
      const group = specs[position]!.group;
      const placement = await client.createPlacement(payload.localizationId, group, id);
      placements.push({ id: placement, position });
      checkDeadline();
      groups.get(group)!.uploaded.push(placement);
      progress.files[position]!.state = "complete";
    }
    currentPosition = undefined;
    for (const [group, state] of groups) {
      checkDeadline();
      // Include old placements until success, so a failed order can roll back
      // without having removed any previous asset from the surface.
      const order = payload.replaceExisting ? [...state.uploaded, ...state.previous] : [...state.previous, ...state.uploaded];
      await client.setOrder(payload.localizationId, group, order);
      checkDeadline();
    }
    finalized = true;
    let replaced = 0;
    let reordered = true;
    if (payload.replaceExisting) {
      for (const state of groups.values()) for (const id of state.previous) {
        checkDeadline();
        try { await client.deletePlacement(id); replaced++; } catch { reordered = false; }
        checkDeadline();
      }
    }
    await report();
    const result = { appId: payload.appId, versionId: payload.versionId, localizationId: payload.localizationId,
      uploaded: assetIds.length, replaced, reordered, files: progress.files, skipped: ascTargetsForExport(true).skipped };
    try { await completeRender(admin, job, result); } catch (error) {
      if (error instanceof Error && error.message === "RENDER_LEASE_LOST") throw error;
      console.error("asc_result_commit_failed", { jobId: job.id });
      return fail("ASC_RETRY_UNSAFE");
    }
    return Response.json(result);
  } catch (error) {
    const leaseLost = error instanceof Error && error.message === "RENDER_LEASE_LOST";
    const code = error instanceof AscError ? error.appleCode === "SET_FULL" ? "ASC_SET_FULL" : error.code
      : leaseLost ? "RENDER_LEASE_LOST" : error instanceof Error && error.message === "DUO_SLOT_LIMIT" ? "DUO_SLOT_LIMIT" : "ASC_UPLOAD_FAILED";
    if (!finalized) {
      // A rejected reservation has no id to clean up, but its progress must still
      // be terminal, just like failures after a successful reservation.
      if (currentPosition !== undefined) {
        progress.files[currentPosition]!.state = "failed";
        progress.files[currentPosition]!.error = code;
      }
      for (const [position, id] of assetIds.entries()) {
        if (!id) continue;
        const file = progress.files[position]!;
        file.state = "failed";
        file.error = position === currentPosition ? code : "ASC_ROLLED_BACK";
      }
      for (const placement of placements) {
        try { await cleanup.deletePlacement(placement.id); } catch { progress.files[placement.position]!.error = "ASC_CLEANUP_FAILED"; }
      }
      for (const [position, id] of assetIds.entries()) {
        if (!id) continue;
        try { await cleanup.deleteImage(id); } catch { progress.files[position]!.error = "ASC_CLEANUP_FAILED"; }
      }
    }
    if (error instanceof AscError && (error.code === "ASC_SPEC_MISMATCH" || error.details)) {
      // Diagnostics stay on the server; the public response retains the stable code.
      console.error("asc_asset_library_failed", { jobId: job.id, code, message: error.message, stateDetails: error.details });
    }
    try { await report(); } catch { /* Keep the original failure. */ }
    if (leaseLost) return Response.json({ error: code }, { status: 409 });
    return fail(finalized ? "ASC_RETRY_UNSAFE" : code);
  }
}
