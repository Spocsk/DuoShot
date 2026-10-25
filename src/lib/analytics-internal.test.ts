import { describe, expect, it } from "vitest";
import { hasInternalCookie, internalCookie, internalCookieDirective } from "./analytics-internal";

describe("internal-visitor exclusion", () => {
  it("reads the set/clear directive from a query string", () => {
    expect(internalCookieDirective("?internal=1")).toBe("set");
    expect(internalCookieDirective("?internal=0")).toBe("clear");
    expect(internalCookieDirective("?internal=1&utm_source=x")).toBe("set");
    expect(internalCookieDirective("?foo=1")).toBeNull();
    expect(internalCookieDirective("?internal=2")).toBeNull();
    expect(internalCookieDirective("")).toBeNull();
  });

  it("detects the cookie regardless of surrounding pairs or spacing", () => {
    expect(hasInternalCookie("duoshot_internal=1")).toBe(true);
    expect(hasInternalCookie("a=b; duoshot_internal=1; c=d")).toBe(true);
    expect(hasInternalCookie("duoshot_analytics_choice_v2=accepted")).toBe(false);
    expect(hasInternalCookie("duoshot_internal=0")).toBe(false);
    expect(hasInternalCookie("duoshot_internal=12")).toBe(false);
    expect(hasInternalCookie(undefined)).toBe(false);
    expect(hasInternalCookie(null)).toBe(false);
  });

  it("builds a long-lived cookie to set and an expired one to clear", () => {
    expect(internalCookie("set", true)).toBe("duoshot_internal=1; Max-Age=31536000; Path=/; SameSite=Lax; Secure");
    expect(internalCookie("set", false)).toBe("duoshot_internal=1; Max-Age=31536000; Path=/; SameSite=Lax");
    expect(internalCookie("clear", true)).toBe("duoshot_internal=; Max-Age=0; Path=/; SameSite=Lax; Secure");
  });
});
