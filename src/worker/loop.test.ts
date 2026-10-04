import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RenderLane, TickOptions, TickOutcome } from "../lib/render/worker";
import { createRenderWorker, workerConfigErrors, workerConfigFromEnv, type WorkerConfig } from "./loop";

const admin = {} as SupabaseClient;
const config = (overrides: Partial<WorkerConfig> = {}): WorkerConfig => ({
  timeoutMs: { render: 1_000, asc: 1_000 }, idleMs: { render: 5, asc: 5 }, stopGraceMs: 30, abortGraceMs: 10, ...overrides,
});
type Tick = (admin: SupabaseClient, lane: RenderLane, options?: TickOptions) => Promise<TickOutcome>;
const idle: Tick = async () => ({ kind: "idle" });
/** A job that only ends when the stop deadline gives it up, like a Sharp render. */
const stuck: Tick = (_admin, _lane, options) => new Promise((resolve) => {
  options!.stop!.addEventListener("abort", () => resolve({ kind: "abandoned", jobId: "job-1" }), { once: true });
});

beforeEach(() => { vi.spyOn(console, "log").mockImplementation(() => {}); vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { vi.restoreAllMocks(); });

describe("render worker loop", () => {
  it("polls both lanes with the configured per-job timeouts until stopped", async () => {
    const tick = vi.fn(idle);
    const worker = createRenderWorker(admin, config({ timeoutMs: { render: 111, asc: 222 } }), tick);
    const running = worker.run();
    await vi.waitFor(() => expect(tick.mock.calls.length).toBeGreaterThan(4));
    worker.stop("SIGTERM");
    expect(await running).toEqual({ abandonedWork: false });
    expect(tick).toHaveBeenCalledWith(admin, "render", expect.objectContaining({ timeoutMs: 111, abortGraceMs: 10 }));
    expect(tick).toHaveBeenCalledWith(admin, "asc", expect.objectContaining({ timeoutMs: 222 }));
    const calls = tick.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(tick.mock.calls.length).toBe(calls);
  });

  it("runs one tick per lane with --once", async () => {
    const tick = vi.fn(async (): Promise<TickOutcome> => ({ kind: "processed", jobId: "job-1" }));
    expect(await createRenderWorker(admin, config({ once: true }), tick).run()).toEqual({ abandonedWork: false });
    expect(tick).toHaveBeenCalledTimes(2);
  });

  it("keeps polling through claim failures (Supabase stopped for a backup)", async () => {
    const tick = vi.fn<Tick>().mockRejectedValueOnce(new Error("fetch failed")).mockResolvedValue({ kind: "unavailable" });
    const worker = createRenderWorker(admin, config(), tick);
    const running = worker.run();
    await vi.waitFor(() => expect(tick.mock.calls.filter(([, lane]) => lane === "render").length).toBeGreaterThan(2));
    worker.stop("SIGTERM");
    await running;
  });

  it("on SIGTERM lets a job that finishes in time complete, then stops claiming", async () => {
    let finish!: () => void;
    const tick = vi.fn<Tick>((_admin, lane) => lane === "asc" ? idle(admin, lane)
      : new Promise((resolve) => { finish = () => resolve({ kind: "processed", jobId: "job-1" }); }));
    const worker = createRenderWorker(admin, config({ stopGraceMs: 1_000 }), tick);
    const running = worker.run();
    await vi.waitFor(() => expect(finish).toBeDefined());
    worker.stop("SIGTERM");
    finish();
    expect(await running).toEqual({ abandonedWork: false });
    expect(tick.mock.calls.filter(([, lane]) => lane === "render")).toHaveLength(1);
  });

  it("on SIGTERM gives up a job that overruns the grace period", async () => {
    const tick = vi.fn<Tick>((_admin, lane, options) => lane === "asc" ? idle(admin, lane) : stuck(admin, lane, options));
    const worker = createRenderWorker(admin, config({ stopGraceMs: 10 }), tick);
    const running = worker.run();
    await vi.waitFor(() => expect(tick).toHaveBeenCalledWith(admin, "render", expect.anything()));
    worker.stop("SIGTERM");
    expect(await running).toEqual({ abandonedWork: true });
  });

  it("drains the other lane and exits after a job timeout", async () => {
    let upload!: () => void;
    const tick = vi.fn<Tick>((_admin, lane) => lane === "render"
      ? new Promise((resolve) => setTimeout(() => resolve({ kind: "timeout", jobId: "job-1", code: "RENDER_INTERRUPTED" }), 5))
      : new Promise((resolve) => { upload = () => resolve({ kind: "processed", jobId: "job-2" }); }));
    const worker = createRenderWorker(admin, config({ stopGraceMs: 1_000 }), tick);
    const running = worker.run();
    await vi.waitFor(() => expect(console.log).toHaveBeenCalledWith("render_worker_stopping", expect.objectContaining({ reason: "job_timeout" })));
    upload();
    expect(await running).toEqual({ abandonedWork: true });
    expect(tick).toHaveBeenCalledTimes(2);
  });
});

describe("worker configuration", () => {
  it("defaults to the route's 15-minute bound and a 60-second stop grace", () => {
    expect(workerConfigFromEnv({})).toMatchObject({ timeoutMs: { render: 900_000, asc: 900_000 }, stopGraceMs: 60_000 });
    expect(workerConfigFromEnv({ RENDER_JOB_TIMEOUT_MS: "120000", ASC_JOB_TIMEOUT_MS: "nope" }).timeoutMs).toEqual({ render: 120_000, asc: 900_000 });
  });

  it("names missing or invalid settings without printing values", () => {
    expect(workerConfigErrors({})).toEqual(["RENDER_QUEUE_ENABLED", "SUPABASE_ADMIN_KEY", "NEXT_PUBLIC_SUPABASE_URL"]);
    expect(workerConfigErrors({
      RENDER_QUEUE_ENABLED: "true", SUPABASE_SECRET_KEY: "k", NEXT_PUBLIC_SUPABASE_URL: "https://api.example.test", SUPABASE_INTERNAL_URL: "not a url",
    })).toEqual(["SUPABASE_INTERNAL_URL"]);
    expect(workerConfigErrors({ RENDER_QUEUE_ENABLED: "true", SUPABASE_SERVICE_ROLE_KEY: "k", NEXT_PUBLIC_SUPABASE_URL: "https://api.example.test" })).toEqual([]);
  });
});
