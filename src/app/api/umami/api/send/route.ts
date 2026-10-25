import { NextResponse } from "next/server";
import { ANALYTICS_CHOICE_KEY } from "@/lib/analytics-consent";
import { sanitizedAnalyticsUrl } from "@/lib/analytics-path";
import { sanitizedCampaignQuery } from "@/lib/analytics-campaign";
import { UMAMI_DOMAIN, UMAMI_ORIGIN, UMAMI_WEBSITE_ID } from "@/lib/umami-config";
import { clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
const EVENTS = new Set([
  "page_engagement", "auth_succeeded", "account_created", "captures_added",
  "export_requested", "export_failed", "zip_download_clicked", "checkout_started",
  "review_requested", "review_failed", "export_succeeded", "review_created", "subscription_activated",
]);
const PROPERTIES = new Set(["audience", "page", "locale", "seconds", "method", "side", "count", "image_count", "plan", "reason", "slide_count"]);
const FIELDS = new Set(["website", "hostname", "url", "referrer", "title", "screen", "language", "name", "data"]);

export async function POST(request: Request) {
  const consent = request.headers.get("cookie")?.split(";").some((part) => part.trim() === `${ANALYTICS_CHOICE_KEY}=accepted`);
  if (!consent) return NextResponse.json({ ignored: true });
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 16_384) return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
    const body = JSON.parse(text);
    const payload = body?.payload;
    if (!payload || payload.website !== UMAMI_WEBSITE_ID || payload.hostname !== UMAMI_DOMAIN ||
        !["event", "identify"].includes(body.type)) {
      return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
    }
    if (payload.name !== undefined && (body.type !== "event" || !EVENTS.has(payload.name))) {
      return NextResponse.json({ error: "INVALID_EVENT" }, { status: 400 });
    }
    const rawUrl = typeof payload.url === "string" ? new URL(payload.url, `https://${UMAMI_DOMAIN}`) : null;
    const href = rawUrl ? sanitizedAnalyticsUrl(rawUrl.href) : null;
    if (!href || new URL(href).hostname !== UMAMI_DOMAIN) return NextResponse.json({ ignored: true });
    const campaign = body.type === "event" && payload.name === undefined ? sanitizedCampaignQuery(rawUrl!.search) : "";
    payload.url = new URL(href).pathname + (campaign ? `?${campaign}` : "");
    try {
      const referrer = new URL(payload.referrer);
      payload.referrer = ["https:", "http:"].includes(referrer.protocol) ? referrer.origin : "";
    } catch { payload.referrer = ""; }
    // Browser titles can contain account or review names; never forward them.
    payload.title = "";
    if (body.type === "identify" || payload.name !== undefined) {
      payload.data = Object.fromEntries(Object.entries(payload.data && typeof payload.data === "object" ? payload.data : {}).filter(([key, value]) =>
        (body.type === "identify" ? key === "audience" : PROPERTIES.has(key)) &&
        (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)) || (typeof value === "string" && value.length <= 255)),
      ));
    } else { delete payload.data; }
    for (const key of Object.keys(payload)) { if (!FIELDS.has(key)) delete payload[key]; }
    const headers = new Headers({ "Content-Type": "application/json" });
    const userAgent = request.headers.get("user-agent");
    if (userAgent) headers.set("User-Agent", userAgent);
    const ip = clientIp(request.headers);
    if (ip !== "unknown") {
      headers.set("X-Forwarded-For", ip);
      headers.set("X-DuoShot-Client-IP", ip);
      headers.set("True-Client-IP", ip);
    }
    const response = await fetch(`${UMAMI_ORIGIN}/api/send`, {
      method: "POST", headers, body: JSON.stringify({ type: body.type, payload }), signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) throw new Error("UPSTREAM_UNAVAILABLE");
    return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "ANALYTICS_UNAVAILABLE" }, { status: 503 });
  }
}
