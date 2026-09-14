import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(request.url);
  const slide = Number(url.searchParams.get("slide") ?? "0");
  const side = url.searchParams.get("side") === "inner" ? "inner" : "outer";
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
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
