import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { resolveEntitlements } from "@/lib/billing";
import { reviewPairJpegs } from "@/lib/pipeline/compose";
import { duoSpec } from "@/lib/specs";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { createQueryBuilder, createStorageMock, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { GET, POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => {
  const createAdminSupabase = vi.fn();
  return {
    createAdminSupabase,
    createPublicSupabase: vi.fn(),
    createReviewWriter: (client: unknown) => createAdminSupabase() ?? client,
  };
});
vi.mock("@/lib/billing", () => ({
  resolveEntitlements: vi.fn(),
}));
vi.mock("@/lib/pipeline/compose", () => ({
  reviewPairJpegs: vi.fn(),
}));

const USER = { id: "user-1", email: "studio@example.com" };
const STUDIO = {
  plan: "studio" as const,
  source: "workspace" as const,
  remainingFreeExports: null,
  canUse69: true,
};

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(createServerSupabase).mockReset();
  vi.mocked(createAdminSupabase).mockReset();
  vi.mocked(resolveEntitlements).mockReset();
  vi.mocked(reviewPairJpegs).mockReset();
});

describe("POST /api/reviews", () => {
  it("returns 401 without a session", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    const { status, body } = await readJson(await POST(jsonRequest({})));
    expect(status).toBe(401);
    expect(body.error).toBe("AUTH_REQUIRED");
  });

  it("returns 400 without a workspace", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(
      createSupabaseMock({
        user: USER,
        from: () => createQueryBuilder({ data: null }),
      }) as never,
    );
    const { status, body } = await readJson(await POST(jsonRequest({})));
    expect(status).toBe(400);
    expect(body.error).toBe("NO_WORKSPACE");
  });

  it("returns 403 when the plan is not Studio", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(
      createSupabaseMock({
        user: USER,
        from: (table) => {
          if (table === "workspace_members") return createQueryBuilder({ data: { workspace_id: "ws-1" } });
          return createQueryBuilder({ data: { plan: "indie", free_exports_used: 0 } });
        },
      }) as never,
    );
    vi.mocked(resolveEntitlements).mockResolvedValue({ ...STUDIO, plan: "indie" });
    const { status, body } = await readJson(await POST(jsonRequest({})));
    expect(status).toBe(403);
    expect(body.error).toBe("STUDIO_REQUIRED");
  });

  it("falls back to the user client without an admin key", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(
      createSupabaseMock({
        user: USER,
        from: (table) => {
          if (table === "workspace_members") return createQueryBuilder({ data: { workspace_id: "ws-1" } });
          return createQueryBuilder({ data: { plan: "studio", free_exports_used: 0 } });
        },
      }) as never,
    );
    vi.mocked(resolveEntitlements).mockResolvedValue(STUDIO);
    vi.mocked(createAdminSupabase).mockReturnValue(null);
    const { status, body } = await readJson(await POST(jsonRequest({})));
    expect(status).toBe(400);
    expect(body.error).toBe("NO_IMAGES");
  });

  it("returns 400 without images", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(
      createSupabaseMock({
        user: USER,
        from: (table) => {
          if (table === "workspace_members") return createQueryBuilder({ data: { workspace_id: "ws-1" } });
          return createQueryBuilder({ data: { plan: "studio", free_exports_used: 0 } });
        },
      }) as never,
    );
    vi.mocked(resolveEntitlements).mockResolvedValue(STUDIO);
    vi.mocked(createAdminSupabase).mockReturnValue(createSupabaseMock({}) as never);
    const { status, body } = await readJson(await POST(jsonRequest({ outerPaths: [], innerPaths: [] })));
    expect(status).toBe(400);
    expect(body.error).toBe("NO_IMAGES");
  });

  it("returns 403 for paths outside the user prefix", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(
      createSupabaseMock({
        user: USER,
        from: (table) => {
          if (table === "workspace_members") return createQueryBuilder({ data: { workspace_id: "ws-1" } });
          return createQueryBuilder({ data: { plan: "studio", free_exports_used: 0 } });
        },
      }) as never,
    );
    vi.mocked(resolveEntitlements).mockResolvedValue(STUDIO);
    vi.mocked(createAdminSupabase).mockReturnValue(
      createSupabaseMock({
        from: (table) => {
          if (table === "review_links") return createQueryBuilder({ data: { id: "rev-1", public_id: "abc" } });
          return createQueryBuilder({ data: null, error: null });
        },
      }) as never,
    );
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

  it("returns a localized review URL", async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 12, g: 24, b: 36 } },
    })
      .png()
      .toBuffer();
    const blob = { arrayBuffer: async () => Uint8Array.from(png).buffer };
    vi.mocked(createServerSupabase).mockResolvedValue(
      createSupabaseMock({
        user: USER,
        from: (table) => {
          if (table === "workspace_members") return createQueryBuilder({ data: { workspace_id: "ws-1" } });
          return createQueryBuilder({ data: { plan: "studio", free_exports_used: 0 } });
        },
        storage: createStorageMock({
          download: async () => ({ data: blob, error: null }),
        }),
      }) as never,
    );
    vi.mocked(resolveEntitlements).mockResolvedValue(STUDIO);
    vi.mocked(createAdminSupabase).mockReturnValue(
      createSupabaseMock({
        from: (table) => {
          if (table === "review_links") return createQueryBuilder({ data: { id: "rev-1", public_id: "abc" } });
          return createQueryBuilder({ data: null, error: null });
        },
        storage: createStorageMock({
          upload: async () => ({ error: null }),
        }),
      }) as never,
    );
    vi.mocked(reviewPairJpegs).mockResolvedValue({
      outer: Buffer.from("outer"),
      inner: Buffer.from("inner"),
      outerSpec: duoSpec("duo-outer", "portrait"),
      innerSpec: duoSpec("duo-inner", "portrait"),
    });
    const { status, body } = await readJson(
      await POST(
        jsonRequest({
          outerPaths: ["user-1/outer.png"],
          innerPaths: ["user-1/inner.png"],
          locale: "en",
          appName: "Harbor",
        }),
      ),
    );
    expect(status).toBe(200);
    expect(body.url).toMatch(/^\/en\/r\/[a-z0-9]+$/);
    expect(typeof body.id).toBe("string");
  });
});

describe("GET /api/reviews", () => {
  it("returns 401 without a session", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(createSupabaseMock({ user: null }) as never);
    const { status, body } = await readJson(await GET());
    expect(status).toBe(401);
    expect(body.error).toBe("AUTH_REQUIRED");
  });

  it("returns an empty list without a workspace", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(
      createSupabaseMock({
        user: USER,
        from: () => createQueryBuilder({ data: null }),
      }) as never,
    );
    const { status, body } = await readJson(await GET());
    expect(status).toBe(200);
    expect(body.reviews).toEqual([]);
  });
});
