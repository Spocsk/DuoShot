import { describe, expect, it } from "vitest";
import { REVIEW_TTL_MS, reviewExpiresAt, reviewState } from "./reviews";

describe("review lifecycle", () => {
  it("creates a seven-day expiry", () => {
    expect(new Date(reviewExpiresAt(0)).getTime()).toBe(REVIEW_TTL_MS);
  });

  it("computes expired and revoked states without hiding their cause", () => {
    expect(reviewState({ status: "pending", expires_at: "2026-01-01T00:00:00.000Z" }, Date.UTC(2026, 0, 2))).toMatchObject({
      status: "expired",
      expired: true,
      revoked: false,
    });
    expect(reviewState({ status: "pending", revoked_at: "2026-01-01T00:00:00.000Z" })).toMatchObject({
      status: "revoked",
      expired: false,
      revoked: true,
    });
  });
});
