import { NextResponse } from "next/server";
import { resolveEntitlements } from "@/lib/billing";
import { FREE_EXPORTS, PRO_DAILY_CAP, isProPlan } from "@/lib/plans";
import { hashFromBuffer } from "@/lib/pipeline/clone-hash";
import { scorePair, worstCloneLabel, type CloneResult } from "@/lib/pipeline/clone-score";
import { composeZipImages } from "@/lib/pipeline/compose";
import { buildZip } from "@/lib/pipeline/zip";
import { checkSourceCount } from "@/lib/pipeline/validate";
import {
  DEFAULT_RENDER_OPTIONS,
  SIGNED_URL_SECONDS,
  canUse69,
  targetsFor,
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
    .limit(1)
    .maybeSingle();
  if (memberError || !membership) {
    return NextResponse.json({ error: "NO_WORKSPACE" }, { status: 400 });
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, client_slug, free_exports_used")
    .eq("id", membership.workspace_id)
    .single();

  const entitlements = await resolveEntitlements({
    email: user.email,
    workspaceId: membership.workspace_id,
    freeExportsUsed: workspace?.free_exports_used ?? 0,
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
    const outerBuffers: Buffer[] = [];
    const innerBuffers: Buffer[] = [];
    for (const storagePath of outerPaths) {
      outerBuffers.push(await downloadOwned(supabase, user.id, storagePath));
    }
    for (const storagePath of innerPaths) {
      innerBuffers.push(await downloadOwned(supabase, user.id, storagePath));
    }

    const pairCount = Math.min(outerBuffers.length, innerBuffers.length);
    const cloneScores: CloneResult[] = [];
    for (let index = 0; index < pairCount; index += 1) {
      cloneScores.push(
        scorePair(await hashFromBuffer(outerBuffers[index]!), await hashFromBuffer(innerBuffers[index]!), index, sameSet),
      );
    }
    if (pro && worstCloneLabel(cloneScores) === "risk" && !body.assumeCloneRisk) {
      if (reservedFree) {
        await supabase.rpc("refund_free_export", { p_workspace_id: membership.workspace_id });
      }
      return NextResponse.json({ error: "CLONE_RISK", cloneScores }, { status: 403 });
    }

    const { images, flattenAlpha } = await composeZipImages({
      outerBuffers,
      innerBuffers,
      options,
      include69,
      plan: entitlements.plan,
    });

    const clientSlug = pro
      ? body.clientName?.trim() || (entitlements.plan === "studio" ? workspace?.client_slug : null) || null
      : null;

    const zip = await buildZip({
      appName: body.appName || "App",
      clientSlug,
      orientation: options.orientation,
      branded: !pro,
      include69,
      format: options.format,
      images,
      cloneScores,
      unpaired,
      flattenAlpha,
    });

    const zipPath = `${user.id}/${crypto.randomUUID()}.zip`;
    const { error: zipError } = await supabase.storage.from("exports").upload(zipPath, zip, {
      contentType: "application/zip",
      upsert: true,
    });
    if (zipError) {
      throw new Error("ZIP_UPLOAD_FAILED");
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from("exports")
      .createSignedUrl(zipPath, SIGNED_URL_SECONDS);
    if (signedError || !signed?.signedUrl) {
      throw new Error("SIGNED_URL_FAILED");
    }

    await supabase.from("export_sets").insert({
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
    if (pro) {
      await supabase.rpc("increment_daily_export", { p_workspace_id: membership.workspace_id });
    }

    return NextResponse.json({
      url: signed.signedUrl,
      warning: unpaired ? "UNPAIRED" : countWarning,
      cloneScores,
      expiresIn: SIGNED_URL_SECONDS,
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
