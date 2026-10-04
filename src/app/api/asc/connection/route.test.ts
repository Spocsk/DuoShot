import { generateKeyPairSync, randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { openSecret } from "@/lib/asc/crypto";
import { fakeApple } from "@/test/asc-apple-mock";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { DELETE, GET, POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));

const master = randomBytes(32);
const pem = generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ format: "pem", type: "pkcs8" }).toString();
const BODY = { issuerId: "57246542-96fe-1a63-e053-0824d011072a", keyId: "2X9R4HXF34", privateKey: pem };

function session({ role = "owner", plan = "indie", user = true }: { role?: string | null; plan?: string; user?: boolean } = {}) {
  vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({
    user: user ? { id: "user-1" } : null,
    from: (table) => createQueryBuilder(table === "workspace_members"
      ? { data: role ? { workspace_id: "ws-1", role } : null, error: null }
      : { data: { id: "ws-1", plan: "free", manual_plan: plan, free_exports_used: 0 }, error: null }),
  }) as never);
}

function adminMock(row: Record<string, unknown> | null = null) {
  const upsert = vi.fn(async (_row: Record<string, unknown>, _options: unknown) => ({ error: null }));
  const remove = vi.fn();
  const admin = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
      upsert,
      delete: () => ({ eq: async (...args: unknown[]) => { remove(...args); return { error: null }; } }),
    }),
  };
  vi.mocked(createAdminSupabase).mockReturnValue(admin as never);
  return { upsert, remove };
}

const post = (body: unknown) => POST(new Request("http://localhost/api/asc/connection", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  vi.stubEnv("ASC_CONNECTOR_ENABLED", "true");
  vi.stubEnv("ASC_ENCRYPTION_KEY", master.toString("base64"));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("/api/asc/connection", () => {
  it("does not exist while the feature flag is off", async () => {
    vi.stubEnv("ASC_CONNECTOR_ENABLED", "false");
    expect((await GET()).status).toBe(404);
    expect((await post(BODY)).status).toBe(404);
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("requires a session, an owner and a paid plan to connect", async () => {
    adminMock();
    session({ user: false });
    expect((await post(BODY)).status).toBe(401);
    session({ role: "member" });
    expect(await readJson(await post(BODY))).toEqual({ status: 403, body: { error: "OWNER_REQUIRED" } });
    session({ plan: "free" });
    expect(await readJson(await post(BODY))).toEqual({ status: 403, body: { error: "PAID_PLAN_REQUIRED" } });
  });

  it("rejects malformed identifiers and keys before calling Apple", async () => {
    session();
    const { upsert } = adminMock();
    const apple = fakeApple();
    vi.stubGlobal("fetch", apple.fetch);
    expect(await readJson(await post({ ...BODY, issuerId: "nope" }))).toMatchObject({ status: 400, body: { error: "ASC_ISSUER_INVALID" } });
    expect(await readJson(await post({ ...BODY, keyId: "short" }))).toMatchObject({ status: 400, body: { error: "ASC_KEY_ID_INVALID" } });
    expect(await readJson(await post({ ...BODY, privateKey: "-----BEGIN PRIVATE KEY-----\nxx\n-----END PRIVATE KEY-----" }))).toMatchObject({ status: 400, body: { error: "ASC_KEY_INVALID" } });
    expect(apple.calls).toHaveLength(0);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("does not store credentials Apple rejects", async () => {
    session();
    const { upsert } = adminMock();
    vi.stubGlobal("fetch", fakeApple({ fail: () => ({ status: 401, code: "NOT_AUTHORIZED" }) }).fetch);
    expect(await readJson(await post(BODY))).toEqual({ status: 422, body: { error: "ASC_CREDENTIALS_REJECTED" } });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("refuses to store a key without a valid master key", async () => {
    session();
    adminMock();
    vi.stubEnv("ASC_ENCRYPTION_KEY", randomBytes(16).toString("base64"));
    expect(await readJson(await post(BODY))).toEqual({ status: 503, body: { error: "ASC_UNAVAILABLE" } });
  });

  it("verifies with GET /v1/apps, stores the key sealed and never returns it", async () => {
    session();
    const { upsert } = adminMock();
    const apple = fakeApple();
    vi.stubGlobal("fetch", apple.fetch);
    const { status, body } = await readJson(await post(BODY));
    expect(status).toBe(201);
    expect(new URL(apple.calls[0]!.url).pathname).toBe("/v1/apps");
    expect(JSON.stringify(body)).not.toContain("PRIVATE KEY");
    expect(body).toMatchObject({ connected: true, keyId: "2X9R4HXF34", issuerId: expect.stringMatching(/072a$/) });
    expect(body.issuerId).not.toBe(BODY.issuerId);
    const [row, options] = upsert.mock.calls[0]!;
    expect(options).toEqual({ onConflict: "workspace_id" });
    expect(JSON.stringify(row)).not.toContain("PRIVATE KEY");
    expect(row).toMatchObject({ workspace_id: "ws-1", created_by: "user-1", issuer_id: BODY.issuerId, key_id: "2X9R4HXF34" });
    expect(openSecret({ ciphertext: row.encrypted_private_key as string, iv: row.iv as string, authTag: row.auth_tag as string }, master, "ws-1")).toBe(pem.trim());
  });

  it("reports status without the key to any member, and lets only the owner revoke, even unpaid", async () => {
    session({ role: "member", plan: "free" });
    adminMock({ issuer_id: BODY.issuerId, key_id: "2X9R4HXF34", created_at: "2026-10-04T00:00:00Z", last_verified_at: "2026-10-04T00:00:00Z" });
    const { body } = await readJson(await GET());
    expect(body).toEqual({
      enabled: true, owner: false, paid: false, connected: true, keyId: "2X9R4HXF34",
      issuerId: expect.stringMatching(/072a$/), createdAt: "2026-10-04T00:00:00Z", lastVerifiedAt: "2026-10-04T00:00:00Z",
    });
    expect(await readJson(await DELETE())).toEqual({ status: 403, body: { error: "OWNER_REQUIRED" } });
    session({ plan: "free" });
    const { remove } = adminMock();
    expect((await DELETE()).status).toBe(200);
    expect(remove).toHaveBeenCalledWith("workspace_id", "ws-1");
  });
});
