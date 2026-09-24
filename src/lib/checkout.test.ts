import { describe, expect, it } from "vitest";
import { checkoutReturnPath, isCheckoutKind } from "./checkout";

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
});
