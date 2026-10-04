"use client";

import { ANALYTICS_CHOICE_KEY, analyticsChoice, syncAnalyticsConsentCookie, type AnalyticsChoice } from "./analytics-consent";
import { setDatafastAudience, setDatafastChoice, trackDatafast } from "./datafast-client";
import { DATAFAST_WEBSITE_ID } from "./datafast-config";

export { analyticsChoice, type AnalyticsChoice };
export type ProductEvent =
  | "page_viewed" | "page_engagement" | "auth_succeeded" | "account_created"
  | "captures_added" | "export_requested" | "export_failed" | "zip_download_clicked"
  | "checkout_started" | "review_requested" | "review_failed";

const AUTH_INTENT_KEY = "duoshot_analytics_auth_intent";
let audience = "anonymous";
let identityRevision = 0;

export function analyticsConfigured() {
  return Boolean(DATAFAST_WEBSITE_ID);
}

export async function setAnalyticsChoice(choice: Exclude<AnalyticsChoice, null>): Promise<boolean> {
  try { window.localStorage.setItem(ANALYTICS_CHOICE_KEY, choice); } catch { return false; }
  syncAnalyticsConsentCookie(choice);
  await setDatafastChoice(choice);
  window.dispatchEvent(new CustomEvent("duoshot:analytics-choice", { detail: choice }));
  return true;
}

export async function trackProduct(event: ProductEvent, properties: Record<string, string | number | boolean> = {}) {
  await trackDatafast(event, { ...properties, audience });
}

/** Tags later DataFast events with the signed-in account audience (internal/external). */
export async function refreshAnalyticsAudience() {
  const revision = ++identityRevision;
  if (analyticsChoice() === "accepted") {
    try {
      const response = await fetch("/api/billing/status", { cache: "no-store" });
      const status = response.ok ? await response.json() : null;
      if (revision !== identityRevision) return;
      audience = status?.audience === "internal" ? "internal" : status?.audience === "external" ? "external" : "unknown";
    } catch { if (revision !== identityRevision) return; audience = "unknown"; }
    if (revision !== identityRevision || analyticsChoice() !== "accepted") return;
    setDatafastAudience(audience);
  }
}

export function resetAnalyticsUser() {
  identityRevision++;
  audience = "anonymous";
  setDatafastAudience(audience);
}

export function markAnalyticsAuthIntent(method: "google" | "password" | "magic") {
  try { sessionStorage.setItem(AUTH_INTENT_KEY, method); } catch { /* optional */ }
}

export function consumeAnalyticsAuthIntent(): string | null {
  try {
    const method = sessionStorage.getItem(AUTH_INTENT_KEY);
    sessionStorage.removeItem(AUTH_INTENT_KEY);
    return method;
  } catch { return null; }
}

export function clearAnalyticsAuthIntent() {
  try { sessionStorage.removeItem(AUTH_INTENT_KEY); } catch { /* optional */ }
}
