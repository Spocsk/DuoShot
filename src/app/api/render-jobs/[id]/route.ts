import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { publicSupabaseUrl } from "@/lib/supabase/server-env";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  // Verify the signature with Supabase's cached JWKS; row ownership remains
  // enforced by both RLS and the explicit user filter below.
  const { data: identity, error: authError } = await supabase.auth.getClaims();
  const userId = identity?.claims.sub;
  if (authError || typeof userId !== "string") return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!/^[a-f0-9-]{36}$/i.test(id)) return NextResponse.json({ error: "RENDER_NOT_FOUND" }, { status: 404 });
  const { data: job, error } = await supabase.from("render_jobs")
    .select("state, kind, result, error_code, reservation_id").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) return NextResponse.json({ error: "RENDER_UNAVAILABLE" }, { status: 503 });
  if (!job) return NextResponse.json({ error: "RENDER_NOT_FOUND" }, { status: 404 });
  const headers = { "Cache-Control": "private, no-store" };
  if (job.state === "failed") return NextResponse.json({ state: job.state, error: job.error_code }, { headers });
  if (job.state !== "completed") return NextResponse.json({ state: job.state }, { headers });
  const result = { ...job.result };
  if (job.kind === "export") {
    const { data: exported, error: readError } = await supabase.from("export_sets").select("storage_path,filename,created_at")
      .eq("id", job.reservation_id).eq("created_by", userId).maybeSingle();
    if (readError) return NextResponse.json({ error: "DOWNLOAD_UNAVAILABLE" }, { status: 503 });
    const remaining = exported ? Math.floor((Date.parse(exported.created_at) + 86_400_000 - Date.now()) / 1000) : 0;
    if (!exported || remaining <= 0) return NextResponse.json({ state: "failed", error: "EXPORT_EXPIRED" }, { headers });
    const ttl = Math.min(600, remaining);
    const { data: signed, error: signError } = await supabase.storage.from("exports").createSignedUrl(exported.storage_path, ttl, { download: exported.filename });
    if (signError || !signed) return NextResponse.json({ error: "DOWNLOAD_UNAVAILABLE" }, { status: 503 });
    result.url = publicSupabaseUrl(signed.signedUrl);
    result.expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  }
  return NextResponse.json({ state: "completed", result }, { headers });
}
