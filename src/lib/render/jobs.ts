import type { SupabaseClient } from "@supabase/supabase-js";
import type { RenderBody } from "../pipeline/request";
export type RenderJob = {
  id: string; user_id: string; workspace_id: string; kind: "export" | "review";
  payload: RenderBody; reservation_id: string | null; lease_token: string;
};
export async function completeRender(client: SupabaseClient, job: RenderJob, result: unknown, exported: unknown = null, error: string | null = null) {
  const response = await client.rpc("complete_render", {
    p_job: job.id, p_lease: job.lease_token, p_result: result, p_export: exported, p_error: error,
  });
  if (response.error) throw new Error(response.error.message.includes("RENDER_LEASE_LOST") ? "RENDER_LEASE_LOST" : "RENDER_COMMIT_FAILED");
}
