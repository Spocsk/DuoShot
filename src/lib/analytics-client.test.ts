import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const umami = vi.hoisted(() => ({
  trackUmami: vi.fn(),
  setUmamiChoice: vi.fn(),
  setUmamiAudience: vi.fn(),
}));
vi.mock("./umami-client", () => umami);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  umami.trackUmami.mockResolvedValue(true);
  umami.setUmamiChoice.mockResolvedValue(undefined);
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) },
    dispatchEvent: vi.fn(),
  });
  vi.stubGlobal("CustomEvent", class { constructor(public type: string, public init?: unknown) {} });
});

afterEach(() => { vi.unstubAllGlobals(); });

describe("analytics client", () => {
  it("is configured by Umami alone", async () => {
    const a = await import("./analytics-client");
    expect(a.analyticsConfigured()).toBe(true);
  });

  it("routes product events and consent changes to Umami only", async () => {
    const a = await import("./analytics-client");
    expect(await a.setAnalyticsChoice("accepted")).toBe(true);
    expect(umami.setUmamiChoice).toHaveBeenCalledWith("accepted");
    await a.trackProduct("captures_added", { count: 2 });
    expect(umami.trackUmami).toHaveBeenCalledExactlyOnceWith("captures_added", { count: 2, audience: "anonymous" });
    expect(await a.setAnalyticsChoice("rejected")).toBe(true);
    expect(umami.setUmamiChoice).toHaveBeenLastCalledWith("rejected");
  });

  it("tags the signed-in audience only after consent", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ audience: "internal" }) });
    vi.stubGlobal("fetch", fetchMock);
    const a = await import("./analytics-client");
    await a.refreshAnalyticsAudience();
    expect(fetchMock).not.toHaveBeenCalled();
    await a.setAnalyticsChoice("accepted");
    await a.refreshAnalyticsAudience();
    expect(umami.setUmamiAudience).toHaveBeenCalledWith("internal");
    await a.trackProduct("page_viewed");
    expect(umami.trackUmami).toHaveBeenLastCalledWith("page_viewed", { audience: "internal" });
  });
});
