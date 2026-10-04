import type { SupabaseClient } from "@supabase/supabase-js";
import { runRenderTick, type RenderLane, type TickOutcome } from "../lib/render/worker";

export type WorkerConfig = {
  /** Per-job bound for each lane. */
  timeoutMs: Record<RenderLane, number>;
  /** Pause after an idle or failed claim. */
  idleMs: Record<RenderLane, number>;
  /** After a stop, how long running jobs may still finish before they are given up. */
  stopGraceMs: number;
  /** After an abort, how long an upload may take to roll back on Apple's side. */
  abortGraceMs: number;
  /** One tick per lane, then return (smoke tests, manual checks). */
  once?: boolean;
  heartbeatMs?: number;
};

export type WorkerResult = {
  /** Work that could not be interrupted (Sharp) may still be running: the process must exit. */
  abandonedWork: boolean;
};

/**
 * The standalone render worker: one loop per lane (renders, App Store Connect uploads),
 * so an upload waiting on Apple never holds up an export. stop() stops claiming at once
 * and gives running jobs `stopGraceMs` to finish.
 */
export function createRenderWorker(admin: SupabaseClient, config: WorkerConfig, tick = runRenderTick) {
  const stopping = new AbortController();
  const deadline = new AbortController();
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  let abandonedWork = false;

  function stop(reason: string) {
    if (stopping.signal.aborted) return;
    console.log("render_worker_stopping", { reason, graceMs: config.stopGraceMs });
    stopping.abort();
    deadlineTimer = setTimeout(() => deadline.abort(), config.stopGraceMs);
  }

  const pause = (ms: number) => new Promise<void>((resolve) => {
    const timer = setTimeout(done, ms);
    function done() { clearTimeout(timer); stopping.signal.removeEventListener("abort", done); resolve(); }
    stopping.signal.addEventListener("abort", done, { once: true });
  });

  async function lane(name: RenderLane) {
    while (!stopping.signal.aborted) {
      let outcome: TickOutcome;
      try {
        outcome = await tick(admin, name, {
          timeoutMs: config.timeoutMs[name], abortGraceMs: config.abortGraceMs, stop: deadline.signal, heartbeatMs: config.heartbeatMs,
        });
      } catch (error) {
        console.error("render_worker_tick_failed", { lane: name, message: error instanceof Error ? error.message : String(error) });
        outcome = { kind: "unavailable" };
      }
      if (outcome.kind === "unavailable") console.error("render_worker_claim_failed", { lane: name });
      else if (outcome.kind !== "idle") console.log("render_worker_job", { lane: name, ...outcome });
      if (outcome.kind === "timeout" || outcome.kind === "abandoned") {
        // The timed-out work keeps its CPU and memory until the process exits: let the
        // other lane drain, then exit so systemd starts a clean worker.
        abandonedWork = true;
        stop(outcome.kind === "timeout" ? "job_timeout" : "stop_deadline");
        return;
      }
      if (config.once) return;
      if (outcome.kind === "idle" || outcome.kind === "unavailable") await pause(config.idleMs[name]);
    }
  }

  async function run(): Promise<WorkerResult> {
    console.log("render_worker_started", { timeoutMs: config.timeoutMs, stopGraceMs: config.stopGraceMs, once: Boolean(config.once) });
    try { await Promise.all([lane("render"), lane("asc")]); } finally { clearTimeout(deadlineTimer); }
    return { abandonedWork };
  }

  return { run, stop };
}

type Env = Record<string, string | undefined>;

const positive = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** The worker reads the same private environment as the application (/data/duoshot/app.env). */
export function workerConfigFromEnv(env: Env = process.env, once = false): WorkerConfig {
  return {
    // The route's maxDuration was 900 s; an upload also has a 10-minute Apple budget plus rollback.
    timeoutMs: { render: positive(env.RENDER_JOB_TIMEOUT_MS, 900_000), asc: positive(env.ASC_JOB_TIMEOUT_MS, 900_000) },
    idleMs: { render: 2_000, asc: 5_000 },
    stopGraceMs: positive(env.RENDER_WORKER_STOP_GRACE_MS, 60_000),
    abortGraceMs: 30_000,
    once,
  };
}

/** Configuration problems that would only surface at the end of a render. Names only, never values. */
export function workerConfigErrors(env: Env = process.env): string[] {
  const errors: string[] = [];
  if (env.RENDER_QUEUE_ENABLED !== "true") errors.push("RENDER_QUEUE_ENABLED");
  if (!env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_SECRET_KEY) errors.push("SUPABASE_ADMIN_KEY");
  // Signed export URLs are rewritten to the public Supabase host.
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_INTERNAL_URL"] as const) {
    if (name === "SUPABASE_INTERNAL_URL" && !env[name]) continue;
    try { new URL(env[name] ?? ""); } catch { errors.push(name); }
  }
  return errors;
}
