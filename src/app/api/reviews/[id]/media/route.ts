import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { harborReviewJpeg, isDemoReview } from "@/lib/pipeline/harbor";
import { reviewState } from "@/lib/reviews";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(request.url);
  const slide = Number(url.searchParams.get("slide") ?? "0");
  const side = url.searchParams.get("side") === "inner" ? "inner" : "outer";
  if (isDemoReview(id)) {
    const jpeg = await harborReviewJpeg(slide, side);
    if (!jpeg) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return new NextResponse(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "STORAGE_UNAVAILABLE" }, { status: 503 });
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
  const seq = String(slide + 1).padStart(2, "0");
  const path = `${id}/${seq}-${side}.jpg`;
  const { data, error } = await admin.storage.from("reviews").download(path);
  if (error || !data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return new NextResponse(Buffer.from(await data.arrayBuffer()), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
