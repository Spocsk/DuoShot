import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { data: exported, error } = await supabase.from("export_sets")
    .select("storage_path, created_at, created_by, filename").eq("id", id).eq("created_by", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "DOWNLOAD_UNAVAILABLE" }, { status: 503 });
  if (!exported) return NextResponse.json({ error: "EXPORT_NOT_FOUND" }, { status: 404 });
  const remaining = Math.floor((new Date(exported.created_at).getTime() + 86_400_000 - Date.now()) / 1000);
  if (remaining <= 0) return NextResponse.json({ error: "EXPORT_EXPIRED" }, { status: 410 });
  if (!exported.storage_path?.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "EXPORT_NOT_FOUND" }, { status: 404 });
  }
  const ttl = Math.min(600, remaining);
  const { data, error: signError } = await supabase.storage.from("exports")
    .createSignedUrl(exported.storage_path, ttl, { download: exported.filename || "duoshot.zip" });
  if (signError || !data?.signedUrl) {
    const missing = signError && (signError.message === "Object not found" || ("statusCode" in signError && String(signError.statusCode) === "404"));
    return NextResponse.json({ error: missing ? "EXPORT_DELETED" : "DOWNLOAD_UNAVAILABLE" }, { status: missing ? 410 : 503 });
  }
  const headers = { "Cache-Control": "private, no-store" };
  if (new URL(request.url).searchParams.get("format") === "json") {
    return NextResponse.json({ url: data.signedUrl, expiresAt: new Date(Date.now() + ttl * 1000).toISOString() }, { headers });
  }
  return NextResponse.redirect(data.signedUrl, { status: 303, headers });
}
