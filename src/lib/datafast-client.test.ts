import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const datafast = vi.hoisted(() => ({
  trackPageview: vi.fn(), trackScreen: vi.fn(), track: vi.fn(), optOut: vi.fn(), isInitialized: vi.fn(() => true),
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
  datafast.trackScreen.mockResolvedValue(undefined);
  datafast.optOut.mockResolvedValue(undefined);
  vi.stubGlobal("window", { localStorage: storage(), location: { pathname: "/tool", search: "", protocol: "https:" } });
  vi.stubGlobal("document", { cookie: "" });
  vi.stubGlobal("sessionStorage", storage());
});
afterEach(() => { vi.unstubAllGlobals(); });

async function accept() {
  window.localStorage.setItem("duoshot_analytics_choice_v2", "accepted");
}

describe("Datafast consent and delivery", () => {
  it.each([null, "rejected"])("captures landing labels without loading or writing before consent (%s)", async (choice) => {
    if (choice) window.localStorage.setItem("duoshot_analytics_choice_v2", choice);
    window.location.search = "?utm_source=X&email=private@example.com";
    const localWrite = vi.spyOn(window.localStorage, "setItem");
    const sessionWrite = vi.spyOn(sessionStorage, "setItem");
    const { trackDatafast } = await import("./datafast-client");
    await trackDatafast("page_viewed");
    expect(initDataFast).not.toHaveBeenCalled();
    expect(datafast.trackScreen).not.toHaveBeenCalled();
    expect(datafast.trackPageview).not.toHaveBeenCalled();
    expect(localWrite).not.toHaveBeenCalled();
    expect(sessionWrite).not.toHaveBeenCalled();
    expect(document.cookie).toBe("");

    // The import captures the landing URL even if no event fires before navigation.
    window.location.pathname = "/en/pricing";
    window.location.search = "?utm_source=Later&session_id=secret";
    await accept();
    await trackDatafast("captures_added");
    expect(datafast.trackScreen).toHaveBeenCalledExactlyOnceWith("/en/pricing", { href: "https://duoshot.site/en/pricing?utm_source=x" });
    expect(datafast.track).toHaveBeenCalledOnce();
    await trackDatafast("page_engagement", { seconds: 30 });
    expect(datafast.trackPageview).not.toHaveBeenCalled();
    await trackDatafast("page_viewed");
    expect(datafast.trackPageview).toHaveBeenCalledExactlyOnceWith("/en/pricing");
  });

  it("adds sanitized campaigns only to the first pageview with existing consent", async () => {
    await accept();
    window.location.search = "?utm_source=X!&utm_medium=Social&utm_campaign=Launch&utm_term=Fold&utm_content=Hero&ref=Friend&token=secret&session_id=private&email=a@example.com";
    const { trackDatafast, setDatafastChoice } = await import("./datafast-client");
    await Promise.all([trackDatafast("page_viewed"), trackDatafast("page_viewed")]);
    expect(datafast.trackScreen).toHaveBeenCalledExactlyOnceWith("/tool", {
      href: "https://duoshot.site/tool?utm_source=x&utm_medium=social&utm_campaign=launch&utm_term=fold&utm_content=hero&ref=friend",
    });
    expect(datafast.trackPageview).toHaveBeenCalledExactlyOnceWith("/tool");
    window.localStorage.setItem("duoshot_analytics_choice_v2", "rejected");
    await setDatafastChoice("rejected");
    await accept();
    await setDatafastChoice("accepted");
    window.location.pathname = "/pricing";
    await trackDatafast("page_viewed");
    expect(datafast.trackScreen).toHaveBeenCalledOnce();
    expect(datafast.trackPageview).toHaveBeenLastCalledWith("/pricing");
  });

  it("does not pick up campaigns from later SPA URLs when the landing had none", async () => {
    const { trackDatafast } = await import("./datafast-client");
    window.location.search = "?utm_source=later";
    await accept();
    await trackDatafast("page_viewed");
    expect(datafast.trackScreen).not.toHaveBeenCalled();
    expect(datafast.trackPageview).toHaveBeenCalledExactlyOnceWith("/tool");
  });

  it("retains the campaign until an allowed pageview can be sent", async () => {
    window.location.pathname = "/auth/callback";
    window.location.search = "?utm_source=X&utm_campaign=a%40example.com";
    const { trackDatafast } = await import("./datafast-client");
    await accept();
    await trackDatafast("page_viewed");
    expect(datafast.trackScreen).not.toHaveBeenCalled();
    window.location.pathname = "/1398x2034";
    window.location.search = "";
    datafast.trackScreen.mockRejectedValueOnce(new Error("unavailable"));
    expect(await trackDatafast("page_viewed")).toBe(false);
    await trackDatafast("page_viewed");
    expect(datafast.trackScreen).toHaveBeenLastCalledWith("/1398x2034", { href: "https://duoshot.site/1398x2034?utm_source=x" });
    expect(datafast.trackPageview).not.toHaveBeenCalled();
  });

  it("defers capture during SSR and captures synchronously on the first client call", async () => {
    const browser = window;
    vi.stubGlobal("window", undefined);
    const { trackDatafast } = await import("./datafast-client");
    vi.stubGlobal("window", browser);
    await accept();
    window.location.search = "?utm_source=first";
    const delivery = trackDatafast("page_viewed");
    window.location.search = "?utm_source=second";
    await delivery;
    expect(datafast.trackScreen).toHaveBeenCalledExactlyOnceWith("/tool", { href: "https://duoshot.site/tool?utm_source=first" });
  });

  it("keeps campaign labels on the first href only with the installed SDK", async () => {
    const { DataFastClient, createMemoryStorageAdapter } = await vi.importActual<typeof import("datafast")>("datafast");
    const client = new DataFastClient();
    const fetchMock = vi.fn().mockImplementation(async () => new Response('{"success":true}'));
    vi.stubGlobal("fetch", fetchMock);
    await client.init({ appId: "test", domain: "duoshot.site", platform: "web", storage: createMemoryStorageAdapter(), maxQueueSize: 100 });
    // The web SDK delegates explicit trackPageview paths directly to trackScreen.
    initDataFast.mockResolvedValue(Object.assign(client, { trackPageview: (path: string) => client.trackScreen(path) }));
    try {
      window.location.search = "?utm_source=X&session_id=secret";
      await accept();
      const { trackDatafast } = await import("./datafast-client");
      await trackDatafast("page_viewed");
      await trackDatafast("captures_added");
      window.location.pathname = "/pricing";
      await trackDatafast("page_viewed");
      await client.flush();
      const payloads = fetchMock.mock.calls.map(([, options]) => JSON.parse(options.body));
      expect(payloads.map(({ href }) => href)).toEqual([
        "https://duoshot.site/tool?utm_source=x", "https://duoshot.site/tool", "https://duoshot.site/pricing",
      ]);
      expect(payloads[2].referrer).toBe("https://duoshot.site/tool");
      expect(JSON.stringify(payloads)).not.toContain("secret");
    } finally {
      await client.optOut();
    }
  });

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
