import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ATTRIBUTION_MAX_AGE, readAttribution } from "./attribution";
import { captureAttribution } from "./attribution-client";

const origin = "https://duoshot.site";
let cookie: string;
let referrer: string;
let write = vi.fn<(value: string) => void>();

function visit(path: string, referer = "") {
  Object.assign(window.location, { href: `${origin}${path}` });
  referrer = referer;
}

beforeEach(() => {
  cookie = "";
  referrer = "";
  write = vi.fn((value: string) => { cookie = value.split(";")[0]; });
  vi.stubGlobal("window", { location: { href: origin }, navigator: { userAgent: "Mozilla/5.0" } });
  vi.stubGlobal("document", {
    get cookie() { return cookie; },
    set cookie(value: string) { write(value); },
    get referrer() { return referrer; },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("browser first-touch attribution", () => {
  it.each(["/", "/en/pricing", "/guides/best-app-store-screenshot-generator", "/en/tool", "/en/signup"])("captures a landing on %s without a proxy cookie", (path) => {
    visit(`${path}?utm_source=X&utm_medium=Y&utm_campaign=Z&utm_content=Hero!&email=private@example.com`, "https://news.example/private?email=private@example.com");
    captureAttribution();
    expect(readAttribution(cookie, "duoshot.site")).toEqual({
      utm_source: "x", utm_medium: "y", utm_campaign: "z", utm_content: "hero", referrer: "news.example",
    });
    expect(write).toHaveBeenCalledExactlyOnceWith(expect.stringContaining(`; Max-Age=${ATTRIBUTION_MAX_AGE}; Path=/; SameSite=Lax; Secure`));
    expect(write.mock.calls[0][0]).not.toMatch(/Domain=|private|email/i);
  });

  it("keeps the original attribution and expiry across navigation, signup and a later campaign", () => {
    visit("/en/pricing?utm_source=x&utm_medium=y&utm_campaign=z", "https://first.example/article");
    captureAttribution();
    const first = cookie;
    for (const path of ["/en/tool?upgrade=1&plan=pass30", "/en/signup?next=%2Fen%2Ftool", "/en/tool?utm_source=second", "/en/account"]) {
      visit(path, "https://second.example/");
      captureAttribution();
      expect(cookie).toBe(first);
    }
    expect(write).toHaveBeenCalledTimes(1);
  });

  it.each(["", "broken", "%E0%A4%A", encodeURIComponent(JSON.stringify({ utm_source: "server" }))])("does not replace or renew an existing proxy/browser cookie (%s)", (value) => {
    cookie = `other=1; ds_attr=${value}; session=2`;
    visit("/en/pricing?utm_source=second");
    captureAttribution();
    expect(write).not.toHaveBeenCalled();
  });

  it("captures a referrer-only landing, without Secure on local HTTP", () => {
    window.location.href = "http://localhost/pricing";
    referrer = "https://news.example/private?secret=value";
    captureAttribution();
    expect(readAttribution(cookie, "localhost")).toEqual({ referrer: "news.example" });
    expect(write.mock.calls[0][0]).not.toContain("Secure");
  });

  it.each(["", "https://duoshot.site/en/pricing", "invalid"])("leaves empty/invalid attribution unset (%s)", (referer) => {
    visit("/en/pricing?utm_source=a%40example.com&utm_campaign=https%3A%2F%2Fexample.com", referer);
    captureAttribution();
    expect(write).not.toHaveBeenCalled();
  });

  it.each(["/auth/callback", "/auth/confirm", "/api/stripe/checkout", "/_next/static", "/asset.js"])("does not attribute non-page route %s", (path) => {
    visit(`${path}?utm_source=x`, "https://mail.example/");
    captureAttribution();
    expect(write).not.toHaveBeenCalled();
  });

  it("ignores crawlers", () => {
    visit("/en/pricing?utm_source=x");
    Object.defineProperty(window.navigator, "userAgent", { value: "Googlebot" });
    captureAttribution();
    expect(write).not.toHaveBeenCalled();
  });

  it("does not interrupt product actions if cookies are blocked", () => {
    visit("/en/pricing?utm_source=x");
    write.mockImplementation(() => { throw new Error("Cookies blocked"); });
    expect(captureAttribution).not.toThrow();
    Object.defineProperty(document, "cookie", { get() { throw new Error("Storage blocked"); } });
    expect(captureAttribution).not.toThrow();
  });

  it("is safe during server rendering", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("document", undefined);
    expect(captureAttribution).not.toThrow();
  });
});
