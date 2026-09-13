import { NextResponse, type NextRequest } from "next/server";
import {
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isCrawler,
  localeFromPath,
  localeRedirectTarget,
  shouldSkipLocaleRewrite,
} from "@/lib/locale";
import { updateSession } from "@/lib/supabase/proxy";

function copyCookies(from: NextResponse, to: NextResponse) {
  const cookies = from.headers.getSetCookie?.() ?? [];
  for (const cookie of cookies) {
    to.headers.append("set-cookie", cookie);
  }
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, localeFromPath(pathname));

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
      const session = await updateSession(request, requestHeaders);
      const dest = new URL(target, request.url);
      const url = request.nextUrl.clone();
      url.pathname = dest.pathname;
      url.search = dest.search;
      const redirect = NextResponse.redirect(url);
      copyCookies(session, redirect);
      return redirect;
    }
  }

  return updateSession(request, requestHeaders);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt)$).*)",
  ],
};
