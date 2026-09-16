import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSupabase, createPublicSupabase } from "@/lib/supabase/admin";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { GET } from "./route";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabase: vi.fn(),
  createPublicSupabase: vi.fn(),
  createReviewWriter: vi.fn(),
}));

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.mocked(createAdminSupabase).mockReset();
  vi.mocked(createPublicSupabase).mockReset();
});

describe("GET /api/reviews/[id]", () => {
  it("returns the Harbor demo without admin storage", async () => {
    const { status, body } = await readJson(await GET(new Request("http://localhost/api/reviews/harbor"), params("harbor")));
    expect(status).toBe(200);
    expect(body.set_name).toBe("Harbor");
    expect(body.demo).toBe(true);
    expect(createAdminSupabase).not.toHaveBeenCalled();
  });

  it("returns 404 when the review is missing without an admin client", async () => {
    vi.mocked(createAdminSupabase).mockReturnValue(null);
    vi.mocked(createPublicSupabase).mockReturnValue(createSupabaseMock({}) as never);
    const { status, body } = await readJson(
      await GET(new Request("http://localhost/api/reviews/abc123"), params("abc123")),
    );
    expect(status).toBe(404);
    expect(body.error).toBe("NOT_FOUND");
  });

  it("returns 404 when the review is missing", async () => {
    vi.mocked(createAdminSupabase).mockReturnValue(
      createSupabaseMock({
        from: () => createQueryBuilder({ data: null }),
      }) as never,
    );
    const { status, body } = await readJson(
      await GET(new Request("http://localhost/api/reviews/missing"), params("missing")),
    );
    expect(status).toBe(404);
    expect(body.error).toBe("NOT_FOUND");
  });

  it("returns slides with media URLs", async () => {
    vi.mocked(createAdminSupabase).mockReturnValue(
      createSupabaseMock({
        from: (table) => {
          if (table === "review_links") {
            return createQueryBuilder({
              data: {
                id: "rid",
                public_id: "abc123",
                set_name: "Harbor",
                client_name: "Acme",
                orientation: "portrait",
                status: "pending",
                comment: null,
              },
            });
          }
          return createQueryBuilder({
            data: [{ slide_index: 0, clone_label: "ok" }],
          });
        },
      }) as never,
    );
    const { status, body } = await readJson(
      await GET(new Request("http://localhost/api/reviews/abc123"), params("abc123")),
    );
    expect(status).toBe(200);
    expect(body.set_name).toBe("Harbor");
    expect(body.slides).toEqual([
      {
        index: 0,
        clone: "ok",
        outer: "/api/reviews/abc123/media?slide=0&side=outer",
        inner: "/api/reviews/abc123/media?slide=0&side=inner",
      },
    ]);
  });
});
