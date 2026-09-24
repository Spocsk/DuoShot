import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  const oauthToken = process.env.MIXPANEL_GDPR_OAUTH_TOKEN;
  const admin = createAdminSupabase();
  if (!token || !oauthToken || !admin) return NextResponse.json({ processed: 0, configured: false });

  const { data: jobs, error } = await admin.from("analytics_erasure_jobs")
    .select("distinct_id, tracking_id, status, attempts")
    .neq("status", "done").order("created_at", { ascending: true }).limit(20);
  if (error) return NextResponse.json({ error: "QUEUE_UNAVAILABLE" }, { status: 503 });

  let processed = 0;
  let lastRequestAt = 0;
  for (const job of jobs ?? []) {
    try {
      const base = `https://eu.mixpanel.com/api/app/data-deletions/v3.0/`;
      const path = job.tracking_id ? `${base}${encodeURIComponent(job.tracking_id)}/` : base;
      const url = `${path}?token=${encodeURIComponent(token)}`;
      const waitMs = 1100 - (Date.now() - lastRequestAt);
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
      lastRequestAt = Date.now();
      const response = await fetch(url, {
        method: job.tracking_id ? "GET" : "POST",
        headers: { Authorization: `Bearer ${oauthToken}`, "Content-Type": "application/json" },
        ...(job.tracking_id ? {} : { body: JSON.stringify({ distinct_ids: [job.distinct_id], compliance_type: "GDPR" }) }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const payload = await response.json() as {
        status?: string;
        results?: Array<{ tracking_id?: string; status?: string }> | { tracking_id?: string; task_id?: string; status?: string };
      };
      if (payload.status !== "ok") throw new Error("MIXPANEL_REJECTED");
      const result = Array.isArray(payload.results) ? payload.results[0] : payload.results;
      const trackingId = result?.tracking_id ?? ("task_id" in (result ?? {}) ? (result as { task_id?: string }).task_id : undefined) ?? job.tracking_id;
      const remoteStatus = result?.status;
      const status = remoteStatus === "SUCCESS" ? "done" :
        ["FAILURE", "REVOKED", "NOT_FOUND", "UNKNOWN"].includes(remoteStatus ?? "") ? "pending" : "submitted";
      if (!trackingId) throw new Error("MISSING_TRACKING_ID");
      await admin.from("analytics_erasure_jobs").update({
        tracking_id: status === "pending" ? null : trackingId,
        status, attempts: job.attempts + 1, last_error: status === "pending" ? remoteStatus : null,
        updated_at: new Date().toISOString(),
      }).eq("distinct_id", job.distinct_id);
      processed += 1;
    } catch (failure) {
      await admin.from("analytics_erasure_jobs").update({
        attempts: job.attempts + 1,
        last_error: failure instanceof Error ? failure.message : "UNKNOWN",
        updated_at: new Date().toISOString(),
      }).eq("distinct_id", job.distinct_id);
    }
  }
  return NextResponse.json({ processed });
}
