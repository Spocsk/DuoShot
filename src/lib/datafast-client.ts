"use client";

import type { DataFastWeb } from "datafast";
import { analyticsChoice, syncAnalyticsConsentCookie } from "./analytics-consent";
import { sanitizedCampaignQuery } from "./analytics-campaign";
import { analyticsPath } from "./analytics-path";
import { DATAFAST_DOMAIN, DATAFAST_WEBSITE_ID } from "./datafast-config";

type Properties = Record<string, string | number | boolean>;
export type DatafastConversion = "export_succeeded" | "review_created" | "subscription_activated";
let sdk: DataFastWeb | null = null;
let loading: Promise<DataFastWeb | null> | null = null;
let revision = 0;
let lastPage: string | null = null;
let dispatch: Promise<unknown> = Promise.resolve();
let choiceChanges: Promise<void> = Promise.resolve();
let audience = "anonymous";
const pendingConversions = new Set<string>();
let landingCampaign: string | null = null;
let firstPageview = true;

function captureLandingCampaign() {
  if (landingCampaign === null && typeof window !== "undefined") {
    landingCampaign = sanitizedCampaignQuery(window.location.search);
  }
}

// This module is loaded by AnalyticsProvider before SPA navigation, even without
// consent. Keep only sanitized labels in memory; never load the SDK or persist here.
captureLandingCampaign();

async function getSdk() {
  if (analyticsChoice() !== "accepted") return null;
  if (sdk) return sdk;
  if (!loading) {
    const currentRevision = revision;
    syncAnalyticsConsentCookie("accepted");
    loading = import("datafast").then(async ({ initDataFast }) => {
      if (analyticsChoice() !== "accepted" || currentRevision !== revision) return null;
      const client = await initDataFast({
        websiteId: DATAFAST_WEBSITE_ID,
        domain: DATAFAST_DOMAIN,
        apiUrl: "/api/datafast/events",
        autoCapturePageviews: false,
        maxQueueSize: 1,
      });
      if (analyticsChoice() !== "accepted" || currentRevision !== revision) {
        await client.optOut();
        return null;
      }
      sdk = client;
      return client;
    }).catch(() => null);
  }
  return loading;
}

export function setDatafastChoice(choice: "accepted" | "rejected") {
  choiceChanges = choiceChanges.catch(() => {}).then(async () => {
    revision++;
    const inFlight = loading;
    const client = sdk;
    sdk = null;
    loading = null;
    lastPage = null;
    await inFlight?.catch(() => null);
    if (choice === "rejected") {
      await client?.optOut().catch(() => {});
    } else if (analyticsChoice() === "accepted") {
      if (client?.isInitialized()) { sdk = client; return; }
      // optOut persists this SDK flag; acceptance explicitly enables it again.
      try { window.localStorage.removeItem("datafast_ignore"); } catch { /* optional */ }
      await getSdk();
    }
  });
  return choiceChanges;
}

async function sendEvent(event: string, properties: Properties): Promise<boolean> {
  try {
    const client = await getSdk();
    if (!client || analyticsChoice() !== "accepted") return false;
    const page = analyticsPath(window.location.pathname);
    if (!page) return false;
    const prefix = window.location.pathname === "/en" || window.location.pathname.startsWith("/en/") ? "/en" : "";
    // An explicit path keeps private IDs and arbitrary query strings out of payloads.
    const path = `${prefix}${page}`;
    if (event === "page_viewed" || lastPage !== path) {
      if (firstPageview && landingCampaign) {
        // A href override leaves the SDK's screen name query-free for custom
        // events and subsequent referrers (trackPageview(path?...) would not).
        await client.trackScreen(path, { href: `https://${DATAFAST_DOMAIN}${path}?${landingCampaign}` });
      } else {
        await client.trackPageview(path);
      }
      firstPageview = false;
      landingCampaign = "";
      lastPage = path;
    }
    if (analyticsChoice() !== "accepted") return false;
    if (event !== "page_viewed") await client.track(event, { audience, ...properties });
    return client.isInitialized();
  } catch {
    // Optional analytics must not break a product action or its other provider.
    return false;
  }
}

export function trackDatafast(event: string, properties: Properties = {}): Promise<boolean> {
  captureLandingCampaign();
  const next = dispatch.catch(() => {}).then(() => sendEvent(event, properties));
  dispatch = next;
  return next;
}

export function setDatafastAudience(value: string) { audience = value; }

/** Confirmed results are reported once per browser session, including recovered renders. */
export async function trackDatafastConversion(event: DatafastConversion, resultId: string, properties: Properties = {}) {
  if (!resultId || analyticsChoice() !== "accepted") return;
  const key = `duoshot_datafast:${event}:${resultId}`;
  try { if (sessionStorage.getItem(key)) return; } catch { /* in-memory deduplication below */ }
  if (pendingConversions.has(key)) return;
  pendingConversions.add(key);
  try {
    if (await trackDatafast(event, properties)) {
      try { sessionStorage.setItem(key, "1"); } catch { /* current session still deduplicates */ }
    } else {
      pendingConversions.delete(key);
    }
  } catch {
    pendingConversions.delete(key);
  }
}
