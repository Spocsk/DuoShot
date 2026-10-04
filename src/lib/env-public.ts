/**
 * Public (NEXT_PUBLIC_*) configuration, safe in client bundles. Each variable is
 * referenced literally so Next inlines it at build time, and read on access so
 * tests can stub it.
 */
export const publicEnv = {
  /** Canonical origin, without a trailing slash; undefined when not configured. */
  get siteUrl(): string | undefined {
    return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || undefined;
  },
  /** Public Supabase API URL (browser traffic and auth cookie identity). Empty when unset. */
  get supabaseUrl(): string {
    return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  },
  /** Publishable key, or the legacy anon key. Empty when unset. */
  get supabasePublicKey(): string {
    return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  },
};
