import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UmamiTracker } from "./umami-client";

let values: Map<string, string>;
let session: Map<string, string>;
let tracker: UmamiTracker;
let payloads: unknown[];
let script: { src: string; defer: boolean; dataset: Record<string, string>; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
let append: ReturnType<typeof vi.fn>;
const location = { pathname: "/en/r/private-id", search: "?utm_source=X!&token=secret", origin: "https://duoshot.site", protocol: "https:" };

beforeEach(() => {
  vi.resetModules();
  values = new Map(); session = new Map(); payloads = [];
  tracker = {
    track: vi.fn(async (callback) => { payloads.push(callback({ url: "PRIVATE", title: "private title", referrer: "private" })); }),
    identify: vi.fn().mockResolvedValue(undefined),
  };
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("sessionStorage", { getItem: (key: string) => session.get(key) ?? null, setItem: (key: string, value: string) => session.set(key, value) });
  location.pathname = "/en/r/private-id"; location.search = "?utm_source=X!&token=secret";
  vi.stubGlobal("window", { localStorage: storage, location, umami: tracker, setInterval, clearInterval, setTimeout, clearTimeout });
  script = { src: "", defer: false, dataset: {}, addEventListener: vi.fn(), removeEventListener: vi.fn(), remove: vi.fn() };
  append = vi.fn();
  vi.stubGlobal("document", { referrer: "https://example.com/signin?token=private", cookie: "", querySelector: vi.fn(() => null), createElement: vi.fn(() => script), head: { appendChild: append } });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const accept = () => values.set("duoshot_analytics_choice_v2", "accepted");

describe("Umami consent and delivery", () => {
  it("never loads a script or sends before agreement, including a previous refusal", async () => {
    const { trackUmami } = await import("./umami-client");
    expect(await trackUmami("page_viewed")).toBe(false);
    values.set("duoshot_analytics_choice_v1", "rejected");
    expect(await trackUmami("captures_added")).toBe(false);
    expect(append).not.toHaveBeenCalled();
    expect(tracker.track).not.toHaveBeenCalled();
    expect(tracker.identify).not.toHaveBeenCalled();
  });

  it("sends normalized native pageviews, campaigns once and audience without an ID", async () => {
    accept();
    const { trackUmami, setUmamiAudience } = await import("./umami-client");
    setUmamiAudience("internal");
    await trackUmami("page_viewed");
    await trackUmami("page_engagement", { seconds: 30, page: "/r/[id]", locale: "en" });
    await trackUmami("page_viewed");
    expect(payloads).toEqual([
      { url: "/en/r/[id]?utm_source=x", referrer: "https://example.com", title: "" },
      { url: "/en/r/[id]", referrer: "", title: "", name: "page_engagement", data: { audience: "internal", seconds: 30, page: "/r/[id]", locale: "en" } },
      { url: "/en/r/[id]", referrer: "https://example.com", title: "" },
    ]);
    expect(tracker.identify).toHaveBeenCalledExactlyOnceWith({ audience: "internal" });
    setUmamiAudience("anonymous");
    setUmamiAudience("external");
    await trackUmami("captures_added", { count: 2 });
    expect(tracker.identify).toHaveBeenNthCalledWith(2, { audience: "anonymous" });
    expect(tracker.identify).toHaveBeenLastCalledWith({ audience: "external" });
    expect(payloads.at(-1)).toMatchObject({ data: { audience: "external", count: 2 } });
  });

  it("excludes internal visitors even after acceptance", async () => {
    accept();
    (document as unknown as { cookie: string }).cookie = "duoshot_internal=1";
    const { trackUmami } = await import("./umami-client");
    expect(await trackUmami("page_viewed")).toBe(false);
    expect(append).not.toHaveBeenCalled();
    expect(tracker.track).not.toHaveBeenCalled();
    expect(tracker.identify).not.toHaveBeenCalled();
  });

  it("captures sanitized campaigns in memory before navigation and ignores private routes", async () => {
    const { trackUmami } = await import("./umami-client");
    location.pathname = "/reset-password"; accept();
    expect(await trackUmami("page_viewed")).toBe(false);
    location.pathname = "/tool"; location.search = "?utm_source=other";
    await trackUmami("page_viewed");
    expect(payloads[0]).toMatchObject({ url: "/tool?utm_source=x" });
  });

  it("injects the first-party script after acceptance and waits for the tracker", async () => {
    vi.useFakeTimers(); delete window.umami;
    const { trackUmami } = await import("./umami-client");
    accept();
    const sent = trackUmami("page_viewed");
    await vi.advanceTimersByTimeAsync(1);
    expect(append).toHaveBeenCalledOnce();
    expect(script).toMatchObject({ src: "/u/script.js", defer: true, dataset: { websiteId: "182b11a4-f44b-4dcf-8f07-448e8ef493c4", hostUrl: "https://duoshot.site/api/umami", domains: "duoshot.site", autoTrack: "false", fetchCredentials: "same-origin" } });
    window.umami = tracker;
    await vi.advanceTimersByTimeAsync(50);
    expect(await sent).toBe(true);
    expect(document.cookie).toContain("duoshot_analytics_choice_v2=accepted");
  });

  it("times out silently when the script never initializes", async () => {
    vi.useFakeTimers(); delete window.umami; accept();
    const { trackUmami } = await import("./umami-client");
    const sent = trackUmami("page_viewed");
    await vi.advanceTimersByTimeAsync(2100);
    expect(await sent).toBe(false);
    expect(script.remove).toHaveBeenCalledOnce();
    expect(tracker.track).not.toHaveBeenCalled();
  });

  it("disables calls on refusal even if script initialization finishes later", async () => {
    vi.useFakeTimers(); delete window.umami; accept();
    const { trackUmami, setUmamiChoice } = await import("./umami-client");
    const sent = trackUmami("captures_added");
    await vi.advanceTimersByTimeAsync(1);
    values.set("duoshot_analytics_choice_v2", "rejected");
    await setUmamiChoice("rejected");
    window.umami = tracker;
    await vi.advanceTimersByTimeAsync(50);
    expect(await sent).toBe(false);
    expect(values.get("umami.disabled")).toBe("1");
    await trackUmami("page_viewed");
    expect(tracker.track).not.toHaveBeenCalled();
    expect(tracker.identify).not.toHaveBeenCalled();
    accept(); await setUmamiChoice("accepted");
    expect(values.has("umami.disabled")).toBe(false);
    await trackUmami("page_viewed");
    expect(tracker.track).toHaveBeenCalledOnce();
  });

  it("deduplicates conversions in session storage without sending result IDs", async () => {
    accept(); const { trackUmamiConversion } = await import("./umami-client");
    await Promise.all([trackUmamiConversion("export_succeeded", "private-export", { image_count: 2 }), trackUmamiConversion("export_succeeded", "private-export")]);
    await trackUmamiConversion("export_succeeded", "private-export");
    expect(payloads).toHaveLength(2);
    expect(payloads[1]).toMatchObject({ name: "export_succeeded", data: { audience: "anonymous", image_count: 2 } });
    expect(JSON.stringify(payloads)).not.toContain("private-export");
    expect(session.has("duoshot_umami:export_succeeded:private-export")).toBe(true);
  });

  it("contains delivery failures and lets failed conversions retry", async () => {
    accept(); vi.mocked(tracker.track).mockRejectedValueOnce(new Error("offline"));
    const { trackUmamiConversion } = await import("./umami-client");
    await trackUmamiConversion("review_created", "result");
    expect(session.size).toBe(0);
    await trackUmamiConversion("review_created", "result");
    expect(payloads.at(-1)).toMatchObject({ name: "review_created" });
    expect(session.size).toBe(1);
  });
});
