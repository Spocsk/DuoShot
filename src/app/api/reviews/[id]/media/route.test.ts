import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createStorageMock, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { GET } from "./route";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabase: vi.fn(),
}));

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.mocked(createAdminSupabase).mockReset();
});

describe("GET /api/reviews/[id]/media", () => {
  it("returns a Harbor JPEG without admin storage", async () => {
    const response = await GET(
      new Request("http://localhost/api/reviews/harbor/media?slide=0&side=outer"),
      params("harbor"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(100);
    expect(createAdminSupabase).not.toHaveBeenCalled();
  }, 30_000);

  it("returns 503 without an admin client", async () => {
    vi.mocked(createAdminSupabase).mockReturnValue(null);
    const { status, body } = await readJson(
      await GET(new Request("http://localhost/api/reviews/abc/media?slide=0&side=outer"), params("abc")),
    );
    expect(status).toBe(503);
    expect(body.error).toBe("STORAGE_UNAVAILABLE");
  });

  it("returns 404 when the object is missing", async () => {
    vi.mocked(createAdminSupabase).mockReturnValue(
      createSupabaseMock({
        storage: createStorageMock({
          download: async () => ({ data: null, error: { message: "missing" } }),
        }),
      }) as never,
    );
    const { status, body } = await readJson(
      await GET(new Request("http://localhost/api/reviews/abc/media?slide=0&side=inner"), params("abc")),
    );
    expect(status).toBe(404);
    expect(body.error).toBe("NOT_FOUND");
  });
});
