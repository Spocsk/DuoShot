import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveEntitlements } from "@/lib/billing";
import { createServerSupabase } from "@/lib/supabase/server";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));
vi.mock("@/lib/billing", () => ({
  resolveEntitlements: vi.fn(),
}));
vi.mock("@/lib/pipeline/compose", () => ({
  composeZipImages: vi.fn(),
}));
vi.mock("@/lib/pipeline/zip", () => ({
  buildZip: vi.fn(),
}));

const USER = { id: "user-1", email: "a@example.com" };
const FREE = {
  plan: "free" as const,
  source: "workspace" as const,
  remainingFreeExports: 0,
  canUse69: false,
};
const INDIE = {
  plan: "indie" as const,
  source: "workspace" as const,
  remainingFreeExports: null,
  canUse69: true,
};

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function withWorkspace() {
  return createSupabaseMock({
    user: USER,
    from: (table) => {
      if (table === "workspace_members") {
        return createQueryBuilder({ data: { workspace_id: "ws-1", role: "owner" }, error: null });
      }
      return createQueryBuilder({ data: { id: "ws-1", client_slug: null, plan: "free", free_exports_used: 2 } });
    },
  });
}

beforeEach(() => {
  vi.mocked(createServerSupabase).mockReset();
  vi.mocked(resolveEntitlements).mockReset();
});

describe("POST /api/export", () => {
  it("returns 401 without a session", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    const { status, body } = await readJson(await POST(jsonRequest({})));
    expect(status).toBe(401);
    expect(body.error).toBe("AUTH_REQUIRED");
  });

  it("returns 400 without images", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: USER }) as never);
    const { status, body } = await readJson(await POST(jsonRequest({ outerPaths: [], innerPaths: [] })));
    expect(status).toBe(400);
    expect(body.error).toBe("NO_IMAGES");
  });

  it("gates 6.9-inch sizes on free plans", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(withWorkspace() as never);
    vi.mocked(resolveEntitlements).mockResolvedValue(FREE);
    const { status, body } = await readJson(
      await POST(
        jsonRequest({
          outerPaths: ["user-1/outer.png"],
          innerPaths: ["user-1/inner.png"],
          include69: true,
        }),
      ),
    );
    expect(status).toBe(403);
    expect(body.error).toBe("IPHONE_69_GATED");
  });

  it("returns 402 when the trial is exhausted", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(withWorkspace() as never);
    vi.mocked(resolveEntitlements).mockResolvedValue(FREE);
    const { status, body } = await readJson(
      await POST(
        jsonRequest({
          outerPaths: ["user-1/outer.png"],
          innerPaths: ["user-1/inner.png"],
        }),
      ),
    );
    expect(status).toBe(402);
    expect(body.error).toBe("TRIAL_EXHAUSTED");
  });

  it("returns 403 for paths outside the user prefix", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(
      createSupabaseMock({
        user: USER,
        from: (table) => {
          if (table === "workspace_members") {
            return createQueryBuilder({ data: { workspace_id: "ws-1", role: "owner" }, error: null });
          }
          return createQueryBuilder({
            data: { id: "ws-1", client_slug: null, plan: "indie", free_exports_used: 0 },
          });
        },
      }) as never,
    );
    vi.mocked(resolveEntitlements).mockResolvedValue(INDIE);
    const { status, body } = await readJson(
      await POST(
        jsonRequest({
          outerPaths: ["other/outer.png"],
          innerPaths: ["other/inner.png"],
        }),
      ),
    );
    expect(status).toBe(403);
    expect(body.error).toBe("PATH_FORBIDDEN");
  });
});
