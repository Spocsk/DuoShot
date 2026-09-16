import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { harborReviewPayload, isDemoReview } from "@/lib/pipeline/harbor";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (isDemoReview(id)) {
    return NextResponse.json(harborReviewPayload(), {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  }
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "STORAGE_UNAVAILABLE" }, { status: 503 });
  const { data: review } = await admin
    .from("review_links")
    .select("public_id, set_name, client_name, orientation, status, comment")
    .eq("public_id", id)
    .maybeSingle();
  if (!review) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const { data: link } = await admin.from("review_links").select("id").eq("public_id", id).single();
  const { data: slides } = await admin
    .from("review_slides")
    .select("slide_index, clone_label")
    .eq("review_id", link?.id)
    .order("slide_index");
  return NextResponse.json({
    ...review,
    slides: (slides ?? []).map((slide) => ({
      index: slide.slide_index as number,
      clone: slide.clone_label as string,
      outer: `/api/reviews/${id}/media?slide=${slide.slide_index}&side=outer`,
      inner: `/api/reviews/${id}/media?slide=${slide.slide_index}&side=inner`,
    })),
  });
}
