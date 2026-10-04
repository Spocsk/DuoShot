import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { completeRender, type RenderJob } from "./jobs";

const JOB: RenderJob = {
  id: "job-1", user_id: "user-1", workspace_id: "ws-1", kind: "export",
  payload: {}, reservation_id: "res-1", lease_token: "lease-1",
};

function client(response: { data?: unknown; error: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue({ data: null, ...response });
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

describe("completeRender", () => {
  it("commits with the job lease and defaults export and error to null", async () => {
    const { client: supabase, rpc } = client({ error: null });
    await expect(completeRender(supabase, JOB, { exportId: "res-1" })).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith("complete_render", {
      p_job: "job-1", p_lease: "lease-1", p_result: { exportId: "res-1" }, p_export: null, p_error: null,
    });
  });

  it("forwards export metadata and failure codes", async () => {
    const { client: supabase, rpc } = client({ error: null });
    await completeRender(supabase, JOB, null, { filename: "a.zip" }, "INPUT_FORMAT");
    expect(rpc).toHaveBeenCalledWith("complete_render", {
      p_job: "job-1", p_lease: "lease-1", p_result: null, p_export: { filename: "a.zip" }, p_error: "INPUT_FORMAT",
    });
  });

  it("reports a lost lease distinctly", async () => {
    const { client: supabase } = client({ error: { message: "ERROR: P0001: RENDER_LEASE_LOST" } });
    await expect(completeRender(supabase, JOB, null)).rejects.toThrow(/^RENDER_LEASE_LOST$/);
  });

  it("collapses every other database error to RENDER_COMMIT_FAILED", async () => {
    const { client: supabase } = client({ error: { message: "insert or update on table export_sets violates foreign key" } });
    await expect(completeRender(supabase, JOB, null)).rejects.toThrow(/^RENDER_COMMIT_FAILED$/);
  });
});
