import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendTransactionalEmail } from "@/lib/email";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { readWorkspaceBilling } from "@/lib/workspace-billing";
import { createSupabaseMock, readJson } from "@/test/supabase-mock";
import { GET, POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));
vi.mock("@/lib/workspace-billing", () => ({ readWorkspaceBilling: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendTransactionalEmail: vi.fn() }));
vi.mock("@/lib/site", () => ({ getSiteUrl: () => "https://duoshot.example" }));

const user = { id: "user-1", email: "owner@example.com" };
const request = (body: unknown) => new Request("http://localhost/api/workspace/invitations", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
function billing(role = "owner", plan = "studio") {
  vi.mocked(readWorkspaceBilling).mockResolvedValue({
    ok: true, membership: { workspace_id: "ws-1", role }, workspace: { id: "ws-1", name: "Acme" }, entitlements: { plan },
  } as never);
}
function chain(result: unknown, calls: unknown[][]) {
  const builder: Record<string, unknown> = { then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
  for (const method of ["select", "eq", "order"]) builder[method] = (...args: unknown[]) => { calls.push([method, ...args]); return builder; };
  return builder;
}
function admin(rpc = vi.fn().mockResolvedValue({ data: { id: "inv-1", email: "new@example.com" }, error: null })) {
  vi.mocked(createAdminSupabase).mockReturnValue(createSupabaseMock({ rpc }) as never);
  return rpc;
}

beforeEach(() => {
  vi.mocked(createServerSupabase).mockReset().mockResolvedValue(createSupabaseMock({ user }) as never);
  vi.mocked(createAdminSupabase).mockReset();
  vi.mocked(readWorkspaceBilling).mockReset();
  vi.mocked(sendTransactionalEmail).mockReset().mockResolvedValue({ sent: true, mocked: false });
});

describe("GET /api/workspace/invitations", () => {
  it("requires a signed-in workspace owner", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    expect((await GET()).status).toBe(401);
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user }) as never);
    vi.mocked(readWorkspaceBilling).mockResolvedValue({ ok: false, error: "NO_WORKSPACE", status: 409 } as never);
    expect(await readJson(await GET())).toEqual({ status: 409, body: { error: "NO_WORKSPACE" } });
    billing("member");
    expect(await readJson(await GET())).toEqual({ status: 403, body: { error: "OWNER_REQUIRED" } });
    expect(createAdminSupabase).not.toHaveBeenCalled();
  });

  it("lists the workspace invitations", async () => {
    billing();
    const calls: unknown[][] = [];
    const invitations = [{ id: "inv-1", email: "a@example.com" }];
    const from = vi.fn(() => chain({ data: invitations, error: null }, calls));
    vi.mocked(createAdminSupabase).mockReturnValue({ from } as never);
    expect(await readJson(await GET())).toEqual({ status: 200, body: { invitations } });
    expect(from).toHaveBeenCalledWith("workspace_invitations");
    expect(calls).toContainEqual(["eq", "workspace_id", "ws-1"]);
  });

  it("returns 503 without an admin client", async () => {
    billing();
    vi.mocked(createAdminSupabase).mockReturnValue(null as never);
    expect((await GET()).status).toBe(503);
  });
});

describe("POST /api/workspace/invitations", () => {
  it("requires auth and the owner role", async () => {
    const rpc = admin();
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    expect((await POST(request({ email: "new@example.com" }))).status).toBe(401);
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user }) as never);
    billing("member");
    expect((await POST(request({ email: "new@example.com" }))).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects invalid emails before touching the database", async () => {
    billing();
    for (const email of [undefined, "", "  ", "not-an-email", "a@b"]) {
      expect(await readJson(await POST(request({ email })))).toEqual({ status: 400, body: { error: "INVALID_EMAIL" } });
    }
    expect(createAdminSupabase).not.toHaveBeenCalled();
  });

  it("requires the Studio plan", async () => {
    billing("owner", "indie");
    const rpc = admin();
    expect(await readJson(await POST(request({ email: "new@example.com" })))).toEqual({ status: 403, body: { error: "STUDIO_REQUIRED" } });
    expect(rpc).not.toHaveBeenCalled();
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("creates a normalized invitation whose link matches the stored hash", async () => {
    billing();
    const rpc = admin();
    const { status, body } = await readJson(await POST(request({ email: "  New@Example.COM " })));
    expect(status).toBe(201);
    expect(body).toMatchObject({ invitation: { id: "inv-1" }, emailSent: true });
    const token = String(body.acceptPath).replace(/^\/invite\//, "");
    expect(body.acceptPath).toBe(`/invite/${token}`);
    expect(rpc).toHaveBeenCalledWith("create_workspace_invitation", {
      p_workspace_id: "ws-1", p_user_id: "user-1", p_email: "new@example.com",
      p_token_hash: createHash("sha256").update(token).digest("hex"),
    });
    const mail = vi.mocked(sendTransactionalEmail).mock.calls[0][0];
    expect(mail.to).toBe("new@example.com");
    expect(mail.subject).toBe("Rejoignez Acme sur DuoShot");
    expect(mail.text).toContain(`https://duoshot.example/invite/${token}`);
  });

  it("uses English copy and path for the en locale", async () => {
    billing();
    admin();
    const { body } = await readJson(await POST(request({ email: "new@example.com", locale: "en" })));
    expect(body.acceptPath).toMatch(/^\/en\/invite\/[\w-]+$/);
    const mail = vi.mocked(sendTransactionalEmail).mock.calls[0][0];
    expect(mail.subject).toBe("Join Acme on DuoShot");
    expect(mail.text).toContain(`https://duoshot.example${body.acceptPath}`);
  });

  it("generates a fresh token for every invitation", async () => {
    billing();
    admin();
    const first = await readJson(await POST(request({ email: "a@example.com" })));
    const second = await readJson(await POST(request({ email: "b@example.com" })));
    expect(first.body.acceptPath).not.toBe(second.body.acceptPath);
  });

  it("maps database refusals to 409 and unknown failures to 503", async () => {
    billing();
    for (const code of ["SEAT_LIMIT", "INVITE_EXISTS", "ALREADY_MEMBER", "STUDIO_REQUIRED"]) {
      admin(vi.fn().mockResolvedValue({ data: null, error: { message: `ERROR: ${code}` } }));
      expect(await readJson(await POST(request({ email: "new@example.com" })))).toEqual({ status: 409, body: { error: code } });
    }
    admin(vi.fn().mockResolvedValue({ data: null, error: { message: "connection reset" } }));
    expect(await readJson(await POST(request({ email: "new@example.com" })))).toEqual({ status: 503, body: { error: "INVITE_FAILED" } });
    admin(vi.fn().mockResolvedValue({ data: null, error: null }));
    expect((await POST(request({ email: "new@example.com" }))).status).toBe(503);
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("still returns the invitation when email delivery fails", async () => {
    billing();
    admin();
    vi.mocked(sendTransactionalEmail).mockRejectedValue(new Error("EMAIL_DELIVERY_FAILED"));
    const { status, body } = await readJson(await POST(request({ email: "new@example.com" })));
    expect(status).toBe(201);
    expect(body.emailSent).toBe(false);
  });

  it("returns 503 without an admin client", async () => {
    billing();
    vi.mocked(createAdminSupabase).mockReturnValue(null as never);
    expect((await POST(request({ email: "new@example.com" }))).status).toBe(503);
  });
});
