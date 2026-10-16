import { NextRequest, type NextFetchEvent } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import nextConfig from "../../next.config";
import { proxy } from "../proxy";
import { createAdminSupabase } from "./supabase/admin";
import { countPageView, pageViewKey } from "./page-views";

vi.mock("./supabase/admin", () => ({ createAdminSupabase: vi.fn() }));
vi.mock("./supabase/proxy", () => ({ updateSession: vi.fn() }));

const rpc = vi.fn();
const request = (path = "/en/pricing", headers: Record<string, string> = {}, method = "GET") =>
  new NextRequest(`https://duoshot.site${path}`, {
    method,
    headers: { accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8", "user-agent": "Mozilla/5.0", ...headers },
  });
const day = new Date("2026-10-16T23:59:59.000Z");

beforeEach(() => {
  vi.stubEnv("DUOSHOT_LOCALIZED_PAGE_ROUTES", nextConfig.env!.DUOSHOT_LOCALIZED_PAGE_ROUTES!);
  rpc.mockReset().mockResolvedValue({ error: null });
  vi.mocked(createAdminSupabase).mockReset().mockReturnValue({ rpc } as unknown as NonNullable<ReturnType<typeof createAdminSupabase>>);
});
afterEach(() => vi.unstubAllEnvs());

describe("anonymous page-view filtering", () => {
  it.each(["Googlebot/2.1", "bingbot", "DuckDuckBot", "crawler", "Twitterbot", "facebookexternalhit", "AhrefsBot", "spider"])("excludes bot %s", (ua) => {
    expect(pageViewKey(request("/en/pricing", { "user-agent": ua }), day)).toBeNull();
  });

  it.each(["/api", "/api/health", "/api/reviews/secret", "/_next", "/_next/static/chunk.js", "/_next/image", "/static/file", "/assets/logo", "/favicon.ico", "/font.woff2", "/style.css", "/script.js", "/photo.avif", "/file.pdf", "/robots.txt", "/en/opengraph-image", "/auth/callback"])("excludes non-page %s even with HTML Accept", (path) => {
    expect(pageViewKey(request(path), day)).toBeNull();
  });

  it.each(["POST", "HEAD", "PUT", "OPTIONS"])("excludes %s", (method) => {
    expect(pageViewKey(request("/en/pricing", {}, method), day)).toBeNull();
  });

  it.each<Record<string, string>>([
    { accept: "*/*" }, { accept: "application/json" }, { accept: "text/x-component" },
    { accept: "text/html;q=0,application/json" }, { accept: "" },
    { rsc: "1" }, { "next-router-prefetch": "1" }, { purpose: "prefetch" },
    { "sec-purpose": "prefetch;prerender" }, { "sec-fetch-mode": "cors" }, { "sec-fetch-dest": "image" },
  ])("excludes fetches and prefetches %j", (headers) => {
    expect(pageViewKey(request("/en/pricing", headers), day)).toBeNull();
  });

  it("accepts a document navigation and rejects an RSC query even if headers were stripped", () => {
    expect(pageViewKey(request("/en/pricing", { "sec-fetch-mode": "navigate", "sec-fetch-dest": "document" }), day)).not.toBeNull();
    expect(pageViewKey(request("/en/pricing?_rsc=abc"), day)).toBeNull();
  });

  it("does no database work for filtered traffic", () => {
    countPageView(request("/api/health"));
    expect(createAdminSupabase).not.toHaveBeenCalled();
  });
});

describe("anonymous aggregation key", () => {
  it("contains only the UTC date, route and three normalized bounded campaign labels", () => {
    const key = pageViewKey(request("/en/pricing/?utm_source=GOOgle&utm_medium=Paid%20Social&utm_campaign=" + "A".repeat(100) + "&utm_content=secret&email=person@example.com", {
      cookie: "visitor=secret; ds_attr=secret", "x-forwarded-for": "203.0.113.1", referer: "https://example.com/private",
    }), day);
    expect(key).toEqual({ date: "2026-10-16", path: "/en/pricing", utm_source: "google", utm_medium: "paidsocial", utm_campaign: "a".repeat(64) });
  });

  it("aggregates missing and empty UTMs together, ignoring unrelated queries and headers", () => {
    expect(pageViewKey(request("/en/pricing?utm_source=&utm_campaign=&gclid=secret"), day))
      .toEqual(pageViewKey(request("/en/pricing", { cookie: "session=other", "user-agent": "Another browser" }), day));
    expect(pageViewKey(request(), day)).toMatchObject({ utm_source: "", utm_medium: "", utm_campaign: "" });
  });

  it("rejects emails and URLs as campaign labels", () => {
    expect(pageViewKey(request("/en/pricing?utm_source=person%40example.com&utm_medium=https%3A%2F%2Fexample.com&utm_campaign=%2540example.com"), day))
      .toMatchObject({ utm_source: "", utm_medium: "", utm_campaign: "" });
  });

  it("changes buckets with each dimension and with the UTC day", () => {
    const base = pageViewKey(request(), day);
    for (const path of ["/en/tool", "/en/pricing?utm_source=google", "/en/pricing?utm_medium=cpc", "/en/pricing?utm_campaign=launch"]) {
      expect(pageViewKey(request(path), day)).not.toEqual(base);
    }
    expect(pageViewKey(request(), new Date("2026-10-17T00:00:00Z"))?.date).toBe("2026-10-17");
  });

  it.each([["/en/invite/private-token", "/en/invite/[token]"], ["/r/private-id", "/r/[id]"], ["/en/", "/en"], ["/", "/"], ["/en/1398x2034", "/en/1398x2034"], ["/en/guides/best-app-store-screenshot-generator", "/en/guides/best-app-store-screenshot-generator"]])("normalizes %s to %s without identifiers", (input, path) => {
    expect(pageViewKey(request(input), day)?.path).toBe(path);
  });

  it.each([
    ["duoshot-vs-appscreens", "[slug]"],
    ["best-app-store-screenshot-generator", "best-app-store-screenshot-generator"],
    ["iphone-duo-app-store-connect", "iphone-duo-app-store-connect"],
  ])("normalizes guide %s to %s", (slug, route) => {
    for (const prefix of ["", "/en"]) {
      expect(pageViewKey(request(`${prefix}/guides/${slug}`), day)?.path).toBe(`${prefix}/guides/${route}`);
    }
  });

  it.each([false, true])("prefers fewer dynamic segments regardless of route order (reversed: %s)", (reversed) => {
    const routes = ["/[section]/[slug]", "/guides/[slug]"];
    vi.stubEnv("DUOSHOT_LOCALIZED_PAGE_ROUTES", JSON.stringify(reversed ? routes.reverse() : routes));
    expect(pageViewKey(request("/en/guides/duoshot-vs-appscreens"), day)?.path).toBe("/en/guides/[slug]");
  });

  it("discards unknown paths and bounds stored paths", () => {
    expect(pageViewKey(request("/unknown-private-identifier"), day)).toBeNull();
    const path = "/" + "a".repeat(300);
    vi.stubEnv("DUOSHOT_LOCALIZED_PAGE_ROUTES", JSON.stringify([path]));
    expect(pageViewKey(request(path), day)?.path).toBe(path.slice(0, 256));
  });
});

describe("proxy background counting", () => {
  function background() {
    const waitUntil = vi.fn<(work: Promise<unknown>) => void>();
    return { waitUntil, event: { waitUntil } as unknown as NextFetchEvent };
  }

  it("starts the atomic RPC without waiting for it or adding a cookie", async () => {
    let finish!: (value: unknown) => void;
    rpc.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { waitUntil, event } = background();
    const response = await proxy(request(), event);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(rpc).toHaveBeenCalledExactlyOnceWith("increment_daily_page_view", {
      p_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), p_path: "/en/pricing", p_utm_source: "", p_utm_medium: "", p_utm_campaign: "",
    });
    expect(waitUntil).toHaveBeenCalledOnce();
    finish({ error: null });
    await waitUntil.mock.calls[0][0];
  });

  it.each(["rejection", "database error", "client throws", "missing credentials", "waitUntil throws", "invalid route config"])("preserves the response when %s", async (failure) => {
    if (failure === "rejection") rpc.mockRejectedValue(new Error("offline"));
    if (failure === "database error") rpc.mockResolvedValue({ error: { message: "unavailable" } });
    if (failure === "client throws") vi.mocked(createAdminSupabase).mockImplementation(() => { throw new Error("bad env"); });
    if (failure === "missing credentials") vi.mocked(createAdminSupabase).mockReturnValue(null);
    if (failure === "invalid route config") vi.stubEnv("DUOSHOT_LOCALIZED_PAGE_ROUTES", "invalid");
    const { waitUntil, event } = background();
    if (failure === "waitUntil throws") waitUntil.mockImplementation(() => { throw new Error("closed"); });
    const response = await proxy(request(), event);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("set-cookie")).toBeNull();
    if (waitUntil.mock.calls.length) await expect(waitUntil.mock.calls[0][0]).resolves.toBeUndefined();
  });

  it("does not count locale redirects, then counts the destination once", async () => {
    const { waitUntil, event } = background();
    const redirect = await proxy(request("/forgot-password"), event);
    expect(redirect.status).toBe(307);
    expect(waitUntil).not.toHaveBeenCalled();
    expect((await proxy(request(new URL(redirect.headers.get("location")!).pathname), event)).status).toBe(200);
    await waitUntil.mock.calls[0][0];
    expect(rpc).toHaveBeenCalledOnce();
  });
});
