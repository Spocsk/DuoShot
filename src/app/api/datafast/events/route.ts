import { NextResponse } from "next/server";
import { ANALYTICS_CHOICE_KEY } from "@/lib/analytics-consent";
import { sanitizedAnalyticsUrl } from "@/lib/analytics-path";
import { DATAFAST_DOMAIN, DATAFAST_WEBSITE_ID } from "@/lib/datafast-config";

export const runtime = "nodejs";
const EVENTS = new Set([
  "page_engagement", "auth_succeeded", "account_created", "captures_added",
  "export_requested", "export_failed", "zip_download_clicked", "checkout_started",
  "review_requested", "review_failed", "export_succeeded", "review_created", "subscription_activated",
]);
const PROPERTIES = new Set(["audience", "page", "locale", "seconds", "method", "side", "count", "image_count", "plan", "reason", "slide_count"]);

export async function POST(request: Request) {
  const consent = request.headers.get("cookie")?.split(";").some((part) => part.trim() === `${ANALYTICS_CHOICE_KEY}=accepted`);
  if (!consent) return NextResponse.json({ ignored: true });
  const text = await request.text();
  if (text.length > 16_384) return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  try {
    const payload = JSON.parse(text);
    if (!payload || payload.websiteId !== DATAFAST_WEBSITE_ID || payload.domain !== DATAFAST_DOMAIN ||
        !["pageview", "custom"].includes(payload.type)) {
      return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
    }
    const href = typeof payload.href === "string" ? sanitizedAnalyticsUrl(payload.href) : null;
    if (!href || new URL(href).hostname !== DATAFAST_DOMAIN) return NextResponse.json({ ignored: true });
    payload.href = href;
    if (payload.referrer) {
      try {
        const referrer = new URL(payload.referrer);
        payload.referrer = referrer.hostname === DATAFAST_DOMAIN ? sanitizedAnalyticsUrl(referrer.href) : referrer.origin;
      } catch { payload.referrer = null; }
    }
    delete payload.adClickIds;
    if (payload.type === "custom") {
      if (!EVENTS.has(payload.extraData?.eventName)) return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
      payload.extraData = Object.fromEntries(Object.entries(payload.extraData).filter(([key, value]) =>
        (key === "eventName" || PROPERTIES.has(key)) &&
        (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)) || (typeof value === "string" && value.length <= 255)),
      ));
    } else { delete payload.extraData; }
    const allowed = new Set(["websiteId", "domain", "visitorId", "sessionId", "visitorFirstSeenAt", "visitorSessionNumber", "href", "referrer", "type", "viewport", "language", "timezone", "screenWidth", "screenHeight", "device", "extraData"]);
    for (const key of Object.keys(payload)) { if (!allowed.has(key)) delete payload[key]; }
    const headers = new Headers({ "Content-Type": "application/json", Origin: `https://${DATAFAST_DOMAIN}` });
    for (const name of ["user-agent", "x-forwarded-for"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const response = await fetch("https://datafa.st/api/events", {
      method: "POST", headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(2000),
    });
    return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "ANALYTICS_UNAVAILABLE" }, { status: 503 });
  }
}
