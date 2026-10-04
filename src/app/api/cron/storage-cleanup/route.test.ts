import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { removeStorageObjects } from "@/lib/storage-cleanup";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { readJson } from "@/test/supabase-mock";
import { GET } from "./route";

vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));
vi.mock("@/lib/storage-cleanup", () => ({ removeStorageObjects: vi.fn() }));

const request = (authorization?: string) => new Request("https://duoshot.test/api/cron/storage-cleanup", {
  headers: authorization ? { authorization } : {},
});
function admin(error: unknown = null) {
  const client = { rpc: vi.fn().mockResolvedValue({ data: 0, error }) };
  vi.mocked(createAdminSupabase).mockReturnValue(client as never);
  return client;
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.mocked(createAdminSupabase).mockReset();
  vi.mocked(removeStorageObjects).mockReset();
});

describe("storage cleanup cron", () => {
  it("rejects calls without the right secret", async () => {
    vi.stubEnv("CRON_SECRET", "secret");
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request("Bearer wrong"))).status).toBe(401);
    expect((await GET(request("secret"))).status).toBe(401);
    expect(createAdminSupabase).not.toHaveBeenCalled();
  });

  it("stays closed when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request("Bearer "))).status).toBe(401);
    expect((await GET(request("Bearer undefined"))).status).toBe(401);
    expect(createAdminSupabase).not.toHaveBeenCalled();
  });

  it("refunds abandoned exports, then removes expired objects", async () => {
    vi.stubEnv("CRON_SECRET", "secret");
    const client = admin();
    vi.mocked(removeStorageObjects).mockResolvedValue({ removed: 4, complete: true });
    expect(await readJson(await GET(request("Bearer secret")))).toEqual({ status: 200, body: { removed: 4, complete: true } });
    expect(client.rpc).toHaveBeenCalledWith("refund_abandoned_exports");
    expect(removeStorageObjects).toHaveBeenCalledWith(client);
    expect(client.rpc.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(removeStorageObjects).mock.invocationCallOrder[0]);
  });

  it("reports an unfinished sweep as 503 so the next run continues", async () => {
    vi.stubEnv("CRON_SECRET", "secret");
    admin();
    vi.mocked(removeStorageObjects).mockResolvedValue({ removed: 10000, complete: false });
    expect(await readJson(await GET(request("Bearer secret")))).toEqual({ status: 503, body: { removed: 10000, complete: false } });
  });

  it("stops before touching Storage if the refund RPC fails", async () => {
    vi.stubEnv("CRON_SECRET", "secret");
    admin({ message: "boom" });
    expect(await readJson(await GET(request("Bearer secret")))).toEqual({ status: 503, body: { error: "RESERVATION_CLEANUP_FAILED" } });
    expect(removeStorageObjects).not.toHaveBeenCalled();
  });

  it("surfaces Storage failures as 503", async () => {
    vi.stubEnv("CRON_SECRET", "secret");
    admin();
    vi.mocked(removeStorageObjects).mockRejectedValue(new Error("STORAGE_DELETE_FAILED"));
    expect(await readJson(await GET(request("Bearer secret")))).toEqual({ status: 503, body: { error: "STORAGE_DELETE_FAILED" } });
  });

  it("returns 503 without an admin client", async () => {
    vi.stubEnv("CRON_SECRET", "secret");
    vi.mocked(createAdminSupabase).mockReturnValue(null as never);
    expect((await GET(request("Bearer secret"))).status).toBe(503);
  });
});
