import { publicEnv } from "../env-public";
/** HTTPS is explicit because SSR requests arrive over HTTP from the proxy. */
export function supabaseCookieOptions() {
  return { secure: publicEnv.siteUrl?.startsWith("https://") === true, sameSite: "lax" as const, path: "/" };
}
