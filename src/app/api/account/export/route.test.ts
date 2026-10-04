import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendTransactionalEmail } from "@/lib/email";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { createSupabaseMock } from "@/test/supabase-mock";
import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendTransactionalEmail: vi.fn() }));

const rows: Record<string, unknown[]> = {
  workspace_members: [{ workspace_id: "ws-1", role: "owner" }],
  workspaces: [{ id: "ws-1", name: "Studio" }],
  apps: [{ id: "app-1", workspace_id: "ws-1" }],
  consent_events: [{ kind: "analytics" }],
  export_sets: [{ id: "set-1" }],
  render_jobs: [{ id: "job-1", state: "completed" }],
  review_links: [{ id: "review-1", public_id: "abc" }],
  dsar_requests: [{ id: "dsar-1", type: "export" }],
  asc_connections: [{ workspace_id: "ws-1", key_id: "2X9R4HXF34" }],
};
const invitationsByFilter: Record<string, unknown[]> = {
  invited_by: [{ id: "inv-1", email: "client@example.com" }],
  email: [{ id: "inv-2", email: "a@example.com" }, { id: "inv-1", email: "client@example.com" }],
};

type Failure = { client: "user" | "admin"; table: string } | null;
/** Records [client, table, columns, filter, value]; fails the given read when asked. */
function account(user: { id: string; email?: string | null } | null, options: { fail?: Failure; insertError?: unknown; admin?: boolean } = {}) {
  const reads: unknown[][] = [];
  const insert = vi.fn().mockResolvedValue({ error: options.insertError ?? null });
  const client = (name: "user" | "admin") => (table: string) => ({
    select: (columns: string) => {
      const filter = async (method: string, column: string, value: unknown) => {
        reads.push([name, table, columns, `${method}:${column}`, value]);
        if (options.fail?.client === name && options.fail.table === table) return { data: null, error: { message: "timeout" } };
        return { data: table === "workspace_invitations" ? invitationsByFilter[column] : rows[table], error: null };
      };
      return {
        eq: (column: string, value: unknown) => filter("eq", column, value),
        in: (column: string, value: unknown) => filter("in", column, value),
      };
    },
    insert: (row: unknown) => insert(table, row),
  });
  vi.mocked(createServerSupabase).mockResolvedValue({ ...createSupabaseMock({ user }), from: client("user") } as never);
  vi.mocked(createAdminSupabase).mockReturnValue(options.admin === false ? null : { from: client("admin") } as never);
  return { reads, insert };
}

beforeEach(() => {
  vi.mocked(createServerSupabase).mockReset();
  vi.mocked(createAdminSupabase).mockReset();
  vi.mocked(sendTransactionalEmail).mockReset().mockResolvedValue({ sent: true, mocked: false });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/account/export", () => {
  it("requires a session", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "AUTH_REQUIRED" });
  });

  it("downloads every table holding the caller's data and logs the DSAR", async () => {
    const { reads, insert } = account({ id: "user-1", email: "A@Example.com" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Content-Disposition")).toBe("attachment; filename=duoshot-data.json");
    expect(await response.json()).toEqual({
      exportedAt: expect.any(String),
      user: { id: "user-1", email: "A@Example.com" },
      ...rows,
      workspace_invitations: [{ id: "inv-1", email: "client@example.com" }, { id: "inv-2", email: "a@example.com" }],
    });
    expect(reads.map(([client, table, , filter, value]) => [client, table, filter, value])).toEqual([
      ["user", "workspace_members", "eq:user_id", "user-1"],
      ["user", "consent_events", "eq:user_id", "user-1"],
      ["user", "export_sets", "eq:created_by", "user-1"],
      ["user", "dsar_requests", "eq:user_id", "user-1"],
      ["user", "render_jobs", "eq:user_id", "user-1"],
      ["admin", "review_links", "eq:created_by", "user-1"],
      ["admin", "workspace_invitations", "eq:invited_by", "user-1"],
      ["admin", "workspace_invitations", "eq:email", "a@example.com"],
      ["admin", "asc_connections", "eq:created_by", "user-1"],
      ["user", "workspaces", "in:id", ["ws-1"]],
      ["user", "apps", "in:workspace_id", ["ws-1"]],
    ]);
    // Secrets never leave the database.
    const columns = reads.map(([, , selected]) => selected).join(",");
    expect(columns).not.toMatch(/token_hash|lease_token|stripe|encrypted_private_key|auth_tag/);
    expect(insert).toHaveBeenCalledWith("dsar_requests", {
      user_id: "user-1", type: "export", status: "done", processed_at: expect.any(String),
    });
    expect(sendTransactionalEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "A@Example.com", subject: "Export DuoShot" }));
  });

  it("still downloads when the notification email fails", async () => {
    account({ id: "user-1", email: "a@example.com" });
    vi.mocked(sendTransactionalEmail).mockRejectedValue(new Error("EMAIL_DELIVERY_FAILED"));
    const response = await GET();
    expect(response.status).toBe(200);
    expect((await response.json()).user.id).toBe("user-1");
  });

  it("skips the email and the received-invitations lookup for accounts without an address", async () => {
    const { reads } = account({ id: "user-1", email: null });
    expect((await GET()).status).toBe(200);
    expect(reads.some(([, , , filter]) => filter === "eq:email")).toBe(false);
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it.each([
    ["user", "consent_events"],
    ["user", "render_jobs"],
    ["admin", "review_links"],
    ["admin", "asc_connections"],
    ["admin", "workspace_invitations"],
    ["user", "workspaces"],
    ["user", "apps"],
  ] as const)("fails instead of downloading a partial export when %s %s fails", async (client, table) => {
    const { insert } = account({ id: "user-1", email: "a@example.com" }, { fail: { client, table } });
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "EXPORT_FAILED" });
    expect(insert).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("fails without the service-role client rather than omitting review links and invitations", async () => {
    const { insert, reads } = account({ id: "user-1", email: "a@example.com" }, { admin: false });
    expect(await (await GET()).json()).toEqual({ error: "EXPORT_FAILED" });
    expect(reads).toEqual([]);
    expect(insert).not.toHaveBeenCalled();
  });

  it("does not hand out the file when the DSAR log cannot be written", async () => {
    account({ id: "user-1", email: "a@example.com" }, { insertError: { message: "permission denied" } });
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "EXPORT_FAILED" });
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });
});
