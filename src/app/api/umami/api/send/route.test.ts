import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { UMAMI_WEBSITE_ID } from "@/lib/umami-config";

const event = {
  website: UMAMI_WEBSITE_ID, hostname: "duoshot.site", name: "captures_added",
  url: "/en/r/private-id?token=private-token",
  referrer: "https://example.com/signin?token=external-token", title: "private-title",
  screen: "1920x1080", language: "fr-FR",
  data: { count: 2, audience: "external", email: "private@example.com" },
  id: "private-id", private: "private-data",
};
function request(payload: object = event, type = "event", consent = "accepted") {
  return new Request("https://duoshot.site/api/umami/api/send", {
    method: "POST", headers: { Cookie: `duoshot_analytics_choice_v2=${consent}`, "Content-Type": "application/json", "User-Agent": "Browser", "X-Forwarded-For": "192.0.2.1" }, body: JSON.stringify({ type, payload, private: "secret" }),
  });
}
let upstream: ReturnType<typeof vi.fn>;
beforeEach(() => { upstream = vi.fn().mockImplementation(async () => new Response('{"ok":true}')); vi.stubGlobal("fetch", upstream); });
afterEach(() => { vi.unstubAllGlobals(); });
const sent = () => JSON.parse(upstream.mock.calls.at(-1)![1].body);

describe("Umami proxy", () => {
  it.each(["rejected", "", "accepted_extra"])("does not forward without current consent: %s", async (consent) => {
    expect(await (await POST(request(event, "event", consent))).json()).toEqual({ ignored: true });
    expect(upstream).not.toHaveBeenCalled();
  });
  it("ignores internal visitors even with consent", async () => {
    const req = new Request("https://duoshot.site/api/umami/api/send", {
      method: "POST", headers: { Cookie: "duoshot_analytics_choice_v2=accepted; duoshot_internal=1", "Content-Type": "application/json" }, body: JSON.stringify({ type: "event", payload: event }),
    });
    expect(await (await POST(req)).json()).toEqual({ ignored: true });
    expect(upstream).not.toHaveBeenCalled();
  });
  it("forwards only allowed fields and values, normalizes URLs and preserves UA and IP", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(upstream.mock.calls[0][0]).toBe("https://analytics.dylan-cdo.fr/api/send");
    expect(sent()).toEqual({ type: "event", payload: { website: UMAMI_WEBSITE_ID, hostname: "duoshot.site", url: "/en/r/[id]", referrer: "https://example.com", title: "", screen: "1920x1080", language: "fr-FR", name: "captures_added", data: { count: 2, audience: "external" } } });
    const headers = upstream.mock.calls[0][1].headers;
    expect(headers.get("user-agent")).toBe("Browser");
    expect(headers.get("x-forwarded-for")).toBe("192.0.2.1");
    expect(headers.get("x-duoshot-client-ip")).toBe("192.0.2.1");
    expect(headers.get("true-client-ip")).toBe("192.0.2.1");
    expect(upstream.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(upstream.mock.calls[0][1].body).not.toContain("private");
  });
  it("re-sanitizes campaigns only on native pageviews", async () => {
    const page = { ...event, name: undefined, url: "/en/1398x2034?utm_source=X!&utm_medium=Paid+Social&utm_campaign=launch&ref=Partner&session_id=secret&email=a@example.com#fragment" };
    await POST(request(page));
    expect(sent().payload.url).toBe("/en/1398x2034?utm_source=x&utm_medium=paidsocial&utm_campaign=launch&ref=partner");
    expect(sent().payload.data).toBeUndefined();
    await POST(request({ ...page, name: "captures_added" }));
    expect(sent().payload.url).toBe("/en/1398x2034");
  });
  it("allows identify with audience data only and never an identifier", async () => {
    await POST(request(event, "identify"));
    expect(upstream).not.toHaveBeenCalled(); // identify cannot carry an event name
    await POST(request({ ...event, name: undefined, url: "/tool?utm_source=x", id: "distinct", data: { audience: "internal", count: 1, id: "secret" } }, "identify"));
    expect(sent()).toMatchObject({ type: "identify", payload: { url: "/tool", data: { audience: "internal" } } });
    expect(sent().payload.id).toBeUndefined();
  });
  it.each([
    { website: "another" }, { hostname: "another.test" }, { name: "unexpected" }, { name: "payment_succeeded" },
  ])("rejects invalid sites and names %j", async (override) => {
    expect((await POST(request({ ...event, ...override }))).status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });
  it("ignores private or foreign URLs and filters invalid properties", async () => {
    for (const url of ["/reset-password", "/guides/private", "https://other.test/tool"]) {
      expect(await (await POST(request({ ...event, url }))).json()).toEqual({ ignored: true });
    }
    expect(upstream).not.toHaveBeenCalled();
    await POST(request({ ...event, data: { audience: "external", count: {}, reason: "x".repeat(256), side: true, seconds: null, email: "secret" } }));
    expect(sent().payload.data).toEqual({ audience: "external", side: true });
  });
  it("limits UTF-8 body size to 16 KiB", async () => {
    expect((await POST(request({ ...event, title: "é".repeat(9000) }))).status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });
  it.each(["network", "timeout", "status"])("returns 503 for upstream failure: %s", async (failure) => {
    if (failure === "status") upstream.mockResolvedValue(new Response("down", { status: 500 }));
    else upstream.mockRejectedValue(new Error(failure));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "ANALYTICS_UNAVAILABLE" });
  });
});
