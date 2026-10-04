import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const datafast = vi.hoisted(() => ({
  trackDatafast: vi.fn(),
  setDatafastChoice: vi.fn(),
  setDatafastAudience: vi.fn(),
}));
vi.mock("./datafast-client", () => datafast);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  datafast.trackDatafast.mockResolvedValue(true);
  datafast.setDatafastChoice.mockResolvedValue(undefined);
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) },
    dispatchEvent: vi.fn(),
  });
  vi.stubGlobal("CustomEvent", class { constructor(public type: string, public init?: unknown) {} });
});

afterEach(() => { vi.unstubAllGlobals(); });

describe("analytics client", () => {
  it("is configured by DataFast alone", async () => {
    const a = await import("./analytics-client");
    expect(a.analyticsConfigured()).toBe(true);
  });

  it("routes product events and consent changes to DataFast only", async () => {
    const a = await import("./analytics-client");
    expect(await a.setAnalyticsChoice("accepted")).toBe(true);
    expect(datafast.setDatafastChoice).toHaveBeenCalledWith("accepted");
    await a.trackProduct("captures_added", { count: 2 });
    expect(datafast.trackDatafast).toHaveBeenCalledExactlyOnceWith("captures_added", { count: 2, audience: "anonymous" });
    expect(await a.setAnalyticsChoice("rejected")).toBe(true);
    expect(datafast.setDatafastChoice).toHaveBeenLastCalledWith("rejected");
  });

  it("tags the signed-in audience only after consent", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ audience: "internal" }) });
    vi.stubGlobal("fetch", fetchMock);
    const a = await import("./analytics-client");
    await a.refreshAnalyticsAudience();
    expect(fetchMock).not.toHaveBeenCalled();
    await a.setAnalyticsChoice("accepted");
    await a.refreshAnalyticsAudience();
    expect(datafast.setDatafastAudience).toHaveBeenCalledWith("internal");
    await a.trackProduct("page_viewed");
    expect(datafast.trackDatafast).toHaveBeenLastCalledWith("page_viewed", { audience: "internal" });
  });
});
