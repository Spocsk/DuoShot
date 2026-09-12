import { NextResponse } from "next/server";
import { resolveEntitlements } from "@/lib/billing";
import { dailyLimitFor } from "@/lib/plans";
import { renderScreenshot } from "@/lib/pipeline/process";
import { buildZip, type ZipImage } from "@/lib/pipeline/zip";
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
  appName?: string;
  include69?: boolean;
  options?: Partial<RenderOptions>;
};

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
  const paths = body.paths ?? [];
  let countWarning: string | undefined;
  try {
    const checked = checkSourceCount(paths.length);
    if (checked.warning === "TOO_FEW") countWarning = "TOO_FEW";
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "INVALID_COUNT" },
      { status: 400 },
    );
  }

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
    .select("id, client_slug")
    .eq("id", membership.workspace_id)
    .single();

  const entitlements = await resolveEntitlements({
    email: user.email,
    workspaceId: membership.workspace_id,
  });
  const options: RenderOptions = { ...DEFAULT_RENDER_OPTIONS, ...body.options };
  const include69 = Boolean(body.include69);
  if (include69 && !canUse69(entitlements.plan)) {
    return NextResponse.json({ error: "IPHONE_69_GATED" }, { status: 403 });
  }

  const { data: countRow } = await supabase
    .from("daily_export_counts")
    .select("count")
    .eq("workspace_id", membership.workspace_id)
    .eq("day", new Date().toISOString().slice(0, 10))
    .maybeSingle();
  const used = countRow?.count ?? 0;
  if (used >= dailyLimitFor(entitlements.plan)) {
    return NextResponse.json({ error: "DAILY_LIMIT" }, { status: 402 });
  }

  let targets;
  try {
    targets = targetsFor({
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

  const zipImages: ZipImage[] = [];
  for (const [index, storagePath] of paths.entries()) {
    if (!storagePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "PATH_FORBIDDEN" }, { status: 403 });
    }
    const { data: file, error } = await supabase.storage.from("uploads").download(storagePath);
    if (error || !file) {
      return NextResponse.json({ error: "UPLOAD_MISSING" }, { status: 400 });
    }
    const input = Buffer.from(await file.arrayBuffer());
    for (const spec of targets) {
      const buffer = await renderScreenshot(input, spec, options);
      zipImages.push({ spec, index, buffer });
    }
  }

  const zip = await buildZip({
    appName: body.appName || "App",
    clientSlug: entitlements.plan === "studio" ? workspace?.client_slug : null,
    orientation: options.orientation,
    branded: entitlements.plan === "free",
    include69,
    format: options.format,
    images: zipImages,
  });

  const zipPath = `${user.id}/${crypto.randomUUID()}.zip`;
  const { error: zipError } = await supabase.storage.from("exports").upload(zipPath, zip, {
    contentType: "application/zip",
    upsert: true,
  });
  if (zipError) {
    return NextResponse.json({ error: "ZIP_UPLOAD_FAILED" }, { status: 500 });
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from("exports")
    .createSignedUrl(zipPath, SIGNED_URL_SECONDS);
  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: "SIGNED_URL_FAILED" }, { status: 500 });
  }

  await supabase.from("export_sets").insert({
    workspace_id: membership.workspace_id,
    orientation: options.orientation,
    include_69: include69,
    fit_mode: options.fit,
    background_mode: options.background,
    format: options.format,
    image_count: paths.length,
    storage_path: zipPath,
    created_by: user.id,
  });
  await supabase.rpc("increment_daily_export", { p_workspace_id: membership.workspace_id });

  return NextResponse.json({
    url: signed.signedUrl,
    warning: countWarning,
    expiresIn: SIGNED_URL_SECONDS,
  });
}
