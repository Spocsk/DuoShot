import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import {
  LOCALE_COOKIE,
  isCrawler,
  localeRedirectTarget,
  shouldSkipLocaleRewrite,
} from "@/lib/locale";
import { updateSession } from "@/lib/supabase/proxy";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { isInternalRequest } from "@/lib/internal-request";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE, landingAttribution } from "@/lib/attribution";
import { countPageView } from "@/lib/page-views";

function withAttribution(request: NextRequest, response: NextResponse) {
  const pathname = request.nextUrl.pathname;
  // Check the raw header: Next's cookie parser drops invalid URI encodings.
  // Even an unreadable first-touch cookie must not be replaced by a later visit.
  const hasAttribution = request.headers.get("cookie")?.split(";")
    .some((cookie) => cookie.trim().split("=")[0] === ATTRIBUTION_COOKIE);
  if (request.method !== "GET" || hasAttribution ||
    /^\/(?:api|auth|_next)(?:\/|$)/.test(pathname) || /\.[^/]+$/.test(pathname) ||
    request.headers.has("next-router-prefetch") || request.headers.get("purpose") === "prefetch" ||
    isCrawler(request.headers.get("user-agent"))) return response;

  const attribution = landingAttribution(new URL(request.url), request.headers.get("referer"));
  if (Object.keys(attribution).length) {
    response.cookies.set(ATTRIBUTION_COOKIE, JSON.stringify(attribution), {
      maxAge: ATTRIBUTION_MAX_AGE,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      path: "/",
    });
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

function needsSessionRefresh(pathname: string) {
  // Status handlers authenticate and refresh their own cookies. Repeating that
  // round-trip here doubles Auth/DB work for every client polling the queue.
  if (pathname === "/api/health" || pathname === "/api/datafast/events" || pathname.startsWith("/api/render-jobs/") || pathname === "/api/internal/render-worker") return false;
  return /^\/(?:en\/)?(?:tool|account)(?:\/|$)/.test(pathname) || pathname.startsWith("/auth/") || pathname.startsWith("/api/");
}

export async function proxy(request: NextRequest, event?: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;

  // Internal routes are only reachable from the container itself or the private Docker
  // network; from the Internet they do not exist. Their bearer secret still applies.
  if (/^\/api\/internal(?:\/|$)/.test(pathname) && !isInternalRequest(request.headers)) {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const rate = checkRateLimit(request.method, pathname, clientIp(request.headers));
  if (rate.limited) {
    return NextResponse.json({ error: "RATE_LIMITED" }, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSeconds), "Cache-Control": "no-store" },
    });
  }

  const skip =
    (request.method !== "GET" && request.method !== "HEAD") ||
    shouldSkipLocaleRewrite(pathname) ||
    isCrawler(request.headers.get("user-agent"));

  if (!skip) {
    const target = localeRedirectTarget({
      pathname,
      search: request.nextUrl.search,
      cookie: request.cookies.get(LOCALE_COOKIE)?.value,
      acceptLanguage: request.headers.get("accept-language"),
    });
    if (target) {
      const dest = new URL(target, request.url);
      const url = request.nextUrl.clone();
      url.pathname = dest.pathname;
      url.search = dest.search;
      const redirect = NextResponse.redirect(url);
      redirect.headers.set("Cache-Control", "private, no-store");
      redirect.headers.set("Vary", "Accept-Language, Cookie");
      return withAttribution(request, redirect);
    }
  }

  const response = needsSessionRefresh(pathname) ? await updateSession(request) : NextResponse.next();
  countPageView(request, event);
  return withAttribution(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt)$).*)",
  ],
};
