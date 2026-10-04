import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import type { RenderJob } from "./jobs";
import { executeReview } from "./review";

vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn(), createReviewWriter: vi.fn((client: unknown) => client) }));

const USER = { id: "user-1" };
const PAYLOAD = { outerPaths: ["user-1/a.png"], innerPaths: ["user-1/b.png"] };
const JOB: RenderJob = {
  id: "job-1", user_id: "user-1", workspace_id: "ws-1", kind: "review",
  payload: PAYLOAD, reservation_id: null, lease_token: "lease-1",
};
const STUDIO = { id: "ws-1", plan: "studio", stripe_subscription_id: "sub_1", subscription_status: "active" };

function client(workspace: Record<string, unknown>) {
  return createSupabaseMock({
    user: USER,
    from: (table) => createQueryBuilder({ data: table === "workspace_members" ? { workspace_id: "ws-1", role: "owner" } : workspace, error: null }),
  }) as unknown as SupabaseClient;
}

function render(body: unknown = PAYLOAD) {
  return new Request("http://localhost/render", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
}

beforeEach(() => vi.mocked(createAdminSupabase).mockReset());

describe("executeReview early validation", () => {
  it("refuses a job whose workspace is no longer the user's active one", async () => {
    const { status, body } = await readJson(await executeReview(render(), client(STUDIO), USER, { ...JOB, workspace_id: "ws-old" }));
    expect(status).toBe(409);
    expect(body.error).toBe("NO_WORKSPACE");
  });

  it("re-checks Studio when the job runs, not only at admission", async () => {
    const { status, body } = await readJson(await executeReview(render(), client({ ...STUDIO, subscription_status: "canceled" }), USER, JOB));
    expect(status).toBe(403);
    expect(body.error).toBe("STUDIO_REQUIRED");
  });

  it("reports malformed JSON as INVALID_JSON", async () => {
    const { status, body } = await readJson(await executeReview(render("{oops"), client(STUDIO), USER));
    expect(status).toBe(400);
    expect(body.error).toBe("INVALID_JSON");
  });

  it.each([
    [{ outerPaths: ["user-1/a.png"] }, 400, "NO_IMAGES"],
    [{ outerPaths: ["user-1/a.png", "user-1/b.png"], innerPaths: ["user-1/c.png"] }, 400, "INVALID_PAIRS"],
    [{ outerPaths: ["other/a.png"], innerPaths: ["user-1/c.png"] }, 403, "PATH_FORBIDDEN"],
  ])("rejects %j before rendering", async (payload, expectedStatus, code) => {
    const { status, body } = await readJson(await executeReview(render(payload), client(STUDIO), USER));
    expect(status).toBe(expectedStatus);
    expect(body.error).toBe(code);
  });
});
