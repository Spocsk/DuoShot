import { readRenderBody } from "./read-body";
import { renderSlots } from "@/lib/pipeline/render-slots";
import { NextResponse } from "next/server";
import { readWorkspaceBilling } from "@/lib/workspace-billing";
import { mapLimit } from "@/lib/map-limit";
import { FREE_EXPORTS, isProPlan } from "@/lib/plans";
import { hashFromBuffer } from "@/lib/pipeline/clone-hash";
import { slugify } from "@/lib/pipeline/geometry";
import { scorePair, worstCloneLabel, type CloneResult } from "@/lib/pipeline/clone-score";
import { composeZipImages } from "@/lib/pipeline/compose";
import { buildZip } from "@/lib/pipeline/zip";
import { loadSources } from "@/lib/pipeline/sources";
import { parseRenderBody, renderErrorStatus, type RenderBody } from "@/lib/pipeline/request";
import { MAX_ZIP_BYTES } from "@/lib/pipeline/limits";
import { checkSourceCount } from "@/lib/pipeline/validate";
import {
  DEFAULT_RENDER_OPTIONS,
  canUse69,
  targetsFor,
  type RenderOptions,
} from "@/lib/specs";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { publicSupabaseUrl } from "@/lib/supabase/server-env";
import { trackServerEvent } from "@/lib/analytics-server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { completeRender, type RenderJob } from "./jobs";

export async function executeExport(request: Request, supabase: SupabaseClient, user: { id: string }, job?: RenderJob) {
  let body: RenderBody;
  try { body = parseRenderBody(await readRenderBody(request), user.id); } catch (error) {
    const code = error instanceof SyntaxError ? "INVALID_REQUEST" : error instanceof Error ? error.message : "INVALID_REQUEST";
    return NextResponse.json({ error: code }, { status: renderErrorStatus(code) });
  }
  const sameSet = Boolean(body.sameSet);
  const outerPaths = body.outerPaths ?? body.paths ?? [];
  const innerPaths = sameSet ? outerPaths : (body.innerPaths ?? body.paths ?? []);
  const count = Math.max(outerPaths.length, innerPaths.length);
  let countWarning: string | undefined;
  try {
    const checked = checkSourceCount(count);
    if (checked.warning === "TOO_FEW") countWarning = "TOO_FEW";
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "INVALID_COUNT" },
      { status: 400 },
    );
  }
  if (outerPaths.length === 0 && innerPaths.length === 0) {
    return NextResponse.json({ error: "NO_IMAGES" }, { status: 400 });
  }
  const unpaired = outerPaths.length !== innerPaths.length && !sameSet;

  const context = await readWorkspaceBilling(supabase, user.id);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (job && context.membership.workspace_id !== job.workspace_id) return NextResponse.json({ error: "NO_WORKSPACE" }, { status: 409 });
  const { membership, workspace, entitlements } = context;
  const options: RenderOptions = { ...DEFAULT_RENDER_OPTIONS, ...body.options, burnHinge: Boolean(body.options?.burnHinge) };
  const include69 = Boolean(body.include69);
  const pro = isProPlan(entitlements.plan);

  if (include69 && !canUse69(entitlements.plan)) {
    return NextResponse.json({ error: "IPHONE_69_GATED" }, { status: 403 });
  }

  if (!job && !pro && (workspace?.free_exports_used ?? 0) >= FREE_EXPORTS) {
    return NextResponse.json({ error: "TRIAL_EXHAUSTED" }, { status: 402 });
  }

  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "EXPORT_UNAVAILABLE" }, { status: 503 });
  let reservation: string | null = job?.reservation_id ?? null;
  try {
    targetsFor({
      orientation: options.orientation,
      include69,
      plan: entitlements.plan,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TARGET_ERROR" },
      { status: 403 },
    );
  }

  let release: () => void;
  try { release = await renderSlots.acquire(request.signal); } catch (error) {
    const code = error instanceof Error ? error.message : "RENDER_BUSY";
    return NextResponse.json({ error: code }, { status: renderErrorStatus(code), headers: { "Retry-After": "5" } });
  }

  try {
    if (!reservation) {
      const { data: reserved, error: reserveError } = await admin.rpc("reserve_export", {
        p_workspace_id: membership.workspace_id, p_user_id: user.id,
      });
      if (reserveError || !reserved) {
        const code = ["TRIAL_EXHAUSTED", "DAILY_LIMIT"].find((value) => reserveError?.message?.includes(value));
        return NextResponse.json({ error: code ?? "EXPORT_UNAVAILABLE" }, { status: code ? 402 : 503 });
      }
      reservation = reserved as string;
    }
    const sources = await loadSources(supabase, user.id, [...outerPaths, ...innerPaths]);
    const outerBuffers = outerPaths.map((path) => sources.get(path)!);
    const innerBuffers = innerPaths.map((path) => sources.get(path)!);

    const pairCount = Math.min(outerBuffers.length, innerBuffers.length);
    const cloneScores: CloneResult[] = await mapLimit(
      Array.from({ length: pairCount }, (_, index) => index),
      4,
      async (index) =>
        scorePair(await hashFromBuffer(outerBuffers[index]!), await hashFromBuffer(innerBuffers[index]!), index, sameSet),
    );
    if (pro && worstCloneLabel(cloneScores) === "risk" && !body.assumeCloneRisk) {
      throw new Error("CLONE_RISK");
    }

    const { images, flattenAlpha, compositionWarnings } = await composeZipImages({
      outerBuffers,
      innerBuffers,
      options,
      include69,
      plan: entitlements.plan,
      transforms: body.transforms,
    });

    const clientSlug = pro
      ? body.clientName?.trim() || (entitlements.plan === "studio" ? workspace?.client_slug : null) || null
      : null;

    const appName = body.appName || "App";
    const zip = await buildZip({
      appName,
      clientSlug,
      orientation: options.orientation,
      branded: !pro,
      include69,
      format: options.format,
      images,
      cloneScores,
      unpaired,
      flattenAlpha,
      compositionWarnings,
    });

    const zipPath = `${user.id}/${crypto.randomUUID()}.zip`;
    if (zip.byteLength > MAX_ZIP_BYTES) throw new Error("EXPORT_TOO_LARGE");
    const zipBytes = zip;
    const exportsBucket = supabase.storage.from("exports");
    const { error: uploadError } = await exportsBucket.upload(zipPath, zipBytes, {
      contentType: "application/zip",
      upsert: false,
    });
    if (uploadError) {
      console.error("export_storage_upload_failed", { bytes: zipBytes.byteLength, message: uploadError.message });
      throw new Error(/size|too large|payload/i.test(uploadError.message) ? "EXPORT_TOO_LARGE" : "STORAGE_UNAVAILABLE");
    }
    const { data: stored, error: readError } = await exportsBucket.info(zipPath);
    if (readError || !stored || stored.size !== zipBytes.byteLength) {
      console.error("export_storage_verify_failed", { bytes: zipBytes.byteLength, storedBytes: stored?.size, message: readError?.message });
      throw new Error("STORAGE_UNAVAILABLE");
    }
    const { data: signed, error: signError } = await exportsBucket.createSignedUrl(zipPath, 600, {
      download: `${slugify(appName) || "app"}.zip`,
    });
    if (signError || !signed?.signedUrl) throw new Error("STORAGE_UNAVAILABLE");
    const filename = `${slugify(appName) || "app"}.zip`;
    const warning = unpaired ? "UNPAIRED" : countWarning ?? "";
    const result = {
      exportId: reservation,
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      url: publicSupabaseUrl(signed.signedUrl),
      filename,
      warning,
      images: images.map((image) => ({
        slot: image.spec.slot,
        index: image.index + 1,
        width: image.spec.width,
        height: image.spec.height,
        format: options.format,
      })),
    };
    const exported = {
        orientation: options.orientation, include_69: include69, fit_mode: options.fit,
        background_mode: options.background, format: options.format, image_count: count,
        storage_path: zipPath, filename,
      };
    if (job) await completeRender(admin, job, result, exported);
    else {
      const { error } = await admin.rpc("finish_export", { p_reservation: reservation, p_export: exported });
      if (error) throw new Error("EXPORT_FAILED");
    }
    await trackServerEvent(supabase, user.id, "export_succeeded", zipPath, {
      plan: entitlements.plan,
      image_count: count,
      include_69: include69,
      format: options.format,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (reservation && !job) {
      const { error: refundError } = await admin.rpc("finish_export", { p_reservation: reservation, p_export: null });
      if (refundError) console.error("export_refund_failed", { reservation });
    }
    const code = error instanceof Error ? error.message : "EXPORT_FAILED";
    const status = renderErrorStatus(code);
    return NextResponse.json({ error: code }, { status });
  } finally {
    release();
  }
}
