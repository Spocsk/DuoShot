import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

const directive = (policy: string, name: string) => policy.split("; ").find((part) => part.startsWith(`${name} `));

describe("security headers", () => {
  it("allows the Supabase origin only where the browser talks to them", () => {
    const policy = contentSecurityPolicy({ supabaseUrl: "https://api.duoshot.site/" });
    expect(directive(policy, "connect-src")).toBe("connect-src 'self' https://api.duoshot.site wss://api.duoshot.site");
    expect(policy).not.toMatch(/mixpanel/i);
    expect(directive(policy, "img-src")).toContain("https://api.duoshot.site");
    expect(directive(policy, "script-src")).toBe("script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("loosens only what the dev server needs", () => {
    const policy = contentSecurityPolicy({ dev: true });
    expect(directive(policy, "script-src")).toContain("'unsafe-eval'");
    expect(directive(policy, "connect-src")).toBe("connect-src 'self' ws:");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });

  it("ignores an invalid Supabase URL instead of emitting it", () => {
    expect(contentSecurityPolicy({ supabaseUrl: "not a url" })).not.toContain("not a url");
  });

  it("sends HSTS in production only", () => {
    const keys = (dev: boolean) => securityHeaders({ dev }).map((header) => header.key);
    expect(keys(false)).toContain("Strict-Transport-Security");
    expect(keys(true)).not.toContain("Strict-Transport-Security");
    expect(keys(false)).toEqual(expect.arrayContaining(["Content-Security-Policy", "X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options"]));
  });
});
