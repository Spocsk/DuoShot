import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { removeStorageObjects } from "@/lib/storage-cleanup";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
  try {
    const { error } = await admin.rpc("refund_abandoned_exports");
    if (error) throw new Error("RESERVATION_CLEANUP_FAILED");
    const result = await removeStorageObjects(admin);
    console.info("storage_cleanup", result);
    return NextResponse.json(result, { status: result.complete ? 200 : 503 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "CLEANUP_FAILED";
    console.error("storage_cleanup_failed", { code });
    return NextResponse.json({ error: code }, { status: 503 });
  }
}
