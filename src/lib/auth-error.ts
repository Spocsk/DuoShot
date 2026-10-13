import type { MessageKey } from "@/lib/i18n/types";

/** Keep provider diagnostics out of the interface while preserving useful recovery advice. */
export function authErrorKey(error: unknown, fallback: MessageKey = "auth_error_unavailable"): MessageKey {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const message = typeof error === "object" && error !== null && "message" in error ? String(error.message) : "";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) return "auth_error_credentials";
  if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) return "auth_error_email_unconfirmed";
  if (["user_already_exists", "email_exists"].includes(code) || /already registered/i.test(message)) return "auth_error_account_exists";
  if (["weak_password", "same_password"].includes(code) || /password should be|new password should be different/i.test(message)) return "auth_error_password";
  if (["over_request_rate_limit", "over_email_send_rate_limit", "over_sms_send_rate_limit"].includes(code) || /rate limit|too many requests/i.test(message)) return "auth_error_rate_limit";
  if (["email_address_invalid", "validation_failed"].includes(code) || /invalid email/i.test(message)) return "auth_error_email";
  if (["otp_expired", "session_expired", "session_not_found", "bad_jwt"].includes(code) || message === "INVALID_SESSION") return "auth_sign_in_link_invalid";
  if (["provider_disabled", "oauth_provider_not_supported"].includes(code) || /provider is not enabled|unsupported provider/i.test(message)) return "google_error";
  return fallback;
}
