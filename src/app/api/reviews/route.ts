import { executeReview } from "@/lib/render/review";
import { enqueueRender } from "@/lib/render/enqueue";
import { createServerSupabase } from "@/lib/supabase/server";
import { createReviewWriter } from "@/lib/supabase/admin";
import { readWorkspaceBilling } from "@/lib/workspace-billing";
import { reviewState } from "@/lib/reviews";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  return process.env.RENDER_QUEUE_ENABLED === "true"
    ? enqueueRender(request, supabase, user.id, "review")
    : executeReview(request, supabase, user);
}

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const context = await readWorkspaceBilling(supabase, user.id);
  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  const { membership } = context;
  const writer = createReviewWriter(supabase);
  const { data, error } = await writer
    .from("review_links")
    .select("public_id, set_name, client_name, status, comment, created_at, expires_at, revoked_at")
    .eq("workspace_id", membership.workspace_id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: "REVIEWS_UNAVAILABLE" }, { status: 503 });
  return NextResponse.json({
    reviews: (data ?? []).map((review) => ({ ...review, ...reviewState(review) })),
  });
}
