import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

afterEach(() => { vi.unstubAllGlobals(); });

const event = {
  websiteId: "dfid_DliBSHc6MXbO4ktr5mKn8", domain: "duoshot.site", type: "custom",
  href: "https://duoshot.site/en/r/private-id?token=private-token",
  referrer: "https://example.com/signin?token=external-token",
  visitorId: "a3ab2331-989f-4cfa-91c6-2461c9e3c6bd",
  extraData: { eventName: "captures_added", count: 2, email: "private@example.com" },
  adClickIds: { gclid: "private-click" }, private: "private-data",
};
function request(consent = "accepted", body = event) {
  return new Request("https://duoshot.site/api/datafast/events", {
    method: "POST", headers: { Cookie: `duoshot_analytics_choice_v2=${consent}`, "Content-Type": "application/json", "User-Agent": "Browser", "X-Forwarded-For": "192.0.2.1" }, body: JSON.stringify(body),
  });
}

describe("Datafast proxy", () => {
  it("does not forward requests without current consent", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect((await POST(request("rejected"))).status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards consented events with private URLs and properties removed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"success":true}'));
    vi.stubGlobal("fetch", fetchMock);
    expect((await POST(request())).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://datafa.st/api/events");
    const payload = JSON.parse(options.body);
    expect(payload.href).toBe("https://duoshot.site/en/r/[id]");
    expect(payload.referrer).toBe("https://example.com");
    expect(payload.extraData).toEqual({ eventName: "captures_added", count: 2 });
    expect(options.body).not.toContain("private");
    expect(options.headers.get("x-forwarded-for")).toBe("192.0.2.1");
  });

  it("re-sanitizes only campaign labels on public landing pageviews", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"success":true}'));
    vi.stubGlobal("fetch", fetchMock);
    const href = `https://duoshot.site/en/guides/duoshot-vs-appscreens?utm_source=X!&utm_medium=Paid+Social&utm_campaign=${"A".repeat(80)}&utm_term=Fold_1.2-test&utm_content=Hero&ref=Partner&invite=secret&review_id=private&session_id=hidden&email=a@example.com&gclid=click#fragment`;
    expect((await POST(request("accepted", { ...event, type: "pageview", href, referrer: "https://duoshot.site/en/r/private?utm_source=old&token=secret" }))).status).toBe(200);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.href).toBe(`https://duoshot.site/en/guides/duoshot-vs-appscreens?utm_source=x&utm_medium=paidsocial&utm_campaign=${"a".repeat(64)}&utm_term=fold_1.2-test&utm_content=hero&ref=partner`);
    expect(payload.referrer).toBe("https://duoshot.site");
    expect(payload.adClickIds).toBeUndefined();
    expect(payload.extraData).toBeUndefined();
  });

  it.each([
    "", "?session_id=secret&token=private&email=a@example.com",
    "?utm_source=a%40example.com&utm_medium=a%2540example.com&utm_campaign=https%3A%2F%2Fexample.com&utm_term=&utm_content=!!!&ref=https%253A%252F%252Fexample.com",
  ])("keeps absent or rejected campaigns query-free (%s)", async (search) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"success":true}'));
    vi.stubGlobal("fetch", fetchMock);
    await POST(request("accepted", { ...event, type: "pageview", href: `https://duoshot.site/en/1398x2034${search}` }));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).href).toBe("https://duoshot.site/en/1398x2034");
  });

  it("drops campaigns from custom events and ignores unknown or private paths", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"success":true}'));
    vi.stubGlobal("fetch", fetchMock);
    await POST(request("accepted", { ...event, href: "https://duoshot.site/tool?utm_source=x" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).href).toBe("https://duoshot.site/tool");
    for (const path of ["/guides/private-id", "/tools/private-id", "/reset-password", "/account/private-id"]) {
      expect(await (await POST(request("accepted", { ...event, type: "pageview", href: `https://duoshot.site${path}?utm_source=x` }))).json()).toEqual({ ignored: true });
    }
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects other websites and event names", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect((await POST(request("accepted", { ...event, websiteId: "another-site" }))).status).toBe(400);
    expect((await POST(request("accepted", { ...event, extraData: { ...event.extraData, eventName: "unexpected" } }))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("contains upstream failures inside the analytics endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect((await POST(request())).status).toBe(503);
  });
});
