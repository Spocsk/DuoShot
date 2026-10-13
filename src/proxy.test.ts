import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../next.config";
import { proxy } from "./proxy";
import { LOCALE_COOKIE } from "./lib/locale";

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
