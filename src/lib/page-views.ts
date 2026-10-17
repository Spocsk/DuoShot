import type { NextFetchEvent, NextRequest } from "next/server";
import { landingAttribution } from "./attribution";
import { isCrawler } from "./locale";
import { createAdminSupabase } from "./supabase/admin";

/** Use the compiled page tree so tokens/IDs and arbitrary unknown paths never reach storage. */
function pagePath(pathname: string): string | null {
  const path = pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  const prefix = /^\/en(?:\/|$)/.test(path) ? "/en" : "";
  const unprefixed = path.slice(prefix.length) || "/";
  const segments = unprefixed.split("/");
  const routes: string[] = JSON.parse(process.env.DUOSHOT_LOCALIZED_PAGE_ROUTES ?? "[]");
  // Exact routes win, then patterns with fewer dynamic segments.
  const route = routes.filter((route) => {
    const parts = route.split("/");
    return parts.length === segments.length && parts.every((part, index) =>
      /^\[[^\]]+\]$/.test(part) ? Boolean(segments[index]) : part === segments[index]);
  }).sort((a, b) =>
    (a.match(/\[[^\]]+\]/g)?.length ?? 0) - (b.match(/\[[^\]]+\]/g)?.length ?? 0))[0];
  return route ? `${prefix}${route === "/" && prefix ? "" : route}`.slice(0, 256) : null;
}

export function pageViewKey(request: Pick<NextRequest, "method" | "headers" | "url">, now = new Date()) {
  const { headers } = request;
  if (request.method !== "GET" || isCrawler(headers.get("user-agent"))) return null;
  const acceptsHtml = headers.get("accept")?.split(",").some((part) => {
    const [type, ...parameters] = part.trim().toLowerCase().split(";");
    return type.trim() === "text/html" && !parameters.some((parameter) => /^\s*q=0(?:\.0*)?\s*$/.test(parameter));
  });
  if (!acceptsHtml || headers.has("rsc") || headers.has("next-router-prefetch") ||
    /prefetch|prerender/i.test(`${headers.get("purpose") ?? ""} ${headers.get("sec-purpose") ?? ""}`) ||
    (headers.has("sec-fetch-mode") && headers.get("sec-fetch-mode") !== "navigate") ||
    (headers.has("sec-fetch-dest") && headers.get("sec-fetch-dest") !== "document")) return null;

  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, "");
  if (/^\/(?:api|auth|_next|static|assets)(?:\/|$)/i.test(pathname) ||
    /\.[^/]+$/.test(pathname) || url.searchParams.has("_rsc")) return null;
  const path = pagePath(pathname);
  if (!path) return null;

  // Reuse the bounded campaign-label sanitizer; never read cookies or referrers.
  const attribution = landingAttribution(url, null);
  return {
    date: now.toISOString().slice(0, 10), // UTC day, regardless of host timezone.
    path,
    utm_source: attribution.utm_source ?? "",
    utm_medium: attribution.utm_medium ?? "",
    utm_campaign: attribution.utm_campaign ?? "",
  };
}

/** Best effort: neither setup errors nor a failed/hanging DB request affect the response. */
export function countPageView(request: NextRequest, event?: Pick<NextFetchEvent, "waitUntil">) {
  try {
    const key = pageViewKey(request);
    if (!key) return;
    const work = Promise.resolve().then(async () => {
      const supabase = createAdminSupabase();
      if (!supabase) return;
      await supabase.rpc("increment_daily_page_view", {
        p_date: key.date,
        p_path: key.path,
        p_utm_source: key.utm_source,
        p_utm_medium: key.utm_medium,
        p_utm_campaign: key.utm_campaign,
      });
    }).catch(() => {});
    event?.waitUntil(work);
  } catch {
    // Counting must never break navigation. Do not log request data on failure.
  }
}
