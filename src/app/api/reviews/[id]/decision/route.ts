import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isDemoReview } from "@/lib/pipeline/harbor";
import { reviewState } from "@/lib/reviews";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const MAX_COMMENT_LENGTH = 2000;

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (isDemoReview(id)) {
    return NextResponse.json({ error: "DEMO_READONLY" }, { status: 403 });
  }
  const body = ((await request.json().catch(() => null)) ?? {}) as { action?: unknown; comment?: unknown };
  const status = body.action === "approve" ? "approved" : body.action === "redo" ? "changes_requested" : null;
  if (!status) return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  const comment = typeof body.comment === "string" ? body.comment.trim() || null : null;
  // Counted in code points to match the char_length CHECK on review_links.comment.
  if (comment && [...comment].length > MAX_COMMENT_LENGTH) {
    return NextResponse.json({ error: "COMMENT_TOO_LONG", max: MAX_COMMENT_LENGTH }, { status: 400 });
  }
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
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
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("public_id, status, comment")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(data);
}
