import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../next.config";
import { proxy } from "./proxy";
import { LOCALE_COOKIE } from "./lib/locale";
import { updateSession } from "./lib/supabase/proxy";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE, readAttribution } from "./lib/attribution";

vi.mock("@/lib/supabase/proxy", () => ({ updateSession: vi.fn(async () => NextResponse.next()) }));

const call = (headers: Record<string, string>, path = "/api/internal/render-worker") =>
  proxy(new NextRequest(`http://127.0.0.1:3000${path}`, { method: "POST", headers }));

beforeEach(() => {
  vi.stubEnv("DUOSHOT_LOCALIZED_PAGE_ROUTES", nextConfig.env!.DUOSHOT_LOCALIZED_PAGE_ROUTES!);
});
afterEach(() => vi.unstubAllEnvs());

describe("proxy locale redirects", () => {
  it.each(["GET", "HEAD"])("passes unknown %s pages through to Next's 404 handler", async (method) => {
    const preferences: Record<string, string>[] = [{}, { "accept-language": "fr" }, { cookie: `${LOCALE_COOKIE}=fr` }, { cookie: `${LOCALE_COOKIE}=en` }];
    for (const pathname of ["/xyz-nope", "/en/xyz-nope", "/tool/xyz-nope", "/en/account/xyz-nope", "/invite/token/xyz-nope"]) {
      for (const headers of preferences) {
        const response = await proxy(new NextRequest(`https://duoshot.site${pathname}?x=1`, { method, headers }));
        expect(response.headers.get("location")).toBeNull();
        expect(response.headers.get("x-middleware-next")).toBe("1");
      }
    }
  });

  it.each(["/tool", "/account", "/login", "/signup", "/forgot-password", "/reset-password", "/invite/token"])("keeps valid locale redirects for %s and preserves queries", async (path) => {
    const search = "?next=%2Ftool&x=1";
    const en = await proxy(new NextRequest(`https://duoshot.site${path}${search}`));
    expect(en.status).toBe(307);
    expect(en.headers.get("location")).toBe(`https://duoshot.site/en${path}${search}`);
    const fr = await proxy(new NextRequest(`https://duoshot.site/en${path}${search}`, {
      headers: { "accept-language": "fr" },
    }));
    expect(fr.status).toBe(307);
    expect(fr.headers.get("location")).toBe(`https://duoshot.site${path}${search}`);
    const settled = await proxy(new NextRequest(`https://duoshot.site/en${path}${search}`));
    expect(settled.headers.get("location")).toBeNull();
  });
});

describe("proxy internal-route gate", () => {
  it("lets the worker's loopback call through to the route", async () => {
    const response = await call({ host: "127.0.0.1:3000", "x-forwarded-for": "127.0.0.1" });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("answers 404 to anything routed by Traefik or addressed by a public name", async () => {
    expect((await call({ host: "duoshot.site", "x-real-ip": "203.0.113.9", "x-forwarded-for": "203.0.113.9" })).status).toBe(404);
    expect((await call({ host: "127.0.0.1:3000", "x-real-ip": "203.0.113.9" })).status).toBe(404);
    expect((await call({ host: "duoshot.site" }, "/api/internal")).status).toBe(404);
  });
});

describe("proxy first-touch attribution", () => {
  it.each(["/", "/tool"])("captures attribution on landing %s, including locale redirects", async (path) => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await proxy(new NextRequest(`https://duoshot.site${path}?utm_source=GOOGLE&utm_content=Hero!`, {
      headers: { referer: "https://news.example/private?email=a@example.com" },
    }));
    const stored = response.cookies.get(ATTRIBUTION_COOKIE)!;
    expect(stored).toMatchObject({ maxAge: ATTRIBUTION_MAX_AGE, path: "/", sameSite: "lax", secure: true, httpOnly: true });
    expect(stored).not.toHaveProperty("domain");
    expect(JSON.parse(stored.value)).toEqual({ utm_source: "google", utm_content: "hero", referrer: "news.example" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    if (path === "/tool") {
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("https://duoshot.site/en/tool?utm_source=GOOGLE&utm_content=Hero!");
      expect(response.headers.get("vary")).toBe("Accept-Language, Cookie");
    }
    // Exercise the actual Set-Cookie encoding used by the browser on checkout.
    expect(readAttribution(response.headers.get("set-cookie")!.split(";")[0], "duoshot.site"))
      .toEqual(JSON.parse(stored.value));
  });

  it.each(["", "broken", "%E0%A4%A", encodeURIComponent(JSON.stringify({ utm_source: "first" }))])("never replaces or extends an existing cookie (%s)", async (value) => {
    const response = await proxy(new NextRequest("https://duoshot.site/?utm_source=second", {
      headers: { cookie: `ds_attr=${value}`, referer: "https://second.example/" },
    }));
    expect(response.cookies.has(ATTRIBUTION_COOKIE)).toBe(false);
  });

  it.each([undefined, "https://duoshot.site/en/tool", "invalid"])("does not create an empty attribution cookie (referrer %s)", async (referer) => {
    const response = await proxy(new NextRequest("https://duoshot.site/?utm_source=!!!", {
      headers: referer ? { referer } : {},
    }));
    expect(response.cookies.has(ATTRIBUTION_COOKIE)).toBe(false);
  });

  it("captures a referrer-only visit without requiring Secure in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = await proxy(new NextRequest("http://localhost/", { headers: { referer: "https://news.example/article" } }));
    expect(response.cookies.get(ATTRIBUTION_COOKIE)).toMatchObject({ value: JSON.stringify({ referrer: "news.example" }), secure: false });
  });

  it("preserves refreshed auth cookies and response headers", async () => {
    const refreshed = NextResponse.next();
    refreshed.cookies.set("auth-token", "refreshed", { httpOnly: true });
    refreshed.headers.set("x-auth-test", "preserved");
    vi.mocked(updateSession).mockResolvedValueOnce(refreshed);
    const response = await proxy(new NextRequest("https://duoshot.site/en/tool?utm_campaign=Launch"));
    expect(response).toBe(refreshed);
    expect(response.cookies.get("auth-token")?.value).toBe("refreshed");
    expect(response.headers.get("x-auth-test")).toBe("preserved");
    expect(JSON.parse(response.cookies.get(ATTRIBUTION_COOKIE)!.value)).toEqual({ utm_campaign: "launch" });
  });

  it.each([
    ["/api/health", "GET", {}], ["/auth/callback", "GET", {}], ["/_next/static/script.js", "GET", {}],
    ["/asset.css", "GET", {}], ["/", "POST", {}], ["/", "HEAD", {}],
    ["/", "GET", { "next-router-prefetch": "1" }], ["/", "GET", { purpose: "prefetch" }],
    ["/", "GET", { "user-agent": "Googlebot" }],
  ])("does not attribute non-landings %s %s %j", async (path, method, headers) => {
    const response = await proxy(new NextRequest(`https://duoshot.site${path}?utm_source=google`, { method, headers: headers as Record<string, string> }));
    expect(response.cookies.has(ATTRIBUTION_COOKIE)).toBe(false);
  });
});
