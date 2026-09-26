/** HTTPS is explicit because SSR requests arrive over HTTP from the proxy. */
export function supabaseCookieOptions() {
  return { secure: process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") === true, sameSite: "lax" as const, path: "/" };
}
