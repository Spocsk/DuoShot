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
