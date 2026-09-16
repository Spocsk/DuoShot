import { NextResponse, type NextRequest } from "next/server";
import {
  LOCALE_COOKIE,
  isCrawler,
  localeFromPath,
  localeRedirectTarget,
  shouldSkipLocaleRewrite,
} from "@/lib/locale";
import { updateSession } from "@/lib/supabase/proxy";

function needsSessionRefresh(pathname: string) {
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
      redirect.cookies.set(LOCALE_COOKIE, localeFromPath(dest.pathname), {
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
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
