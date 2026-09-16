import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSupabase, createPublicSupabase } from "@/lib/supabase/admin";
import { createQueryBuilder, createSupabaseMock, readJson } from "@/test/supabase-mock";
import { POST } from "./route";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminSupabase: vi.fn(),
  createPublicSupabase: vi.fn(),
}));

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/reviews/abc/decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(createAdminSupabase).mockReset();
});

describe("POST /api/reviews/[id]/decision", () => {
  it("rejects the Harbor demo", async () => {
    const { status, body } = await readJson(await POST(jsonRequest({ action: "approve" }), params("harbor")));
    expect(status).toBe(403);
    expect(body.error).toBe("DEMO_READONLY");
  });

  it("rejects an unknown action", async () => {
    const { status, body } = await readJson(await POST(jsonRequest({ action: "maybe" }), params("abc123")));
    expect(status).toBe(400);
    expect(body.error).toBe("INVALID_ACTION");
  });

  it("returns 404 when the review is missing without an admin client", async () => {
    vi.mocked(createAdminSupabase).mockReturnValue(null);
    vi.mocked(createPublicSupabase).mockReturnValue(createSupabaseMock({}) as never);
    const { status, body } = await readJson(await POST(jsonRequest({ action: "approve" }), params("abc123")));
    expect(status).toBe(404);
    expect(body.error).toBe("NOT_FOUND");
  });

  it("records an approval", async () => {
    vi.mocked(createAdminSupabase).mockReturnValue(
      createSupabaseMock({
        from: () =>
          createQueryBuilder({
            data: { public_id: "abc123", status: "approved", comment: "ok" },
          }),
      }) as never,
    );
    const { status, body } = await readJson(
      await POST(jsonRequest({ action: "approve", comment: "ok" }), params("abc123")),
    );
    expect(status).toBe(200);
    expect(body.status).toBe("approved");
    expect(body.comment).toBe("ok");
  });
});
