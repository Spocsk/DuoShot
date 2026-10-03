"use client";

import type Mixpanel from "mixpanel-browser";
import { ANALYTICS_CHOICE_KEY, analyticsChoice, syncAnalyticsConsentCookie, type AnalyticsChoice } from "./analytics-consent";
import { setDatafastAudience, setDatafastChoice, trackDatafast } from "./datafast-client";
import { DATAFAST_WEBSITE_ID } from "./datafast-config";

export { analyticsChoice, type AnalyticsChoice };
export type ProductEvent =
  | "page_viewed" | "page_engagement" | "auth_succeeded" | "account_created"
  | "captures_added" | "export_requested" | "export_failed" | "zip_download_clicked"
  | "checkout_started" | "review_requested" | "review_failed";

const AUTH_INTENT_KEY = "duoshot_analytics_auth_intent";
const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
let audience = "anonymous";
let identityRevision = 0;
let sdk: typeof Mixpanel | null = null;
let loading: Promise<typeof Mixpanel | null> | null = null;

export function analyticsConfigured() {
  return Boolean(TOKEN || DATAFAST_WEBSITE_ID);
}

function removeSensitiveProperties(properties: Record<string, unknown>) {
  for (const key of Object.keys(properties)) {
    if (/url|referr|utm|campaign|click_id|search/i.test(key)) delete properties[key];
  }
}

async function getSdk(): Promise<typeof Mixpanel | null> {
  if (!TOKEN || analyticsChoice() !== "accepted") return null;
  if (sdk) return sdk;
  if (!loading) {
    loading = import("mixpanel-browser").then(({ default: mixpanel }) => {
      if (analyticsChoice() !== "accepted") return null;
      mixpanel.init(TOKEN, {
        api_host: "https://api-eu.mixpanel.com",
        autocapture: false,
        track_pageview: false,
        record_sessions_percent: 0,
        ip: false,
        save_referrer: false,
        stop_utm_persistence: true,
        property_blacklist: ["$current_url", "$referrer", "$initial_referrer"],
        hooks: {
          before_send_events(event) {
            removeSensitiveProperties(event.properties as Record<string, unknown>);
            return event;
          },
        },
      });
      mixpanel.opt_in_tracking({ track: () => undefined });
      sdk = mixpanel;
      return sdk;
    }).catch(() => null);
  }
  return loading;
}

export async function setAnalyticsChoice(choice: Exclude<AnalyticsChoice, null>): Promise<boolean> {
  try { window.localStorage.setItem(ANALYTICS_CHOICE_KEY, choice); } catch { return false; }
  syncAnalyticsConsentCookie(choice);
  if (choice === "rejected") {
    sdk?.opt_out_tracking();
    sdk = null;
    loading = null;
  } else {
    await getSdk();
  }
  await setDatafastChoice(choice);
  window.dispatchEvent(new CustomEvent("duoshot:analytics-choice", { detail: choice }));
  return true;
}

export async function trackProduct(event: ProductEvent, properties: Record<string, string | number | boolean> = {}) {
  await Promise.allSettled([
    trackDatafast(event, { ...properties, audience }),
    getSdk().then((mixpanel) => {
      if (mixpanel && analyticsChoice() === "accepted") mixpanel.track(event, { ...properties, audience });
    }),
  ]);
}

export async function identifyAnalyticsUser(userId: string) {
  const revision = ++identityRevision;
  const mixpanel = await getSdk();
  if (analyticsChoice() === "accepted") {
    try {
      const response = await fetch("/api/billing/status", { cache: "no-store" });
      const status = response.ok ? await response.json() : null;
      if (revision !== identityRevision) return;
      audience = status?.audience === "internal" ? "internal" : status?.audience === "external" ? "external" : "unknown";
    } catch { if (revision !== identityRevision) return; audience = "unknown"; }
    if (revision !== identityRevision || analyticsChoice() !== "accepted") return;
    setDatafastAudience(audience);
    mixpanel?.identify(userId);
    mixpanel?.people.set({ audience });
  }
}

export function resetAnalyticsUser() {
  identityRevision++;
  audience = "anonymous";
  setDatafastAudience(audience);
  sdk?.reset();
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
