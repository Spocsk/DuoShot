import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveEntitlements } from "@/lib/billing";
import { composeZipImages } from "@/lib/pipeline/compose";
import { buildZip } from "@/lib/pipeline/zip";
import { duoSpec } from "@/lib/specs";
import { createServerSupabase } from "@/lib/supabase/server";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { POST } from "./route";

vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));
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
vi.mock("@/lib/pipeline/clone-hash", () => ({ hashFromBuffer: vi.fn().mockResolvedValue(BigInt(0)) }));

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
  vi.mocked(createAdminSupabase).mockReturnValue(createSupabaseMock({ rpc: async () => ({ data: "export-1", error: null }) }) as never);
  vi.mocked(createServerSupabase).mockReset();
  vi.mocked(resolveEntitlements).mockReset();
  vi.mocked(composeZipImages).mockReset();
  vi.mocked(buildZip).mockReset();
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
    vi.mocked(resolveEntitlements).mockReturnValue(FREE);
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
    vi.mocked(resolveEntitlements).mockReturnValue(FREE);
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
    vi.mocked(resolveEntitlements).mockReturnValue(INDIE);
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

  it("delivers a ZIP larger than 4.5 MB through a signed storage URL", async () => {
    const zip = Buffer.alloc(5_000_000, 7);
    const uploaded: number[] = [];
    const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: "red" } }).png().toBuffer();
    vi.mocked(resolveEntitlements).mockReturnValue(INDIE);
    vi.mocked(composeZipImages).mockResolvedValue({
      images: [
        { spec: duoSpec("duo-outer", "portrait"), index: 0, buffer: image },
        { spec: duoSpec("duo-inner", "portrait"), index: 0, buffer: image },
      ],
      flattenAlpha: false,
      compositionWarnings: [],
    });
    vi.mocked(buildZip).mockResolvedValue(zip);
    vi.mocked(createServerSupabase).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: USER } }) },
      from: (table: string) => createQueryBuilder({ data: table === "workspace_members"
        ? { workspace_id: "ws-1", role: "owner" }
        : table === "daily_export_counts" ? { count: 0 }
          : { id: "ws-1", client_slug: null, plan: "indie", free_exports_used: 0 }, error: null }),
      rpc: async () => ({ data: 1, error: null }),
      storage: { from: (bucket: string) => ({
        info: async () => ({ data: { size: bucket === "uploads" ? image.length : zip.length }, error: null }),
        download: async () => bucket === "uploads"
          ? { data: { size: image.length, arrayBuffer: async () => Uint8Array.from(image).buffer }, error: null }
          : { data: { size: zip.length }, error: null },
        upload: async (_path: string, bytes: Uint8Array) => { uploaded.push(bytes.length); return { error: null }; },
        createSignedUrl: async () => ({ data: { signedUrl: "https://storage.example/large.zip" }, error: null }),
      }) },
    } as never);
    const { status, body } = await readJson(await POST(jsonRequest({
      outerPaths: ["user-1/outer.png"], innerPaths: ["user-1/inner.png"], assumeCloneRisk: true,
    })));
    expect(status).toBe(200);
    expect(uploaded).toEqual([zip.length]);
    expect(body.url).toBe("https://storage.example/large.zip");
    expect(body.images).toHaveLength(2);
    expect(body.exportId).toBe("export-1");
    expect(Date.parse(body.expiresAt as string)).toBeGreaterThan(Date.now());
  });
});
