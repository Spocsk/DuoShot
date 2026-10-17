import { describe, expect, it } from "vitest";
import { authErrorKey } from "./auth-error";
import { getTranslator } from "./i18n";

describe("localized authentication errors", () => {
  it.each([
    ["invalid_credentials", "auth_error_credentials"],
    ["email_not_confirmed", "auth_error_email_unconfirmed"],
    ["user_already_exists", "auth_error_account_exists"],
    ["weak_password", "auth_error_password"],
    ["over_email_send_rate_limit", "auth_error_rate_limit"],
    ["otp_expired", "auth_sign_in_link_invalid"],
    ["provider_disabled", "google_error"],
  ])("maps %s to recovery advice in both languages", (code, key) => {
    const errorKey = authErrorKey({ code, message: "provider diagnostic" });
    expect(errorKey).toBe(key);
    for (const locale of ["fr", "en"] as const) {
      expect(getTranslator(locale).t(errorKey)).not.toBe(key);
      expect(getTranslator(locale).t(errorKey)).not.toContain("provider diagnostic");
    }
  });

  it("recognizes older Supabase messages and hides unknown/network diagnostics", () => {
    expect(authErrorKey(new Error("Invalid login credentials"))).toBe("auth_error_credentials");
    expect(authErrorKey(new TypeError("Failed to fetch"))).toBe("auth_error_unavailable");
    expect(authErrorKey({ code: "unknown", message: "internal diagnostic" }, "auth_could_not_change_password")).toBe("auth_could_not_change_password");
  });
});
