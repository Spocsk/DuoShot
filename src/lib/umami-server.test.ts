import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendUmamiServerEvent } from "./umami-server";
import { UMAMI_WEBSITE_ID } from "./umami-config";

beforeEach(() => { vi.stubEnv("UMAMI_SEND_URL", ""); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe("Umami server revenue", () => {
  it("sends the revenue payload with a server user agent and timeout", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal("fetch", fetchMock);
    const data = { revenue: 12, currency: "EUR", plan: "indie", audience: "external" };
    await sendUmamiServerEvent("payment_succeeded", data);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://analytics.dylan-cdo.fr/api/send");
    expect(options.headers["User-Agent"]).toBe("Mozilla/5.0 (X11; Linux x86_64) DuoShot/1.0");
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(options.body)).toEqual({ type: "event", payload: { website: UMAMI_WEBSITE_ID, hostname: "duoshot.site", url: "/billing/webhook", language: "fr-FR", screen: "0x0", title: "", referrer: "", name: "payment_succeeded", data } });
  });
  it("supports a runtime endpoint override", async () => {
    vi.stubEnv("UMAMI_SEND_URL", "http://umami.internal/api/send");
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}')); vi.stubGlobal("fetch", fetchMock);
    await sendUmamiServerEvent("payment_succeeded", {});
    expect(fetchMock.mock.calls[0][0]).toBe("http://umami.internal/api/send");
  });
  it("logs a silent Umami rejection despite HTTP 200 without throwing or exposing payload data", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"beep":"boop"}', { status: 200 })));
    await expect(sendUmamiServerEvent("payment_succeeded", { revenue: 12 })).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledExactlyOnceWith("[umami] server event unavailable");
  });
  it.each(["network", "timeout", "status"])("swallows and logs %s failures without payload data", async (failure) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", failure === "status" ? vi.fn().mockResolvedValue(new Response("down", { status: 503 })) : vi.fn().mockRejectedValue(new Error(failure)));
    await expect(sendUmamiServerEvent("payment_succeeded", { revenue: 12 })).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith("[umami] server event unavailable");
  });
});
