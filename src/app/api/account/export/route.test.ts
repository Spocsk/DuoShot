import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendTransactionalEmail } from "@/lib/email";
import { createServerSupabase } from "@/lib/supabase/server";
import { createSupabaseMock } from "@/test/supabase-mock";
import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendTransactionalEmail: vi.fn() }));

const rows: Record<string, unknown[]> = {
  workspace_members: [{ workspace_id: "ws-1", role: "owner" }],
  consent_events: [{ kind: "analytics" }],
  export_sets: [{ id: "set-1" }],
  dsar_requests: [{ id: "dsar-1", type: "export" }],
};
function account(user: { id: string; email?: string | null } | null) {
  const filters: unknown[][] = [];
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = (table: string) => ({
    select: (columns: string) => ({ eq: async (column: string, value: string) => {
      filters.push([table, columns, column, value]);
      return { data: rows[table], error: null };
    } }),
    insert: (row: unknown) => insert(table, row),
  });
  vi.mocked(createServerSupabase).mockResolvedValue({ ...createSupabaseMock({ user }), from } as never);
  return { filters, insert };
}

beforeEach(() => {
  vi.mocked(createServerSupabase).mockReset();
  vi.mocked(sendTransactionalEmail).mockReset().mockResolvedValue({ sent: true, mocked: false });
});

describe("GET /api/account/export", () => {
  it("requires a session", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "AUTH_REQUIRED" });
  });

  it("downloads only the caller's own rows and logs the DSAR", async () => {
    const { filters, insert } = account({ id: "user-1", email: "a@example.com" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Content-Disposition")).toBe("attachment; filename=duoshot-data.json");
    expect(await response.json()).toEqual({
      exportedAt: expect.any(String),
      user: { id: "user-1", email: "a@example.com" },
      ...rows,
    });
    expect(filters).toEqual([
      ["workspace_members", "*", "user_id", "user-1"],
      ["consent_events", "*", "user_id", "user-1"],
      ["export_sets", "*", "created_by", "user-1"],
      ["dsar_requests", "*", "user_id", "user-1"],
    ]);
    expect(insert).toHaveBeenCalledWith("dsar_requests", {
      user_id: "user-1", type: "export", status: "done", processed_at: expect.any(String),
    });
    expect(sendTransactionalEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "a@example.com", subject: "Export DuoShot" }));
  });

  it("still downloads when the notification email fails", async () => {
    account({ id: "user-1", email: "a@example.com" });
    vi.mocked(sendTransactionalEmail).mockRejectedValue(new Error("EMAIL_DELIVERY_FAILED"));
    const response = await GET();
    expect(response.status).toBe(200);
    expect((await response.json()).user.id).toBe("user-1");
  });

  it("skips the email for accounts without an address", async () => {
    account({ id: "user-1", email: null });
    expect((await GET()).status).toBe(200);
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("fails instead of downloading a partial export", async () => {
    const insert = vi.fn();
    vi.mocked(createServerSupabase).mockResolvedValue({ ...createSupabaseMock({ user: { id: "user-1", email: "a@example.com" } }), from: (table: string) => ({
      select: () => ({ eq: async () => table === "consent_events" ? { data: null, error: { message: "timeout" } } : { data: rows[table], error: null } }),
      insert,
    }) } as never);
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "EXPORT_FAILED" });
    expect(insert).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });
});
