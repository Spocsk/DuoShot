import { NextResponse } from "next/server";
import { createAdminSupabase, createPublicSupabase, createReviewWriter } from "@/lib/supabase/admin";
import { harborReviewPayload, isDemoReview } from "@/lib/pipeline/harbor";
import { createServerSupabase } from "@/lib/supabase/server";
import { reviewState } from "@/lib/reviews";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type ReviewRow = {
  id: string;
  public_id: string;
  set_name: string;
  client_name: string | null;
  orientation: string;
  status: string | null;
  comment: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

type SlideRow = { slide_index: number; clone_label: string };

function reviewJson(id: string, review: ReviewRow, slides: SlideRow[]) {
  const state = reviewState(review);
  if (state.expired || state.revoked) {
    return NextResponse.json({ ...review, ...state, slides: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({
    ...review,
    ...state,
    slides: slides.map((slide) => ({
      index: slide.slide_index,
      clone: slide.clone_label,
      outer: `/api/reviews/${id}/media?slide=${slide.slide_index}&side=outer`,
      inner: `/api/reviews/${id}/media?slide=${slide.slide_index}&side=inner`,
    })),
  });
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (isDemoReview(id)) {
    return NextResponse.json(await harborReviewPayload(), {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  }
  const admin = createAdminSupabase();
  if (admin) {
    const { data: review } = await admin
      .from("review_links")
      .select("id, public_id, set_name, client_name, orientation, status, comment, expires_at, revoked_at")
      .eq("public_id", id)
      .maybeSingle();
    if (!review) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const { data: slides } = await admin
      .from("review_slides")
      .select("slide_index, clone_label")
      .eq("review_id", review.id)
      .order("slide_index");
    return reviewJson(id, review as ReviewRow, (slides ?? []) as SlideRow[]);
  }

  const { data } = await createPublicSupabase().rpc("get_review_payload", { pid: id });
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const payload = data as ReviewRow & { slides?: SlideRow[] };
  if (!payload.public_id) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return reviewJson(id, payload, payload.slides ?? []);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  if (isDemoReview(id)) return NextResponse.json({ error: "DEMO_READONLY" }, { status: 403 });
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const writer = createReviewWriter(supabase);
  const revokedAt = new Date().toISOString();
  const { data, error } = await writer
    .from("review_links")
    .update({ status: "revoked", revoked_at: revokedAt, updated_at: revokedAt })
    .eq("public_id", id)
    .eq("workspace_id", membership.workspace_id)
    .select("public_id")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const { data: objects } = await writer.storage.from("reviews").list(id, { limit: 100 });
  if (objects?.length) {
    await writer.storage.from("reviews").remove(objects.map((object) => `${id}/${object.name}`));
  }
  return NextResponse.json({ id, status: "revoked", revokedAt });
}
