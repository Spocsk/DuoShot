import { NextResponse, type NextRequest } from "next/server";
import {
  LOCALE_COOKIE,
  isCrawler,
  localeRedirectTarget,
  shouldSkipLocaleRewrite,
} from "@/lib/locale";
import { updateSession } from "@/lib/supabase/proxy";

function needsSessionRefresh(pathname: string) {
  // Status handlers authenticate and refresh their own cookies. Repeating that
  // round-trip here doubles Auth/DB work for every client polling the queue.
  if (pathname === "/api/health" || pathname.startsWith("/api/render-jobs/") || pathname === "/api/internal/render-worker") return false;
  return /^\/(?:en\/)?(?:tool|account)(?:\/|$)/.test(pathname) || pathname.startsWith("/auth/") || pathname.startsWith("/api/");
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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
      return redirect;
    }
  }

  return needsSessionRefresh(pathname) ? updateSession(request) : NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt)$).*)",
  ],
};
