import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeExport } from "./export";
import { executeReview } from "./review";
import { executeAscUpload } from "../asc/upload-job";
import { runRenderTick } from "./worker";

vi.mock("./export", () => ({ executeExport: vi.fn() }));
vi.mock("./review", () => ({ executeReview: vi.fn() }));
vi.mock("../asc/upload-job", () => ({ executeAscUpload: vi.fn() }));

const JOB = { id: "job-1", user_id: "user-1", workspace_id: "ws-1", kind: "export", payload: { paths: ["a"] }, reservation_id: "res-1", lease_token: "lease-1" };
type Reply = { data: unknown; error: unknown };

function queue(job: Record<string, unknown> | null, replies: Partial<Record<string, Reply>> = {}) {
  const rpc = vi.fn(async (name: string): Promise<Reply> => {
    if (name === "claim_render" || name === "claim_asc_upload") return replies[name] ?? { data: job, error: null };
    if (name === "heartbeat_render") return replies.heartbeat_render ?? { data: true, error: null };
    return replies[name] ?? { data: null, error: null };
  });
  return { admin: { rpc } as unknown as SupabaseClient, rpc };
}
const completions = (rpc: ReturnType<typeof vi.fn>) => rpc.mock.calls.filter(([name]) => name === "complete_render").map((call) => call[1]);
const never = () => new Promise<Response>(() => {});
const until = (signal: AbortSignal, response: Response) =>
  new Promise<Response>((resolve) => signal.addEventListener("abort", () => resolve(response), { once: true }));

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); vi.restoreAllMocks(); });

describe("claiming", () => {
  it("is idle without a queued job and unavailable when the claim fails", async () => {
    expect(await runRenderTick(queue(null).admin, "render")).toEqual({ kind: "idle" });
    const down = queue(null, { claim_render: { data: null, error: { message: "fetch failed" } } });
    expect(await runRenderTick(down.admin, "render")).toEqual({ kind: "unavailable" });
  });

  it("never claims uploads while the connector is off", async () => {
    const { admin, rpc } = queue(JOB);
    expect(await runRenderTick(admin, "asc")).toEqual({ kind: "idle" });
    expect(rpc).not.toHaveBeenCalled();
    vi.stubEnv("ASC_CONNECTOR_ENABLED", "true");
    vi.mocked(executeAscUpload).mockResolvedValue(Response.json({ ok: true }));
    await runRenderTick(admin, "asc");
    expect(rpc.mock.calls[0]![0]).toBe("claim_asc_upload");
  });
});

describe("execution", () => {
  it("passes the job payload and service client to the export, and commits nothing more on success", async () => {
    const { admin, rpc } = queue(JOB);
    vi.mocked(executeExport).mockResolvedValue(Response.json({ exportId: "res-1" }));
    expect(await runRenderTick(admin, "render")).toEqual({ kind: "processed", jobId: "job-1" });
    const [request, client, user, job] = vi.mocked(executeExport).mock.calls[0]!;
    expect(await request.json()).toEqual(JOB.payload);
    expect(client).toBe(admin);
    expect(user).toEqual({ id: "user-1" });
    expect(job).toMatchObject({ id: "job-1", lease_token: "lease-1" });
    expect(completions(rpc)).toHaveLength(0);
  });

  it("records the executor's error code with the job lease", async () => {
    const { admin, rpc } = queue({ ...JOB, kind: "review" });
    vi.mocked(executeReview).mockResolvedValue(Response.json({ error: "INPUT_FORMAT" }, { status: 400 }));
    expect(await runRenderTick(admin, "render")).toEqual({ kind: "processed", jobId: "job-1" });
    expect(completions(rpc)).toEqual([{ p_job: "job-1", p_lease: "lease-1", p_result: null, p_export: null, p_error: "INPUT_FORMAT" }]);
  });

  it("records RENDER_FAILED once for a crash and reports it", async () => {
    const { admin, rpc } = queue(JOB);
    vi.mocked(executeExport).mockRejectedValue(new Error("boom"));
    expect(await runRenderTick(admin, "render")).toEqual({ kind: "failed", jobId: "job-1" });
    expect(completions(rpc)).toEqual([expect.objectContaining({ p_error: "RENDER_FAILED" })]);
  });

  it("commits nothing when the lease was lost", async () => {
    const { admin, rpc } = queue(JOB);
    vi.mocked(executeExport).mockResolvedValue(Response.json({ error: "RENDER_LEASE_LOST" }, { status: 409 }));
    expect(await runRenderTick(admin, "render")).toEqual({ kind: "lease_lost", jobId: "job-1" });
    expect(completions(rpc)).toHaveLength(0);
  });

  it("heartbeats the lease and aborts the job once the heartbeat is refused", async () => {
    vi.stubEnv("ASC_CONNECTOR_ENABLED", "true");
    const { admin, rpc } = queue({ ...JOB, kind: "asc_upload" }, { heartbeat_render: { data: false, error: null } });
    vi.mocked(executeAscUpload).mockImplementation((_admin, _job, options) => until(options!.signal!, Response.json({ error: "RENDER_LEASE_LOST" }, { status: 409 })));
    expect(await runRenderTick(admin, "asc", { heartbeatMs: 5 })).toEqual({ kind: "lease_lost", jobId: "job-1" });
    expect(rpc).toHaveBeenCalledWith("heartbeat_render", { p_job: "job-1", p_lease: "lease-1" });
  });

  it("survives a heartbeat that throws", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === "claim_render") return { data: JOB, error: null };
      if (name === "heartbeat_render") throw new Error("socket hang up");
      return { data: null, error: null };
    });
    vi.mocked(executeExport).mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(Response.json({ ok: true })), 30)));
    expect(await runRenderTick({ rpc } as unknown as SupabaseClient, "render", { heartbeatMs: 5 })).toEqual({ kind: "processed", jobId: "job-1" });
  });
});

describe("timeouts", () => {
  it("fails a render that overruns with RENDER_INTERRUPTED (refunding its reservation) without waiting for Sharp", async () => {
    const { admin, rpc } = queue(JOB);
    vi.mocked(executeExport).mockImplementation(never);
    expect(await runRenderTick(admin, "render", { timeoutMs: 10 })).toEqual({ kind: "timeout", jobId: "job-1", code: "RENDER_INTERRUPTED" });
    expect(completions(rpc)).toEqual([expect.objectContaining({ p_job: "job-1", p_lease: "lease-1", p_error: "RENDER_INTERRUPTED" })]);
  });

  it("lets an overrunning upload roll back and records its own code", async () => {
    vi.stubEnv("ASC_CONNECTOR_ENABLED", "true");
    const { admin, rpc } = queue({ ...JOB, kind: "asc_upload", reservation_id: null });
    vi.mocked(executeAscUpload).mockImplementation((_admin, _job, options) => until(options!.signal!, Response.json({ error: "ASC_UNAVAILABLE" }, { status: 400 })));
    expect(await runRenderTick(admin, "asc", { timeoutMs: 10, abortGraceMs: 1_000 })).toEqual({ kind: "processed", jobId: "job-1" });
    expect(completions(rpc)).toEqual([expect.objectContaining({ p_error: "ASC_UNAVAILABLE" })]);
  });

  it("fails an upload that ignores the abort with ASC_INTERRUPTED after the grace period", async () => {
    vi.stubEnv("ASC_CONNECTOR_ENABLED", "true");
    const { admin, rpc } = queue({ ...JOB, kind: "asc_upload", reservation_id: null });
    vi.mocked(executeAscUpload).mockImplementation(never);
    expect(await runRenderTick(admin, "asc", { timeoutMs: 5, abortGraceMs: 5 })).toEqual({ kind: "timeout", jobId: "job-1", code: "ASC_INTERRUPTED" });
    expect(completions(rpc)).toEqual([expect.objectContaining({ p_error: "ASC_INTERRUPTED" })]);
  });

  it("still reports the timeout when the failure cannot be committed", async () => {
    const { admin } = queue(JOB, { complete_render: { data: null, error: { message: "RENDER_LEASE_LOST" } } });
    vi.mocked(executeExport).mockImplementation(never);
    expect((await runRenderTick(admin, "render", { timeoutMs: 5 })).kind).toBe("timeout");
  });
});

describe("stopping", () => {
  it("lets the current job finish when it ends before the stop deadline", async () => {
    const { admin } = queue(JOB);
    const stop = new AbortController();
    vi.mocked(executeExport).mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(Response.json({ ok: true })), 20)));
    expect(await runRenderTick(admin, "render", { stop: stop.signal })).toEqual({ kind: "processed", jobId: "job-1" });
  });

  it("abandons a render at the stop deadline without committing, so its lease expires and it is retried", async () => {
    const { admin, rpc } = queue(JOB);
    const stop = new AbortController();
    vi.mocked(executeExport).mockImplementation(never);
    setTimeout(() => stop.abort(), 10);
    expect(await runRenderTick(admin, "render", { stop: stop.signal, heartbeatMs: 2 })).toEqual({ kind: "abandoned", jobId: "job-1" });
    expect(completions(rpc)).toHaveLength(0);
    // The heartbeat stops with it.
    const beats = rpc.mock.calls.filter(([name]) => name === "heartbeat_render").length;
    await new Promise((resolve) => setTimeout(resolve, 15));
    expect(rpc.mock.calls.filter(([name]) => name === "heartbeat_render").length).toBe(beats);
  });

  it("aborts an upload at the stop deadline so it rolls back on Apple's side", async () => {
    vi.stubEnv("ASC_CONNECTOR_ENABLED", "true");
    const { admin, rpc } = queue({ ...JOB, kind: "asc_upload", reservation_id: null });
    const stop = new AbortController();
    stop.abort();
    vi.mocked(executeAscUpload).mockImplementation((_admin, _job, options) => until(options!.signal!, Response.json({ error: "ASC_UNAVAILABLE" }, { status: 400 })));
    expect(await runRenderTick(admin, "asc", { stop: stop.signal })).toEqual({ kind: "processed", jobId: "job-1" });
    expect(completions(rpc)).toEqual([expect.objectContaining({ p_error: "ASC_UNAVAILABLE" })]);
  });
});
