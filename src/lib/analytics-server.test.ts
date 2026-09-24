import { afterEach, describe, expect, it, vi } from "vitest";
import { trackServerEvent } from "./analytics-server";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("consent-gated server analytics", () => {
  it("does not send an event without accepted consent", async () => {
    vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "test-token");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const query = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { accepted: false }, error: null }),
    };
    await trackServerEvent({ from: () => query } as never, "user-1", "export_succeeded", "export-1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends only allowlisted event data to the EU endpoint after consent", async () => {
    vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "test-token");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const query = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { accepted: true }, error: null }),
    };
    await trackServerEvent({ from: () => query } as never, "user-1", "export_succeeded", "export-1", { image_count: 2 });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("https://api-eu.mixpanel.com/track?verbose=1");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body[0].properties).toMatchObject({ distinct_id: "user-1", $insert_id: "export-1", image_count: 2 });
  });
});
