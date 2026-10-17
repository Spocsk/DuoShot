const PUBLIC_ROUTES = new Set([
  "/", "/tool", "/cookies", "/login", "/pricing", "/legal",
  "/legal/subprocessors", "/account", "/rejection", "/rejet", "/terms",
  "/specs", "/privacy", "/signup", "/why-not-ai", "/pourquoi-pas-ia",
  "/forgot-password", "/1398x2034", "/2007x2853", "/1206x2622", "/1320x2868",
  "/tools/iphone-duo-screenshot-checker", "/guides/iphone-duo-app-store-connect",
  "/guides/best-app-store-screenshot-generator",
  // Fixed public SEO slugs from comparisons.ts, never arbitrary /guides/[slug] values.
  "/guides/duoshot-vs-applaunchflow", "/guides/duoshot-vs-appscreens",
  "/guides/duoshot-vs-screenhance", "/guides/duoshot-vs-app-asset-kit",
]);

/** Only known route names are allowed in analytics; never send IDs or query strings. */
export function analyticsPath(pathname: string): string | null {
  const path = (pathname.replace(/^\/en(?=\/|$)/, "") || "/").replace(/\/$/, "") || "/";
  if (/^\/invite\/[^/]+$/.test(path)) return "/invite/[token]";
  if (/^\/r\/[^/]+$/.test(path)) return "/r/[id]";
  return PUBLIC_ROUTES.has(path) ? path : null;
}

export function sanitizedAnalyticsUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const route = analyticsPath(url.pathname);
    if (!route) return null;
    const prefix = url.pathname === "/en" || url.pathname.startsWith("/en/") ? "/en" : "";
    return `${url.origin}${prefix}${route}`;
  } catch {
    return null;
  }
}
