import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkoutAvailable } from "@/lib/billing-availability";
import { readJson } from "@/test/supabase-mock";
import { GET } from "./route";

vi.mock("@/lib/billing-availability", () => ({ checkoutAvailable: vi.fn() }));

beforeEach(() => vi.mocked(checkoutAvailable).mockReset());

describe("GET /api/billing/availability", () => {
  it.each([true, false])("returns checkoutAvailable=%s without caching", async (available) => {
    vi.mocked(checkoutAvailable).mockReturnValue(available);
    const response = GET();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const { status, body } = await readJson(response);
    expect(status).toBe(200);
    expect(body).toEqual({ checkoutAvailable: available });
  });

  it("evaluates public availability without a user id", () => {
    vi.mocked(checkoutAvailable).mockReturnValue(false);
    GET();
    expect(checkoutAvailable).toHaveBeenCalledWith();
  });
});
