import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = (await request.json()) as { action?: string; comment?: string };
  const status = body.action === "approve" ? "approved" : body.action === "redo" ? "changes_requested" : null;
  if (!status) return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
  const { data, error } = await admin
    .from("review_links")
    .update({
      status,
      comment: body.comment?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("public_id", id)
    .select("public_id, status, comment")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(data);
}
