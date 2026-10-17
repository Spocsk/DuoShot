import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE, landingAttribution } from "./attribution";
import { isCrawler } from "./locale";

/** Capture before a client navigation can discard the landing URL's campaign. */
export function captureAttribution(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (/^\/(?:api|auth|_next)(?:\/|$)/.test(url.pathname) || /\.[^/]+$/.test(url.pathname) ||
      isCrawler(window.navigator.userAgent) ||
      document.cookie.split(";").some((part) => part.trim().split("=")[0] === ATTRIBUTION_COOKIE)) return;

    const attribution = landingAttribution(url, document.referrer);
    if (!Object.keys(attribution).length) return;
    // Use the same first-touch cookie as the proxy, including its fixed lifetime.
    // An existing HttpOnly cookie is invisible here; browsers refuse to overwrite
    // it, so the server's original attribution still wins.
    document.cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(attribution))}; Max-Age=${ATTRIBUTION_MAX_AGE}; Path=/; SameSite=Lax${url.protocol === "https:" ? "; Secure" : ""}`;
  } catch {
    // Cookie restrictions and optional attribution must never block auth/checkout.
  }
}
