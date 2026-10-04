import { NextResponse } from "next/server";
import { renderWorkerSecret, verifyBearer } from "@/lib/bearer";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { runRenderTick } from "@/lib/render/worker";
export const runtime = "nodejs";
export const maxDuration = 900;
/**
 * Rollback path only. Production runs the queue in the standalone worker process
 * (dist/render-worker.mjs, RENDER_WORKER_MODE=process); with RENDER_WORKER_MODE=http,
 * scripts/run-render-worker.mjs polls this route instead and renders run inside Next.
 */
export async function POST(request: Request) {
  if (!verifyBearer(request, renderWorkerSecret())) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (process.env.RENDER_QUEUE_ENABLED !== "true") return NextResponse.json({ error: "QUEUE_DISABLED" }, { status: 503 });
  const admin = createAdminSupabase();
  if (!admin) return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
  // Two lanes with their own slot: renders (export, review) and App Store Connect
  // uploads, so a long upload never holds up an export. The worker polls each lane.
  const lane = new URL(request.url).searchParams.get("lane") === "asc" ? "asc" : "render";
  const outcome = await runRenderTick(admin, lane);
  switch (outcome.kind) {
    case "idle": return NextResponse.json({ idle: true });
    case "unavailable": return NextResponse.json({ error: "QUEUE_UNAVAILABLE" }, { status: 503 });
    case "lease_lost": return NextResponse.json({ jobId: outcome.jobId, processed: true, leaseLost: true });
    case "failed": return NextResponse.json({ jobId: outcome.jobId, error: "RENDER_ATTEMPT_FAILED" }, { status: 500 });
    default: return NextResponse.json({ jobId: outcome.jobId, processed: true });
  }
}
