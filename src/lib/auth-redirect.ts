import { getSiteUrl } from "./site";

/** Resolve against the configured public origin, never a proxy-supplied Host. */
export function authDestination(value: string | null): URL {
  const origin = new URL(getSiteUrl()).origin;
  const fallback = new URL("/tool", origin);
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return fallback;
  try {
    const target = new URL(value, origin);
    return target.origin === origin && !target.pathname.startsWith("//") ? target : fallback;
  } catch { return fallback; }
}

export function authFailure(next: URL): URL {
  const failure = new URL(next.pathname.startsWith("/en/") ? "/en/login" : "/login", new URL(getSiteUrl()).origin);
  failure.searchParams.set("auth_error", "invalid_link");
  return failure;
}
