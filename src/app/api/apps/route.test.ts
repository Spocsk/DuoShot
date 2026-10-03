import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServerSupabase } from "@/lib/supabase/server";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

const USER = { id: "user-1", email: "a@example.com" };
const APP_ID = "11111111-1111-4111-8111-111111111111";

type Call = { method: string; args: unknown[] };

function appsMock(results: Array<{ data: unknown; error?: unknown }>) {
  const calls: Call[] = [];
  let index = 0;
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "update", "upsert", "eq"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  const next = async () => results[index++] ?? { data: null, error: null };
  builder.maybeSingle = next;
  builder.single = next;
  return { builder, calls };
}

function mockSession(apps: ReturnType<typeof appsMock>) {
  vi.mocked(createServerSupabase).mockResolvedValue(
    createSupabaseMock({
      user: USER,
      from: (table) =>
        table === "workspace_members"
          ? createQueryBuilder({ data: { workspace_id: "ws-1" } })
          : (apps.builder as ReturnType<typeof createQueryBuilder>),
    }) as never,
  );
}

function post(body: unknown) {
  return POST(new Request("http://localhost/api/apps", { method: "POST", body: JSON.stringify(body) }));
}

beforeEach(() => {
  vi.mocked(createServerSupabase).mockReset();
});

describe("POST /api/apps", () => {
  it("returns 401 without a session", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    const { status } = await readJson(await post({ name: "Harbor" }));
    expect(status).toBe(401);
  });

  it("creates an app by slug when the set has no app yet", async () => {
    const apps = appsMock([{ data: { id: APP_ID, name: "Harbor" } }]);
    mockSession(apps);
    const { status, body } = await readJson(await post({ name: " Harbor ", orientation: "landscape" }));
    expect(status).toBe(200);
    expect(body.id).toBe(APP_ID);
    expect(apps.calls.map((call) => call.method)).not.toContain("update");
    expect(apps.calls.find((call) => call.method === "upsert")?.args[0]).toMatchObject({
      workspace_id: "ws-1",
      name: "Harbor",
      slug: "harbor",
      orientation: "landscape",
    });
  });

  it("renames a known app in place instead of creating a row per name", async () => {
    const apps = appsMock([{ data: { id: APP_ID, name: "Harbor Pro" } }]);
    mockSession(apps);
    const { status } = await readJson(await post({ id: APP_ID, name: "Harbor Pro" }));
    expect(status).toBe(200);
    expect(apps.calls.map((call) => call.method)).not.toContain("upsert");
    expect(apps.calls.filter((call) => call.method === "eq").map((call) => call.args)).toEqual([
      ["id", APP_ID],
      ["workspace_id", "ws-1"],
    ]);
  });

  it("keeps the slug when the new name collides with another app", async () => {
    const apps = appsMock([{ data: null, error: { code: "23505" } }, { data: { id: APP_ID } }]);
    mockSession(apps);
    const { status } = await readJson(await post({ id: APP_ID, name: "Other" }));
    expect(status).toBe(200);
    const updates = apps.calls.filter((call) => call.method === "update").map((call) => call.args[0]);
    expect(updates[0]).toHaveProperty("slug", "other");
    expect(updates[1]).not.toHaveProperty("slug");
  });

  it("rejects malformed bodies and oversized names", async () => {
    mockSession(appsMock([]));
    const malformed = await POST(new Request("http://localhost/api/apps", { method: "POST", body: "{" }));
    expect(malformed.status).toBe(400);
    const { status, body } = await readJson(await post({ name: "x".repeat(121) }));
    expect(status).toBe(400);
    expect(body.error).toBe("NAME_TOO_LONG");
  });
});
