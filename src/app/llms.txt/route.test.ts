import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DUO_SLOT_SOURCE } from "@/lib/apple-screenshot-status";
import { MARKETING_ROUTE_PAIRS } from "@/lib/site";
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
    expect(body).toContain('iPhone Duo outer display portrait: 1398x2034');
    expect(body).toContain('iPhone Duo inner display landscape: 2853x2007');
    expect(body).toContain('iPhone 6.3" portrait: 1206x2622');
    expect(body).toContain('iPhone 6.3" landscape: 2622x1206');
    for (const [width, height] of [[1320, 2868], [1290, 2796], [1260, 2736]]) {
      expect(body).toContain(`iPhone 6.9" portrait: ${width}x${height}`);
      expect(body).toContain(`iPhone 6.9" landscape: ${height}x${width}`);
    }
    expect(body).not.toContain('6.9" 6.9"');
    expect(body).not.toContain('6.3" 6.3"');
    expect(body).not.toMatch(/5[,.]4|7[,.]6/);
  });

  it("documents the required free-trial size, accepted alternatives, and optional paid size", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://duoshot.site");
    const body = await GET().text();
    expect(body).toContain('iPhone with Dynamic Island (medium display, 6.3") required: https://duoshot.site/1206x2622 (EN: https://duoshot.site/en/1206x2622)');
    expect(body).toContain('Optional 6.9" iPhone sizes: https://duoshot.site/1320x2868 (EN: https://duoshot.site/en/1320x2868)');
    expect(body).toContain('Free screenshot checker (dimensions, transparency, Duo count; client-side, no uploads): https://duoshot.site/tools/iphone-duo-screenshot-checker (EN: https://duoshot.site/en/tools/iphone-duo-screenshot-checker)');
    expect(body).toContain('iPhone 6.3" portrait alternative accepted by App Store Connect: 1179x2556');
    expect(body).toContain('iPhone 6.3" landscape alternative accepted by App Store Connect: 2556x1179');
    expect(body).toContain('iPhone with Dynamic Island (medium display, 6.3") required for App Store Connect');
    expect(body).toContain('included in the free trial');
    expect(body).toContain('1179x2556 alternative is not a DuoShot export preset');
    expect(body).toContain('Optional 6.9" sizes are included with paid access');
  });

  it("preserves the Duo slot copy and untested uploads alongside the qualified deadline", async () => {
    const body = await GET().text();
    expect(body).toContain("iPhone Duo slot (APP_IPHONE_DUO)");
    expect(body).toContain("10 screenshots per device size across outer and inner screens");
    expect(body).toContain("Both sizes are accepted: 1398 × 2034 and 2007 × 2853, or their landscape dimensions");
    expect(body).toContain("Uploads have not yet been tested by DuoShot");
    expect(body).toContain(DUO_SLOT_SOURCE);
    expect(body).toContain("DUO_SLOT_LIMIT");
    expect(body).toMatch(/April 2027[^\n]+for apps built with the iOS 27\.1 SDK or later/);
  });

  it("distinguishes duoshot.site and links to existing bilingual guides and prices", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://duoshot.site");
    const body = await GET().text();
    expect(body).toContain("DuoShot (duoshot.site) is the App Store screenshot studio for iPhone Duo (Apple's foldable iPhone)");
    expect(body.slice(body.indexOf("iPhone Duo"))).toMatch(/^iPhone Duo \(Apple's foldable iPhone\)/);
    expect(body).toContain("DuoScreenshot (duoscreenshot.com)");
    expect(body).toContain("DuoShot (duoshot.site) is not affiliated with DuoScreenshot (duoscreenshot.com).");
    expect(body).toContain('iPhone Duo outer display: 1398x2034');
    expect(body).toContain('iPhone Duo inner display: 2007x2853');
    expect(body).toContain('iPhone with Dynamic Island (medium display, 6.3") required: 1206x2622, included in the free trial');
    expect(body).toContain('iPhone 6.9": 1320x2868, optional with Indie and Studio');
    expect(body).toContain("Free trial: 0 EUR, 2 HD ZIPs");
    expect(body).toContain("Indie: 12 EUR/month or 120 EUR/year; Studio: 49 EUR/month or 490 EUR/year");
    expect(body).not.toMatch(/coupon|discount|remise|réduction/i);
    for (const route of MARKETING_ROUTE_PAIRS.filter(({ fr }) => /specs|guides|x\d|pourquoi|rejet|pricing/.test(fr))) {
      expect(body).toContain(`https://duoshot.site${route.fr}`);
      expect(body).toContain(`https://duoshot.site${route.en}`);
    }
  });

  it("hides the pass without its Stripe price", async () => {
    expect(await GET().text()).not.toContain("Pass 30 jours");
  });

  it("mirrors the pricing page's one-time pass wording and price", async () => {
    vi.stubEnv("STRIPE_PRICE_PASS30", "price_pass30");
    const body = await GET().text();
    expect(body).toContain("Pass 30 jours: 19 € une fois. Accès Indie pendant 30 jours pour un lancement : sans abonnement ni renouvellement.");
    expect(body).not.toMatch(/coupon|discount|remise|réduction/i);
    expect(body).toContain('Optional 6.9" sizes are included with Pass / Indie / Studio');
    expect(body).toContain('iPhone 6.9": 1320x2868, optional with Pass, Indie and Studio');
  });

  it("hides the pass when checkout is disabled, even with a configured price", async () => {
    vi.stubEnv("STRIPE_PRICE_PASS30", "price_pass30");
    vi.stubEnv("STRIPE_CHECKOUT_ENABLED", "false");
    expect(await GET().text()).not.toContain("Pass");
  });
});
