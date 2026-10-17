import { afterEach, describe, expect, it, vi } from "vitest";
import { checkoutReturnPath, isCheckoutKind, startCheckout } from "./checkout";
import { getTranslator } from "./i18n";
import { readAttribution } from "./attribution";

afterEach(() => vi.unstubAllGlobals());

describe("checkout", () => {
  it("accepts catalog kinds only", () => {
    expect(isCheckoutKind("indie_monthly")).toBe(true);
    expect(isCheckoutKind("indie_launch")).toBe(false);
    expect(isCheckoutKind("studio_monthly")).toBe(true);
    expect(isCheckoutKind("indie_yearly")).toBe(true);
    expect(isCheckoutKind("studio_yearly")).toBe(true);
    expect(isCheckoutKind("app_pack")).toBe(false);
    expect(isCheckoutKind("free")).toBe(false);
    expect(isCheckoutKind(undefined)).toBe(false);
  });

  it("returns to the localized tool", () => {
    expect(checkoutReturnPath("fr")).toBe("/tool");
    expect(checkoutReturnPath("en")).toBe("/en/tool");
  });

  it.each(["fr", "en"] as const)("localizes checkout network errors in %s", async (locale) => {
    const { t } = getTranslator(locale);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(startCheckout("indie_monthly", checkoutReturnPath(locale), t)).rejects.toThrow(t("billing_error_unavailable"));
  });

  it("shows translated ownership advice from the billing portal", async () => {
    const { t } = getTranslator("fr");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "SUBSCRIPTION_EXISTS" }), { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "BILLING_OWNER_REQUIRED" }), { status: 403 })));
    await expect(startCheckout("studio_monthly", "/tool", t)).rejects.toThrow(t("billing_error_owner"));
  });

  it.each(["pass30", "indie_monthly", "indie_yearly", "studio_monthly", "studio_yearly"] as const)("captures a direct landing before sending the checkout request for %s", async (kind) => {
    let cookie = "";
    const assign = vi.fn();
    vi.stubGlobal("window", {
      location: { href: "https://duoshot.site/en/tool?utm_source=x&utm_medium=y&utm_campaign=z", assign },
      navigator: { userAgent: "Mozilla/5.0" },
    });
    vi.stubGlobal("document", {
      referrer: "https://news.example/private",
      get cookie() { return cookie; },
      set cookie(value: string) { cookie = value.split(";")[0]; },
    });
    const fetch = vi.fn(async (_url: string, options: RequestInit) => {
      expect(readAttribution(cookie, "duoshot.site")).toEqual({
        utm_source: "x", utm_medium: "y", utm_campaign: "z", referrer: "news.example",
      });
      expect(JSON.parse(options.body as string)).toEqual({ kind, next: "/en/tool" });
      return new Response(JSON.stringify({ url: "https://checkout.stripe.test/session" }));
    });
    vi.stubGlobal("fetch", fetch);
    await startCheckout(kind, "/en/tool", getTranslator("en").t);
    expect(fetch).toHaveBeenCalledOnce();
    expect(assign).toHaveBeenCalledWith("https://checkout.stripe.test/session");
  });
});
