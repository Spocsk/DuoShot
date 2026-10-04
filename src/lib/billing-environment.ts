import { serverEnv } from "./env";
/** Explicit deployment identity; NODE_ENV is also production in test builds. */
export function billingEnvironmentMatches(): boolean {
  const key = serverEnv.stripe.secretKey ?? "";
  const environment = serverEnv.appEnv;
  if (environment === "production") return /^(sk|rk)_live_.+/.test(key);
  if (environment === "test" || environment === "development") {
    return /^(sk|rk)_test_.+/.test(key);
  }
  return false;
}

export function billingEventMatches(livemode: boolean): boolean {
  return billingEnvironmentMatches() && livemode === serverEnv.isProduction;
}

/** A nonempty allowlist limits the live purchase rehearsal at the server. */
export function billingUserAllowed(userId?: string): boolean {
  const ids = serverEnv.billing.allowedUserIds;
  return ids.length === 0 || Boolean(userId && ids.includes(userId));
}
