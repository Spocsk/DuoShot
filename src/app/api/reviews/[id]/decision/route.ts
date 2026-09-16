import { NextResponse } from "next/server";
import { createAdminSupabase, createPublicSupabase } from "@/lib/supabase/admin";
import { isDemoReview } from "@/lib/pipeline/harbor";
import { reviewState } from "@/lib/reviews";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (isDemoReview(id)) {
    return NextResponse.json({ error: "DEMO_READONLY" }, { status: 403 });
  }
  const body = (await request.json()) as { action?: string; comment?: string };
  const status = body.action === "approve" ? "approved" : body.action === "redo" ? "changes_requested" : null;
  if (!status) return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  const comment = body.comment?.trim() || null;
  const admin = createAdminSupabase();
  if (admin) {
    const { data: review } = await admin
      .from("review_links")
      .select("status, expires_at, revoked_at")
      .eq("public_id", id)
      .maybeSingle();
    if (!review) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const state = reviewState(review);
    if (state.expired || state.revoked) {
      return NextResponse.json({ error: state.status.toUpperCase() }, { status: 410 });
    }
    const { data, error } = await admin
      .from("review_links")
      .update({
        status,
        comment,
        updated_at: new Date().toISOString(),
      })
      .eq("public_id", id)
      .select("public_id, status, comment")
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json(data);
  }

  const { data } = await createPublicSupabase().rpc("submit_review_decision", {
    pid: id,
    new_status: status,
    new_comment: comment,
  });
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const payload = data as { error?: string; public_id?: string; status?: string; comment?: string | null };
  if (payload.error === "NOT_FOUND") return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (payload.error === "REVOKED" || payload.error === "EXPIRED") {
    return NextResponse.json({ error: payload.error }, { status: 410 });
  }
  if (payload.error) return NextResponse.json({ error: payload.error }, { status: 400 });
  return NextResponse.json({
    public_id: payload.public_id ?? id,
    status: payload.status ?? status,
    comment: payload.comment ?? comment,
  });
}
