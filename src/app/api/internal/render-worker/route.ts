import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { executeExport } from "@/lib/render/export";
import { executeReview } from "@/lib/render/review";
import { completeRender, type RenderJob } from "@/lib/render/jobs";
export const runtime = "nodejs";
export const maxDuration = 900;
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (process.env.RENDER_QUEUE_ENABLED !== "true") return NextResponse.json({ error: "QUEUE_DISABLED" }, { status: 503 });
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
  const claimed = await admin.rpc("claim_render");
  if (claimed.error) return NextResponse.json({ error: "QUEUE_UNAVAILABLE" }, { status: 503 });
  const job = claimed.data as RenderJob | null;
  if (!job) return NextResponse.json({ idle: true });
  const controller = new AbortController();
  const heartbeat = setInterval(() => {
    void admin.rpc("heartbeat_render", { p_job: job.id, p_lease: job.lease_token }).then(({ data, error }) => {
      if (error || data !== true) controller.abort();
    });
  }, 15_000);
  try {
    const input = new Request("http://localhost/render", { method: "POST", body: JSON.stringify(job.payload), signal: controller.signal });
    const response = await (job.kind === "export" ? executeExport : executeReview)(input, admin, { id: job.user_id }, job);
    if (!response.ok) {
      const result = await response.json() as { error?: string };
      await completeRender(admin, job, null, null, result.error ?? "RENDER_FAILED");
    }
    return NextResponse.json({ jobId: job.id, processed: true });
  } catch {
    // If a lease was lost, this cannot change the new attempt's quota or result.
    try { await completeRender(admin, job, null, null, "RENDER_FAILED"); } catch { /* recovered by the next claim after lease expiry */ }
    console.error("render_worker_attempt_failed", { jobId: job.id });
    return NextResponse.json({ jobId: job.id, error: "RENDER_ATTEMPT_FAILED" }, { status: 500 });
  } finally { clearInterval(heartbeat); }
}
