import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { GET } from "./route";

vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.mocked(createAdminSupabase).mockReset();
});

describe("analytics erasure cron", () => {
  it("rejects calls without its secret", async () => {
    vi.stubEnv("CRON_SECRET", "secret");
    const response = await GET(new Request("https://duoshot.test/api/cron/analytics-erasure"));
    expect(response.status).toBe(401);
    expect(createAdminSupabase).not.toHaveBeenCalled();
  });

  it("submits a pending EU deletion and saves its tracking ID", async () => {
    vi.stubEnv("CRON_SECRET", "secret");
    vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "project-token");
    vi.stubEnv("MIXPANEL_GDPR_OAUTH_TOKEN", "oauth-token");
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const select = vi.fn().mockReturnValue({
      neq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [{ distinct_id: "user-1", tracking_id: null, status: "pending", attempts: 0 }], error: null,
          }),
        }),
      }),
    });
    vi.mocked(createAdminSupabase).mockReturnValue({ from: () => ({ select, update }) } as never);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      status: "ok", results: [{ tracking_id: "task-1", status: "PENDING" }],
    }) });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(new Request("https://duoshot.test/api/cron/analytics-erasure", {
      headers: { authorization: "Bearer secret" },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: 1 });
    expect(fetchMock.mock.calls[0][0]).toBe("https://eu.mixpanel.com/api/app/data-deletions/v3.0/?token=project-token");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer oauth-token");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ tracking_id: "task-1", status: "submitted" }));
  });
});
