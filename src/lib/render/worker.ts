import type { DbClient } from "@/lib/supabase/types";
import { executeExport } from "./export";
import { executeReview } from "./review";
import { executeAscUpload } from "../asc/upload-job";
import { completeRender, type RenderJob } from "./jobs";
import { serverEnv } from "../env";

/**
 * One claim → execute → complete cycle of the durable render queue, shared by the
 * standalone worker process (src/worker/render-worker.ts) and the rollback HTTP route
 * (/api/internal/render-worker). Leases, retries and quota settlement live in PostgreSQL.
 */

/** Renders (export, review) and App Store Connect uploads each have their own slot. */
export type RenderLane = "render" | "asc";

export type TickOutcome =
  | { kind: "idle" }
  /** The claim RPC failed (Supabase down, e.g. during a backup). */
  | { kind: "unavailable" }
  | { kind: "processed"; jobId: string }
  /** Another attempt owns the job now; nothing was committed. */
  | { kind: "lease_lost"; jobId: string }
  /** Unexpected crash: RENDER_FAILED was recorded when the lease still allowed it. */
  | { kind: "failed"; jobId: string }
  /** The per-job timeout fired: the job was failed with `code`, the work may still be running. */
  | { kind: "timeout"; jobId: string; code: string }
  /** The stop deadline passed mid-job: nothing committed, the lease expires and PostgreSQL decides. */
  | { kind: "abandoned"; jobId: string };

export type TickOptions = {
  heartbeatMs?: number;
  /** Per-job bound. Unset means unbounded (the HTTP route relies on its own maxDuration). */
  timeoutMs?: number;
  /** After an abort, how long an upload may still take to roll back on Apple's side. */
  abortGraceMs?: number;
  /** Aborted when the worker must stop: the running job is given up (see `abandoned`). */
  stop?: AbortSignal;
};

const LEASE_LOST = "RENDER_LEASE_LOST";
export const HEARTBEAT_MS = 15_000;
/** Error recorded when a job exceeds its timeout. Existing codes, already explained to users. */
export const TIMEOUT_CODES: Record<RenderLane, string> = { render: "RENDER_INTERRUPTED", asc: "ASC_INTERRUPTED" };

export function laneEnabled(lane: RenderLane) {
  return lane === "render" || serverEnv.asc.enabled;
}

async function execute(admin: DbClient, job: RenderJob, signal: AbortSignal): Promise<Response> {
  const input = () => new Request("http://localhost/render", { method: "POST", body: JSON.stringify(job.payload), signal });
  if (job.kind === "export") return executeExport(input(), admin, { id: job.user_id }, job);
  if (job.kind === "review") return executeReview(input(), admin, { id: job.user_id }, job);
  if (job.kind === "asc_upload") return executeAscUpload(admin, job, { signal });
  return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
}

/** Records the executor's result exactly as the HTTP worker always has. */
async function settle(admin: DbClient, job: RenderJob, run: Promise<Response>): Promise<TickOutcome> {
  try {
    const response = await run;
    if (!response.ok) {
      const result = await response.json() as { error?: string };
      if (result.error === LEASE_LOST) return leaseLost(job);
      await completeRender(admin, job, null, null, result.error ?? "RENDER_FAILED");
    }
    return { kind: "processed", jobId: job.id };
  } catch (error) {
    if (error instanceof Error && error.message === LEASE_LOST) return leaseLost(job);
    // If a lease was lost, this cannot change the new attempt's quota or result.
    try { await completeRender(admin, job, null, null, "RENDER_FAILED"); } catch { /* recovered by the next claim after lease expiry */ }
    console.error("render_worker_attempt_failed", { jobId: job.id });
    return { kind: "failed", jobId: job.id };
  }
}

function leaseLost(job: RenderJob): TickOutcome {
  console.warn("render_worker_lease_lost", { jobId: job.id });
  return { kind: "lease_lost", jobId: job.id };
}

/** Resolves after `ms`, or as soon as `signal` aborts. Never rejects. */
function wait(ms: number | undefined, signal?: AbortSignal): Promise<"elapsed" | "aborted"> {
  if (signal?.aborted) return Promise.resolve("aborted");
  return new Promise((resolve) => {
    const onAbort = () => { clearTimeout(timer); resolve("aborted"); };
    const timer = ms === undefined ? undefined : setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve("elapsed"); }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function runRenderTick(admin: DbClient, lane: RenderLane, options: TickOptions = {}): Promise<TickOutcome> {
  if (!laneEnabled(lane)) return { kind: "idle" };
  const claimed = await admin.rpc(lane === "asc" ? "claim_asc_upload" : "claim_render");
  if (claimed.error) return { kind: "unavailable" };
  // claim_* return to_jsonb() of the leased render_jobs row (or null when idle).
  const job = claimed.data as RenderJob | null;
  if (!job) return { kind: "idle" };

  const controller = new AbortController();
  const heartbeat = setInterval(() => {
    void Promise.resolve(admin.rpc("heartbeat_render", { p_job: job.id, p_lease: job.lease_token })).then(({ data, error }) => {
      if (error || data !== true) controller.abort();
    }, () => { /* transient: the next beat retries before the 90-second lease runs out */ });
  }, options.heartbeatMs ?? HEARTBEAT_MS);

  try {
    const done = settle(admin, job, execute(admin, job, controller.signal));
    const deadline = new AbortController();
    const onStop = () => deadline.abort();
    options.stop?.addEventListener("abort", onStop, { once: true });
    if (options.stop?.aborted) deadline.abort();
    const timer = options.timeoutMs === undefined ? undefined : setTimeout(() => deadline.abort(), options.timeoutMs);
    try {
      const first = await Promise.race([done, wait(undefined, deadline.signal).then(() => null)]);
      if (first) return first;
    } finally {
      clearTimeout(timer);
      options.stop?.removeEventListener("abort", onStop);
    }

    const stopping = options.stop?.aborted === true;
    // An upload honours the abort and rolls back what it sent to Apple; give it that time.
    // Sharp cannot be interrupted, so a render is not waited for.
    if (lane === "asc") {
      controller.abort();
      const late = await Promise.race([done, wait(options.abortGraceMs ?? 30_000).then(() => null)]);
      if (late) return late;
    }
    if (stopping) {
      // Leave the lease to expire: claim_render retries the render with the same
      // reservation, claim_asc_upload fails the upload with ASC_INTERRUPTED.
      console.warn("render_worker_job_abandoned", { jobId: job.id, lane });
      return { kind: "abandoned", jobId: job.id };
    }
    // Fail it now rather than letting the lease expire: claim_render returns nothing
    // while a job runs, so retries would hold the only render slot for 3 timeouts.
    const code = TIMEOUT_CODES[lane];
    console.error("render_worker_job_timeout", { jobId: job.id, lane, timeoutMs: options.timeoutMs });
    try { await completeRender(admin, job, null, null, code); } catch (error) {
      console.warn("render_worker_timeout_commit_failed", { jobId: job.id, message: error instanceof Error ? error.message : String(error) });
    }
    return { kind: "timeout", jobId: job.id, code };
  } finally {
    clearInterval(heartbeat);
  }
}
