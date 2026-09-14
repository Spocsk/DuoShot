import { NextResponse } from "next/server";
import sharp from "sharp";
import { resolveEntitlements } from "@/lib/billing";
import { hashFromBuffer } from "@/lib/pipeline/clone-hash";
import { scorePair, type CloneLabel } from "@/lib/pipeline/clone-score";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  outerPaths?: string[];
  innerPaths?: string[];
  sameSet?: boolean;
  appName?: string;
  clientName?: string;
  orientation?: "portrait" | "landscape";
};

async function previewJpeg(input: Buffer) {
  return sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: 720, withoutEnlargement: true })
    .jpeg({ quality: 72 })
    .toBuffer();
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "NO_WORKSPACE" }, { status: 400 });

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("free_exports_used")
    .eq("id", membership.workspace_id)
    .maybeSingle();
  const entitlements = await resolveEntitlements({
    email: user.email,
    workspaceId: membership.workspace_id,
    freeExportsUsed: workspace?.free_exports_used ?? 0,
  });
  if (entitlements.plan !== "studio") {
    return NextResponse.json({ error: "STUDIO_REQUIRED" }, { status: 403 });
  }

  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "STORAGE_UNAVAILABLE" }, { status: 503 });

  const body = (await request.json()) as Body;
  const sameSet = Boolean(body.sameSet);
  const outerPaths = body.outerPaths ?? [];
  const innerPaths = sameSet ? outerPaths : (body.innerPaths ?? []);
  if (outerPaths.length === 0 || innerPaths.length === 0) {
    return NextResponse.json({ error: "NO_IMAGES" }, { status: 400 });
  }

  const publicId = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const setName = body.appName?.trim() || "App";
  const { data: review, error: reviewError } = await admin
    .from("review_links")
    .insert({
      public_id: publicId,
      workspace_id: membership.workspace_id,
      set_name: setName,
      client_name: body.clientName?.trim() || null,
      orientation: body.orientation === "landscape" ? "landscape" : "portrait",
      created_by: user.id,
    })
    .select("id, public_id")
    .single();
  if (reviewError || !review) {
    return NextResponse.json({ error: "REVIEW_CREATE_FAILED" }, { status: 500 });
  }

  const pairCount = Math.min(outerPaths.length, innerPaths.length);
  for (let index = 0; index < pairCount; index += 1) {
    const outerPath = outerPaths[index]!;
    const innerPath = innerPaths[index]!;
    if (!outerPath.startsWith(`${user.id}/`) || !innerPath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: "PATH_FORBIDDEN" }, { status: 403 });
    }
    const [outerFile, innerFile] = await Promise.all([
      supabase.storage.from("uploads").download(outerPath),
      supabase.storage.from("uploads").download(innerPath),
    ]);
    if (outerFile.error || innerFile.error || !outerFile.data || !innerFile.data) {
      return NextResponse.json({ error: "UPLOAD_MISSING" }, { status: 400 });
    }
    const outerBuf = Buffer.from(await outerFile.data.arrayBuffer());
    const innerBuf = Buffer.from(await innerFile.data.arrayBuffer());
    const clone = scorePair(await hashFromBuffer(outerBuf), await hashFromBuffer(innerBuf), index, sameSet);
    const seq = String(index + 1).padStart(2, "0");
    const outKey = `${publicId}/${seq}-outer.jpg`;
    const inKey = `${publicId}/${seq}-inner.jpg`;
    const [outerJpeg, innerJpeg] = await Promise.all([previewJpeg(outerBuf), previewJpeg(innerBuf)]);
    const upOuter = await admin.storage.from("reviews").upload(outKey, outerJpeg, {
      contentType: "image/jpeg",
      upsert: true,
    });
    const upInner = await admin.storage.from("reviews").upload(inKey, innerJpeg, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (upOuter.error || upInner.error) {
      return NextResponse.json({ error: "REVIEW_UPLOAD_FAILED" }, { status: 500 });
    }
    await admin.from("review_slides").insert({
      review_id: review.id,
      slide_index: index,
      outer_path: outKey,
      inner_path: inKey,
      clone_label: clone.label as CloneLabel,
    });
  }

  return NextResponse.json({ id: publicId, url: `/r/${publicId}` });
}

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return NextResponse.json({ reviews: [] });
  const { data } = await supabase
    .from("review_links")
    .select("public_id, set_name, status, comment, created_at")
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: false })
    .limit(20);
  return NextResponse.json({ reviews: data ?? [] });
}
