/**
 * Internal-visitor exclusion. A `duoshot_internal` cookie marks staff and test
 * traffic so Umami neither loads nor receives events. The decision logic lives
 * in pure functions (covered by analytics-internal.test.ts); the DOM helpers at
 * the bottom just wrap them.
 *
 * No top-level DOM access: the module is imported by the server-side proxy.
 */
export const INTERNAL_COOKIE_NAME = "duoshot_internal";
const INTERNAL_PARAM = "internal";
const INTERNAL_MAX_AGE = 31_536_000; // ~1 year, matching the consent cookie.

/** Directive carried by a URL query string: set/clear the cookie, or no change. */
export function internalCookieDirective(search: string): "set" | "clear" | null {
  switch (new URLSearchParams(search).get(INTERNAL_PARAM)) {
    case "1": return "set";
    case "0": return "clear";
    default: return null;
  }
}

/** True when a Cookie header opts the visitor out of analytics. */
export function hasInternalCookie(cookieHeader: string | null | undefined): boolean {
  return cookieHeader?.split(";").some((part) => part.trim() === `${INTERNAL_COOKIE_NAME}=1`) ?? false;
}

/** The Set-Cookie / document.cookie string for a directive; `clear` expires it. */
export function internalCookie(directive: "set" | "clear", secure: boolean): string {
  const attrs = `Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
  return directive === "set"
    ? `${INTERNAL_COOKIE_NAME}=1; Max-Age=${INTERNAL_MAX_AGE}; ${attrs}`
    : `${INTERNAL_COOKIE_NAME}=; Max-Age=0; ${attrs}`;
}

/** Applies a `?internal=1`/`?internal=0` directive to document.cookie (client only). */
export function markInternalFromLocation(search: string): void {
  if (typeof document === "undefined") return;
  const directive = internalCookieDirective(search);
  if (directive) document.cookie = internalCookie(directive, window.location.protocol === "https:");
}

/** True when the current browser is marked as an internal visitor (client only). */
export function isInternalVisitor(): boolean {
  return typeof document !== "undefined" && hasInternalCookie(document.cookie);
}
