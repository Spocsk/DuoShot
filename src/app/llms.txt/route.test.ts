import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DUO_SLOT_SOURCE } from "@/lib/apple-screenshot-status";
import { GET } from "./route";

beforeEach(() => {
  vi.stubEnv("APP_ENV", "test");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
  vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "true");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_example");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
  vi.stubEnv("BILLING_ALLOWED_USER_IDS", "");
  for (const key of ["STRIPE_INDIE_PRICE_ID", "STRIPE_INDIE_YEARLY_PRICE_ID", "STRIPE_STUDIO_PRICE_ID", "STRIPE_STUDIO_YEARLY_PRICE_ID"]) {
    vi.stubEnv(key, "price_example");
  }
  vi.stubEnv("STRIPE_PRICE_PASS30", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("GET /llms.txt", () => {
  it("serves the current specs date and each pixel format without doubled inch labels", async () => {
    const response = GET();
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    const body = await response.text();
    expect(body).toContain("Specs version: 2026-10-13");
    expect(body).toContain('Duo outer 5.4" portrait: 1398x2034');
    expect(body).toContain('Duo inner 7.6" landscape: 2853x2007');
    for (const [width, height] of [[1320, 2868], [1290, 2796], [1260, 2736]]) {
      expect(body).toContain(`iPhone 6.9" portrait: ${width}x${height}`);
      expect(body).toContain(`iPhone 6.9" landscape: ${height}x${width}`);
    }
    expect(body).not.toContain('6.9" 6.9"');
  });

  it("limits ASC claims to the single slot contract and untested uploads", async () => {
    const body = await GET().text();
    expect(body).toContain("one iPhone Duo slot (APP_IPHONE_DUO)");
    expect(body).toContain("10 screenshots per locale across outer and inner screens");
    expect(body).toContain("Both sizes are accepted: 1398 × 2034 and 2007 × 2853, or their landscape dimensions");
    expect(body).toContain("Uploads have not yet been tested by DuoShot");
    expect(body).toContain(DUO_SLOT_SOURCE);
    expect(body).toContain("DUO_SLOT_LIMIT");
    expect(body).not.toMatch(/April 2027|iOS 27|optimized apps|Upload files manually/);
  });

  it("hides the pass without its Stripe price", async () => {
    expect(await GET().text()).not.toContain("Pass 30 jours");
  });

  it("mirrors the pricing page's one-time pass wording and price", async () => {
    vi.stubEnv("STRIPE_PRICE_PASS30", "price_pass30");
    expect(await GET().text()).toContain("Pass 30 jours: 19 € une fois. Accès Indie pendant 30 jours pour un lancement : sans abonnement ni renouvellement.");
  });

  it("hides the pass when checkout is disabled, even with a configured price", async () => {
    vi.stubEnv("STRIPE_PRICE_PASS30", "price_pass30");
    vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "false");
    expect(await GET().text()).not.toContain("Pass 30 jours");
  });
});
