function hostnameOf(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

export function requestHostname(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-host");
  const host = (forwarded ?? request.headers.get("host") ?? "").split(",")[0]?.trim() ?? "";
  return host.replace(/:\d+$/, "").toLowerCase();
}

/** True when an OAuth authorize URL would send a prod visitor back to localhost. */
export function isLocalhostOAuthRedirectFromRemote(authorizeUrl: URL, appHostname: string): boolean {
  if (!appHostname || isLoopbackHost(appHostname)) return false;
  const redirectTo = authorizeUrl.searchParams.get("redirect_to");
  if (!redirectTo) return false;
  const redirectHost = hostnameOf(redirectTo);
  return Boolean(redirectHost && isLoopbackHost(redirectHost));
}
