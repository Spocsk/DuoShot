/** Explicit deployment identity; NODE_ENV is also production in test builds. */
export function billingEnvironmentMatches(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  const environment = process.env.APP_ENV;
  if (environment === "production") return /^(sk|rk)_live_.+/.test(key);
  if (environment === "test" || environment === "development") {
    return process.env.VERCEL_ENV !== "production" && /^(sk|rk)_test_.+/.test(key);
  }
  return false;
}

export function billingEventMatches(livemode: boolean): boolean {
  return billingEnvironmentMatches() && livemode === (process.env.APP_ENV === "production");
}

/** A nonempty allowlist limits the live purchase rehearsal at the server. */
export function billingUserAllowed(userId?: string): boolean {
  const ids = (process.env.BILLING_ALLOWED_USER_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  return ids.length === 0 || Boolean(userId && ids.includes(userId));
}
