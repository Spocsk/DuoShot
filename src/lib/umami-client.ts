"use client";

import { analyticsChoice, syncAnalyticsConsentCookie } from "./analytics-consent";
import { isInternalVisitor } from "./analytics-internal";
import { sanitizedCampaignQuery } from "./analytics-campaign";
import { analyticsPath } from "./analytics-path";
import { UMAMI_DOMAIN, UMAMI_WEBSITE_ID } from "./umami-config";

type Properties = Record<string, string | number | boolean>;
type Payload = { url: string; referrer?: string; title?: string; name?: string; data?: Properties };
export type UmamiTracker = {
  track: (payload: (defaults: Payload) => Payload) => Promise<unknown>;
  identify: (data: Properties) => Promise<unknown>;
};
declare global { interface Window { umami?: UmamiTracker } }
export type UmamiConversion = "export_succeeded" | "review_created" | "subscription_activated";
let loading: Promise<UmamiTracker | null> | null = null;
let revision = 0;
let lastPage: string | null = null;
let dispatch: Promise<unknown> = Promise.resolve();
let audience = "anonymous";
let identifiedAudience: string | null = null;
const pendingConversions = new Set<string>();
let landingCampaign: string | null = null;
let firstPageview = true;

function captureLandingCampaign() {
  if (landingCampaign === null && typeof window !== "undefined") {
    landingCampaign = sanitizedCampaignQuery(window.location.search);
  }
}
// Capture only sanitized labels in memory before SPA navigation; no storage or delivery.
captureLandingCampaign();

async function getTracker() {
  if (analyticsChoice() !== "accepted" || isInternalVisitor()) return null;
  syncAnalyticsConsentCookie("accepted");
  try { localStorage.removeItem("umami.disabled"); } catch { /* optional */ }
  if (window.umami) return window.umami;
  if (!loading) {
    loading = new Promise<UmamiTracker | null>((resolve) => {
      let script = document.querySelector<HTMLScriptElement>('script[src="/u/script.js"]');
      const finish = (tracker: UmamiTracker | null) => {
        window.clearInterval(poll);
        window.clearTimeout(timeout);
        script?.removeEventListener("error", failed);
        if (!tracker) script?.remove();
        resolve(tracker);
      };
      const failed = () => finish(null);
      const poll = window.setInterval(() => { if (window.umami) finish(window.umami); }, 50);
      const timeout = window.setTimeout(failed, 2000);
      if (!script) {
        script = document.createElement("script");
        script.defer = true;
        script.src = "/u/script.js";
        script.dataset.websiteId = UMAMI_WEBSITE_ID;
        script.dataset.hostUrl = `${window.location.origin}/api/umami`;
        script.dataset.domains = UMAMI_DOMAIN;
        script.dataset.autoTrack = "false";
        script.dataset.fetchCredentials = "same-origin";
        script.addEventListener("error", failed);
        document.head.appendChild(script);
      } else { script.addEventListener("error", failed); }
    }).catch(() => null).finally(() => { loading = null; });
  }
  return loading;
}

async function identify(client: UmamiTracker, currentRevision: number, value = audience) {
  if (analyticsChoice() !== "accepted" || currentRevision !== revision) return;
  if (identifiedAudience !== value) {
    await client.identify({ audience: value });
    if (currentRevision === revision) identifiedAudience = value;
  }
}

export async function setUmamiChoice(choice: "accepted" | "rejected") {
  const currentRevision = ++revision;
  lastPage = null;
  identifiedAudience = null;
  try {
    if (choice === "rejected") localStorage.setItem("umami.disabled", "1");
    else localStorage.removeItem("umami.disabled");
  } catch { /* optional */ }
  if (choice === "rejected") return;
  const next = dispatch.catch(() => {}).then(async () => {
    try {
      const client = await getTracker();
      if (client) await identify(client, currentRevision);
    } catch { /* optional analytics */ }
  });
  dispatch = next;
  await next;
}

function referrerOrigin() {
  try { return new URL(document.referrer).origin; } catch { return ""; }
}

async function sendEvent(event: string, properties: Properties, currentRevision: number): Promise<boolean> {
  try {
    if (currentRevision !== revision) return false;
    const client = await getTracker();
    if (!client || analyticsChoice() !== "accepted" || currentRevision !== revision) return false;
    const page = analyticsPath(window.location.pathname);
    if (!page) return false;
    const prefix = window.location.pathname === "/en" || window.location.pathname.startsWith("/en/") ? "/en" : "";
    const path = `${prefix}${page}`;
    await identify(client, currentRevision);
    if (analyticsChoice() !== "accepted" || currentRevision !== revision) return false;
    if (event === "page_viewed" || lastPage !== path) {
      const url = firstPageview && landingCampaign ? `${path}?${landingCampaign}` : path;
      await client.track((defaults) => ({ ...defaults, url, referrer: referrerOrigin(), title: "" }));
      firstPageview = false;
      landingCampaign = "";
      lastPage = path;
    }
    if (analyticsChoice() !== "accepted" || currentRevision !== revision) return false;
    if (event !== "page_viewed") {
      await client.track((defaults) => ({ ...defaults, url: path, referrer: "", title: "", name: event, data: { ...properties, audience } }));
    }
    return true;
  } catch { return false; }
}

export function trackUmami(event: string, properties: Properties = {}): Promise<boolean> {
  captureLandingCampaign();
  const currentRevision = revision;
  const next = dispatch.catch(() => {}).then(() => sendEvent(event, properties, currentRevision));
  dispatch = next;
  return next;
}

export function setUmamiAudience(value: string) {
  audience = value;
  if (analyticsChoice() !== "accepted") return;
  const currentRevision = revision;
  const next = dispatch.catch(() => {}).then(async () => {
    try {
      const client = await getTracker();
      if (client) await identify(client, currentRevision, value);
    } catch { /* optional analytics */ }
  });
  dispatch = next;
}

/** Result IDs stay in browser storage and are never sent to Umami. */
export async function trackUmamiConversion(event: UmamiConversion, resultId: string, properties: Properties = {}) {
  if (!resultId || analyticsChoice() !== "accepted") return;
  const key = `duoshot_umami:${event}:${resultId}`;
  try { if (sessionStorage.getItem(key)) return; } catch { /* memory fallback */ }
  if (pendingConversions.has(key)) return;
  pendingConversions.add(key);
  if (await trackUmami(event, properties)) {
    try { sessionStorage.setItem(key, "1"); } catch { /* memory fallback */ }
  } else { pendingConversions.delete(key); }
}
