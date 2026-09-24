import { NextResponse } from "next/server";
import { resolveEntitlements } from "@/lib/billing";
import { mapLimit } from "@/lib/map-limit";
import { FREE_EXPORTS, PRO_DAILY_CAP, isProPlan } from "@/lib/plans";
import { hashFromBuffer } from "@/lib/pipeline/clone-hash";
import { slugify } from "@/lib/pipeline/geometry";
import { scorePair, worstCloneLabel, type CloneResult } from "@/lib/pipeline/clone-score";
import { composeZipImages } from "@/lib/pipeline/compose";
import { buildZip } from "@/lib/pipeline/zip";
import { checkSourceCount } from "@/lib/pipeline/validate";
import {
  DEFAULT_RENDER_OPTIONS,
  canUse69,
  targetsFor,
  type CropTransforms,
  type RenderOptions,
} from "@/lib/specs";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  paths?: string[];
  outerPaths?: string[];
  innerPaths?: string[];
  appName?: string;
  clientName?: string;
  include69?: boolean;
  assumeCloneRisk?: boolean;
  sameSet?: boolean;
  options?: Partial<RenderOptions>;
  transforms?: Partial<CropTransforms>;
};

async function downloadOwned(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string,
  storagePath: string,
) {
  if (!storagePath.startsWith(`${userId}/`)) {
    throw new Error("PATH_FORBIDDEN");
  }
  const { data: file, error } = await supabase.storage.from("uploads").download(storagePath);
  if (error || !file) {
    throw new Error("UPLOAD_MISSING");
  }
  return Buffer.from(await file.arrayBuffer());
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
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

  const { data: membership, error: memberError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (memberError || !membership) {
    return NextResponse.json({ error: "NO_WORKSPACE" }, { status: 400 });
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, client_slug, plan, manual_plan, free_exports_used, stripe_subscription_id, subscription_status")
    .eq("id", membership.workspace_id)
    .single();

  const entitlements = resolveEntitlements({
    freeExportsUsed: workspace?.free_exports_used ?? 0,
    workspacePlan: workspace?.plan,
    manualPlan: workspace?.manual_plan,
    subscriptionId: workspace?.stripe_subscription_id,
    subscriptionStatus: workspace?.subscription_status,
  });
  const options: RenderOptions = { ...DEFAULT_RENDER_OPTIONS, ...body.options, burnHinge: Boolean(body.options?.burnHinge) };
  const include69 = Boolean(body.include69);
  const pro = isProPlan(entitlements.plan);

  if (include69 && !canUse69(entitlements.plan)) {
    return NextResponse.json({ error: "IPHONE_69_GATED" }, { status: 403 });
  }

  if (!pro && (workspace?.free_exports_used ?? 0) >= FREE_EXPORTS) {
    return NextResponse.json({ error: "TRIAL_EXHAUSTED" }, { status: 402 });
  }

  if (pro) {
    const { data: countRow } = await supabase
      .from("daily_export_counts")
      .select("count")
      .eq("workspace_id", membership.workspace_id)
      .eq("day", new Date().toISOString().slice(0, 10))
      .maybeSingle();
    const used = countRow?.count ?? 0;
    if (used >= PRO_DAILY_CAP) {
      return NextResponse.json({ error: "DAILY_LIMIT" }, { status: 402 });
    }
  }

  let reservedFree = false;
  if (!pro) {
    const { data: consumed, error: consumeError } = await supabase.rpc("consume_free_export", {
      p_workspace_id: membership.workspace_id,
      p_limit: FREE_EXPORTS,
    });
    if (consumeError) {
      return NextResponse.json({ error: "EXPORT_FAILED" }, { status: 500 });
    }
    if (consumed === -1) {
      return NextResponse.json({ error: "TRIAL_EXHAUSTED" }, { status: 402 });
    }
    reservedFree = true;
  }

  try {
    targetsFor({
      orientation: options.orientation,
      include69,
      plan: entitlements.plan,
    });
  } catch (error) {
    if (reservedFree) {
      await supabase.rpc("refund_free_export", { p_workspace_id: membership.workspace_id });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TARGET_ERROR" },
      { status: 403 },
    );
  }

  try {
    const [outerBuffers, innerBuffers] = await Promise.all([
      mapLimit(outerPaths, 4, (storagePath) => downloadOwned(supabase, user.id, storagePath)),
      mapLimit(innerPaths, 4, (storagePath) => downloadOwned(supabase, user.id, storagePath)),
    ]);

    const pairCount = Math.min(outerBuffers.length, innerBuffers.length);
    const cloneScores: CloneResult[] = await mapLimit(
      Array.from({ length: pairCount }, (_, index) => index),
      4,
      async (index) =>
        scorePair(await hashFromBuffer(outerBuffers[index]!), await hashFromBuffer(innerBuffers[index]!), index, sameSet),
    );
    if (pro && worstCloneLabel(cloneScores) === "risk" && !body.assumeCloneRisk) {
      if (reservedFree) {
        await supabase.rpc("refund_free_export", { p_workspace_id: membership.workspace_id });
      }
      return NextResponse.json({ error: "CLONE_RISK", cloneScores }, { status: 403 });
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
    const zipBytes = new Uint8Array(zip);
    const exportsBucket = supabase.storage.from("exports");
    const { error: uploadError } = await exportsBucket.upload(zipPath, zipBytes, {
      contentType: "application/zip",
      upsert: false,
    });
    if (uploadError) throw new Error("STORAGE_UNAVAILABLE");
    const { data: stored, error: readError } = await exportsBucket.download(zipPath);
    if (readError || !stored || stored.size !== zipBytes.byteLength) throw new Error("STORAGE_UNAVAILABLE");
    const { data: signed, error: signError } = await exportsBucket.createSignedUrl(zipPath, 600, {
      download: `${slugify(appName) || "app"}.zip`,
    });
    if (signError || !signed?.signedUrl) throw new Error("STORAGE_UNAVAILABLE");
    const { error: recordError } = await supabase.from("export_sets").insert({
      workspace_id: membership.workspace_id,
      orientation: options.orientation,
      include_69: include69,
      fit_mode: options.fit,
      background_mode: options.background,
      format: options.format,
      image_count: count,
      storage_path: zipPath,
      created_by: user.id,
    });
    if (recordError) throw new Error("EXPORT_FAILED");
    if (pro) {
      const { error: incrementError } = await supabase.rpc("increment_daily_export", { p_workspace_id: membership.workspace_id });
      if (incrementError) throw new Error("EXPORT_FAILED");
    }

    const warning = unpaired ? "UNPAIRED" : countWarning ?? "";
    const filename = `${slugify(appName) || "app"}.zip`;
    return NextResponse.json({
      url: signed.signedUrl,
      filename,
      warning,
      images: images.map((image) => ({
        slot: image.spec.slot,
        index: image.index + 1,
        width: image.spec.width,
        height: image.spec.height,
        format: options.format,
      })),
    });
  } catch (error) {
    if (reservedFree) {
      await supabase.rpc("refund_free_export", { p_workspace_id: membership.workspace_id });
    }
    const code = error instanceof Error ? error.message : "EXPORT_FAILED";
    const status = code === "PATH_FORBIDDEN" ? 403 : code.endsWith("_FAILED") ? 500 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
