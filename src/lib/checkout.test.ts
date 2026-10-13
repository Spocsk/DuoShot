import { afterEach, describe, expect, it, vi } from "vitest";
import { checkoutReturnPath, isCheckoutKind, startCheckout } from "./checkout";
import { getTranslator } from "./i18n";

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
});
