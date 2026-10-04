import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, clientIp, resetRateLimits } from "./rate-limit";

const hit = (times: number, method: string, path: string, ip = "203.0.113.1", now = 0) => {
  let last = checkRateLimit(method, path, ip, now);
  for (let i = 1; i < times; i++) last = checkRateLimit(method, path, ip, now);
  return last;
};

beforeEach(() => resetRateLimits());

describe("API rate limits", () => {
  it("limits checkout per address and reports when to retry", () => {
    expect(hit(20, "POST", "/api/stripe/checkout").limited).toBe(false);
    const blocked = checkRateLimit("POST", "/api/stripe/checkout", "203.0.113.1", 60_000);
    expect(blocked).toEqual({ limited: true, rule: "billing", retryAfterSeconds: 540 });
    expect(checkRateLimit("POST", "/api/stripe/checkout", "203.0.113.2", 60_000).limited).toBe(false);
  });

  it("opens a new window once the previous one ends", () => {
    hit(21, "POST", "/api/stripe/portal");
    expect(checkRateLimit("POST", "/api/stripe/portal", "203.0.113.1", 10 * 60_000).limited).toBe(false);
  });

  it("gives invitations and account exports their own tighter budget", () => {
    expect(hit(31, "POST", "/api/workspace/invitations")).toMatchObject({ limited: true, rule: "invitations" });
    expect(hit(11, "GET", "/api/account/export")).toMatchObject({ limited: true, rule: "account" });
    // The generic API budget is separate, so reading invitations still works.
    expect(checkRateLimit("GET", "/api/workspace/invitations", "203.0.113.1").limited).toBe(false);
  });

  it("gives App Store Connect calls their own budgets", () => {
    expect(hit(11, "POST", "/api/asc/connection")).toMatchObject({ limited: true, rule: "asc-connection" });
    expect(hit(21, "POST", "/api/asc/uploads")).toMatchObject({ limited: true, rule: "asc-upload" });
    expect(hit(61, "GET", "/api/asc/apps/app-1/versions")).toMatchObject({ limited: true, rule: "asc-read" });
    // Reading the connection status stays on the generic budget.
    expect(checkRateLimit("GET", "/api/asc/connection", "203.0.113.1").limited).toBe(false);
  });

  it("gives the public waitlist a tight shared budget for sign-up and e-mail links", () => {
    expect(hit(10, "POST", "/api/waitlist").limited).toBe(false);
    expect(checkRateLimit("GET", "/api/waitlist/confirm", "203.0.113.1", 0)).toMatchObject({ limited: true, rule: "waitlist" });
    expect(checkRateLimit("POST", "/api/waitlist/unsubscribe", "203.0.113.1", 0)).toMatchObject({ limited: true, rule: "waitlist" });
    expect(checkRateLimit("POST", "/api/waitlist", "203.0.113.9", 0).limited).toBe(false);
  });

  it("allows frequent render polling", () => {
    expect(hit(600, "GET", "/api/render-jobs/job-1").limited).toBe(false);
    expect(hit(1, "GET", "/api/render-jobs/job-1")).toMatchObject({ limited: true, rule: "polling" });
  });

  it.each(["/api/stripe/webhook", "/api/health", "/api/cron/storage-cleanup", "/api/internal/render-worker"])(
    "never limits %s", (path) => {
      expect(hit(1000, "POST", path).limited).toBe(false);
      expect(hit(1000, "GET", path).limited).toBe(false);
    });

  it("leaves pages alone", () => {
    expect(hit(1000, "GET", "/pricing").limited).toBe(false);
  });

  it("reads the client address set by the reverse proxy", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.7", "x-forwarded-for": "1.1.1.1, 198.51.100.7" }))).toBe("198.51.100.7");
    expect(clientIp(new Headers({ "x-forwarded-for": "1.1.1.1, 198.51.100.8" }))).toBe("198.51.100.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
