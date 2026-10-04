/**
 * Typed access to the server environment. Every value is read on access (tests
 * stub process.env after import) and empty strings count as unset. Startup
 * validation lives in ./env-check (instrumentation and the render worker).
 *
 * No Next imports: the standalone render worker bundles this module.
 */
export { publicEnv } from "./env-public";

export type AppEnv = "production" | "test" | "development";

const read = (name: string): string | undefined => process.env[name] || undefined;
const flag = (name: string): boolean => process.env[name] === "true";
const list = (name: string): string[] => (process.env[name] ?? "").split(",").map((item) => item.trim()).filter(Boolean);

export const serverEnv = {
  /** Explicit deployment identity; NODE_ENV is also production in test builds. */
  get appEnv(): AppEnv | undefined {
    const value = process.env.APP_ENV;
    return value === "production" || value === "test" || value === "development" ? value : undefined;
  },
  get isProduction(): boolean {
    return process.env.APP_ENV === "production";
  },

  supabase: {
    /** Private Docker URL for server traffic when self-hosted. */
    get internalUrl() { return read("SUPABASE_INTERNAL_URL"); },
    /** Service role key, or the newer secret key. */
    get adminKey() { return read("SUPABASE_SERVICE_ROLE_KEY") ?? read("SUPABASE_SECRET_KEY"); },
  },

  stripe: {
    get secretKey() { return read("STRIPE_SECRET_KEY"); },
    get webhookSecret() { return read("STRIPE_WEBHOOK_SECRET"); },
    get checkoutEnabled() { return flag("STRIPE_CHECKOUT_ENABLED"); },
    get liveEnabled() { return flag("STRIPE_LIVE_ENABLED"); },
    get taxEnabled() { return flag("STRIPE_TAX_ENABLED"); },
    prices: {
      get indieMonthly() { return read("STRIPE_INDIE_PRICE_ID"); },
      get indieYearly() { return read("STRIPE_INDIE_YEARLY_PRICE_ID"); },
      get studioMonthly() { return read("STRIPE_STUDIO_PRICE_ID"); },
      get studioYearly() { return read("STRIPE_STUDIO_YEARLY_PRICE_ID"); },
      get pass30() { return read("STRIPE_PRICE_PASS30"); },
    },
  },
  billing: {
    /** A nonempty allowlist limits the live purchase rehearsal. */
    get allowedUserIds() { return list("BILLING_ALLOWED_USER_IDS"); },
    /** CI end-to-end only: shows checkout buttons without Stripe. */
    get e2eCheckoutDisplay() { return flag("E2E_CHECKOUT_DISPLAY"); },
  },

  render: {
    get queueEnabled() { return flag("RENDER_QUEUE_ENABLED"); },
    get concurrency(): 1 | 2 { return process.env.RENDER_CONCURRENCY === "2" ? 2 : 1; },
    get workerSecret() { return read("RENDER_WORKER_SECRET"); },
  },
  get cronSecret() { return read("CRON_SECRET"); },

  asc: {
    get enabled() { return flag("ASC_CONNECTOR_ENABLED"); },
    get encryptionKey() { return read("ASC_ENCRYPTION_KEY"); },
  },

  email: {
    get resendApiKey() { return read("RESEND_API_KEY"); },
    get from() { return read("RESEND_FROM") ?? "DuoShot <noreply@duoshot.site>"; },
  },

  analytics: {
    get internalUserIds() { return list("ANALYTICS_INTERNAL_USER_IDS"); },
    get mixpanelProjectToken() { return read("MIXPANEL_PROJECT_TOKEN"); },
    get mixpanelGdprOAuthToken() { return read("MIXPANEL_GDPR_OAUTH_TOKEN"); },
  },
};
