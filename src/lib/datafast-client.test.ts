import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const datafast = vi.hoisted(() => ({
  trackPageview: vi.fn(), track: vi.fn(), optOut: vi.fn(), isInitialized: vi.fn(() => true),
}));
const initDataFast = vi.hoisted(() => vi.fn());
vi.mock("datafast", () => ({ initDataFast }));

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
}

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  initDataFast.mockResolvedValue(datafast);
  datafast.isInitialized.mockReturnValue(true);
  datafast.track.mockResolvedValue(undefined);
  datafast.optOut.mockResolvedValue(undefined);
  vi.stubGlobal("window", { localStorage: storage(), location: { pathname: "/tool", protocol: "https:" } });
  vi.stubGlobal("document", { cookie: "" });
  vi.stubGlobal("sessionStorage", storage());
});
afterEach(() => { vi.unstubAllGlobals(); });

async function accept() {
  window.localStorage.setItem("duoshot_analytics_choice_v2", "accepted");
}

describe("Datafast consent and delivery", () => {
  it("preserves a previous refusal and requires new consent for the added provider", async () => {
    const { analyticsChoice } = await import("./analytics-consent");
    window.localStorage.setItem("duoshot_analytics_choice_v1", "accepted");
    expect(analyticsChoice()).toBeNull();
    window.localStorage.setItem("duoshot_analytics_choice_v1", "rejected");
    expect(analyticsChoice()).toBe("rejected");
    const { trackDatafast } = await import("./datafast-client");
    await trackDatafast("captures_added");
    expect(initDataFast).not.toHaveBeenCalled();
  });

  it("tracks normalized pageviews and custom events without repeated engagement pageviews", async () => {
    await accept();
    window.location.pathname = "/en/r/private-id";
    const { trackDatafast } = await import("./datafast-client");
    await trackDatafast("page_viewed");
    await trackDatafast("page_engagement", { seconds: 30 });
    await trackDatafast("page_engagement", { seconds: 60 });
    expect(initDataFast).toHaveBeenCalledWith(expect.objectContaining({ autoCapturePageviews: false, apiUrl: "/api/datafast/events" }));
    expect(datafast.trackPageview).toHaveBeenCalledExactlyOnceWith("/en/r/[id]");
    expect(datafast.track).toHaveBeenCalledWith("page_engagement", { audience: "anonymous", seconds: 30 });
  });

  it("clears tracking on withdrawal and does not send subsequent events", async () => {
    await accept();
    const { trackDatafast, setDatafastChoice } = await import("./datafast-client");
    await trackDatafast("captures_added");
    window.localStorage.setItem("duoshot_analytics_choice_v2", "rejected");
    await setDatafastChoice("rejected");
    await trackDatafast("export_requested");
    expect(datafast.optOut).toHaveBeenCalledOnce();
    expect(datafast.track).toHaveBeenCalledOnce();
  });

  it("stops an initialization that finishes after withdrawal", async () => {
    await accept();
    let resolveInit!: (value: typeof datafast) => void;
    const started = new Promise<void>((resolve) => initDataFast.mockImplementationOnce(() => {
      resolve(); return new Promise((ready) => { resolveInit = ready; });
    }));
    const { trackDatafast, setDatafastChoice } = await import("./datafast-client");
    const delivery = trackDatafast("captures_added");
    await started;
    window.localStorage.setItem("duoshot_analytics_choice_v2", "rejected");
    const withdrawal = setDatafastChoice("rejected");
    resolveInit(datafast);
    await Promise.all([delivery, withdrawal]);
    expect(datafast.optOut).toHaveBeenCalled();
    expect(datafast.track).not.toHaveBeenCalled();
  });

  it("deduplicates confirmed results including simultaneous recovery and retries", async () => {
    await accept();
    const { trackDatafastConversion } = await import("./datafast-client");
    await Promise.all([
      trackDatafastConversion("export_succeeded", "private-export-id", { image_count: 2 }),
      trackDatafastConversion("export_succeeded", "private-export-id", { image_count: 2 }),
    ]);
    await trackDatafastConversion("export_succeeded", "private-export-id");
    expect(datafast.track).toHaveBeenCalledExactlyOnceWith("export_succeeded", { audience: "anonymous", image_count: 2 });
    expect(JSON.stringify(datafast.track.mock.calls)).not.toContain("private-export-id");
  });

  it("keeps a failed delivery from marking a result as already tracked", async () => {
    await accept();
    datafast.track.mockRejectedValueOnce(new Error("unavailable"));
    const { trackDatafastConversion } = await import("./datafast-client");
    await trackDatafastConversion("review_created", "result");
    await trackDatafastConversion("review_created", "result");
    expect(datafast.track).toHaveBeenCalledTimes(2);
  });
});
