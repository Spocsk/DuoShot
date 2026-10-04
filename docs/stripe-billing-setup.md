# DuoShot billing setup — 25 September 2026

> **Note (4 October 2026):** production now runs only on the VPS (Docker Compose behind Traefik); Vercel is no longer used for deploys. This document describes the state at its date. Current procedure: [`infra/deploy.md`](../infra/deploy.md).

> **Update (4 October 2026):** production `/api/billing/availability` now returns `checkoutAvailable: true`; Checkout was opened to customers on 4 October 2026 without a real test purchase. Remaining: one real purchase and refund performed by the owner, then tax validation and the Stripe Tax decision. The Pass 30 jours offer (PR #21) stays hidden until `STRIPE_PRICE_PASS30` is set. See [the live configuration record](journal/stripe-live-2026-10-03.md).

> **Update (3 October 2026):** live products, all four prices, the webhook and the default customer portal are configured. The live API key and webhook secret are installed in the VPS production environment. Checkout remained closed at that date pending tax validation and end-to-end testing in an isolated test environment. Never use a real card to test in live mode. See [the live configuration record](journal/stripe-live-2026-10-03.md).

## Configured in Stripe test mode

- DuoShot Indie: product `prod_VJU0ROjuNdmq4G`, monthly EUR 12 price `price_1UIr2AClApGnRrWtevMuWqDB` (`duoshot_indie_monthly`), annual EUR 120 price `price_1UIusDClApGnRrWtQfXhHcG2` (`duoshot_indie_yearly`).
- DuoShot Studio: product `prod_VJU2K68snAML4c`, monthly EUR 49 price `price_1UIr4CClApGnRrWtURRdTjN2` (`duoshot_studio_monthly`), annual EUR 490 price `price_1UIusTClApGnRrWtJzNePk3l` (`duoshot_studio_yearly`).
- Annual billing costs ten monthly payments for twelve months of access (two months free, about 16.7% off). The test customer portal offers all four prices, viewing invoices, updating payment details and canceling at period end.
- The official Stripe Codex plugin is installed and its Stripe MCP connection has been authorized for the test account. This is an operator tool; the SaaS uses its own Stripe SDK credentials.

The four test price IDs, a Stripe test API key and a webhook signing secret are stored only in ignored local configuration. The test account is `acct_1UExSRClApGnRrWt`. Its existing test webhook still points to `https://duoshot.vercel.app/api/stripe/webhook`; move it to an isolated test deployment before conducting payment tests. No Stripe test key was copied to Vercel Production.

The billing migration was applied to the correct Supabase project `jvhqcmqwrihbtwrggwuq` on 25 September after reconciling the migration histories. The server key is configured locally and in Vercel Production. Owner Studio access is held separately in `manual_plan`. Additive export, storage, atomic invitation and Checkout concurrency migrations have also been applied; see [`journal/schema-reconciliation-2026-09-25.md`](journal/schema-reconciliation-2026-09-25.md).

**Checkout was closed** at this date through `STRIPE_CHECKOUT_ENABLED=false` (opened on 4 October 2026, see the update above). Tax settings, live account and controlled real purchase remain unvalidated. The production domain is now `https://duoshot.site`.

## Complete before real test checkout

1. Provision a separate Supabase test project, apply the reviewed schema there, and configure its public URL/key and server secret only in the isolated test deployment. Do not use the production database for Stripe test scenarios.
2. In that isolated environment, set `STRIPE_CHECKOUT_ENABLED=true` and `STRIPE_SECRET_KEY` to the Stripe **test** server key. The publishable key is not needed for hosted Checkout. Never put secrets in source control or browser-exposed variables.
3. Deploy the webhook handler, then verify delivery to the registered test endpoint. It subscribes to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `.updated`, `.deleted`, `invoice.paid`, and `invoice.payment_failed`. Verify that the local `STRIPE_WEBHOOK_SECRET` belongs to this endpoint, and set the same endpoint secret in the test deployment.
4. Verify the business's tax registration and Stripe Tax settings before setting `STRIPE_TAX_ENABLED=true`. Stripe Tax is pending with no active tax registrations, so tax calculation is off. The test prices are tax-inclusive, but the marketing copy does not claim tax inclusion until the fiscal setup is confirmed.
5. Test monthly and annual Indie and Studio Checkout, delayed and duplicate webhooks, plan changes (including monthly ↔ annual), cancellation at period end, failed and recovered payments, deletion of a paying account, and two attempted subscriptions for one workspace. The account page must show the active plan only after a signed webhook updates the workspace.
6. Test one and ten capture pairs on desktop and mobile. Confirm the final file dimensions and the signed ZIP URL, including a ZIP over 4.5 MB. The signed URL lasts ten minutes; sources and ZIPs expire after 24 hours and the new API-based purge is configured every 15 minutes. The effective Supabase project upload limit observed during testing is 50 MB. The ten-pair 43 MB acceptance ZIP passed; a 55.7 MB stress archive was correctly rejected and its trial refunded.

## Production gate

Create separate live products with monthly and annual prices and a live webhook, then set live keys and all four live price IDs in the production environment. Both `STRIPE_CHECKOUT_ENABLED=true` and `STRIPE_LIVE_ENABLED=true` are required to start live Checkout. Validate test flows in an isolated test environment, confirm the business's tax obligations and account readiness, then authorize opening Checkout for genuine customers. Stripe prohibits testing live mode with real payment details. Keep Stripe test and live identifiers separate.

## Optional one-time offer: Pass 30 jours (added 4 October 2026)

- What it is: a single Checkout payment (`mode: "payment"`, kind `pass30`) that grants Indie entitlements (100 HD sets per day, 6.9″ sizes, multiple sets) for 30 days. No subscription is created and nothing renews. A second pass extends from the later of now and the current expiry.
- Display price: 19 € by default, configured once in `PASS30.priceEur` in `src/lib/plans.ts`. Create the Stripe price with the **same amount** (one-time, EUR); the app never reads the amount from Stripe.
- Configuration: set `STRIPE_PRICE_PASS30` to that one-time price ID. When it is empty the pass is hidden everywhere (pricing page, `/api/billing/availability`, Checkout returns `BILLING_UNCONFIGURED`). It also requires the normal Checkout gate (`STRIPE_CHECKOUT_ENABLED`, live flags, the four subscription prices). `scripts/check-deployment-env.mjs` reports `pass30Configured` and never fails on its absence.
- Webhook: no new event type. `checkout.session.completed` with `payment_status=paid` (or `checkout.session.async_payment_succeeded` for delayed methods) calls the service-only RPC `grant_workspace_pass`, which is idempotent on the Checkout session id (`workspace_passes.stripe_checkout_session_id` is unique) and checks the session customer against the workspace. Payment sessions without DuoShot metadata are acknowledged and ignored (`PAYMENT_UNLINKED`).
- Entitlements: `workspaces.pass_expires_at` is compared with the current time when entitlements are read (`resolveEntitlements`) and inside `reserve_export`; there is no cron. A workspace with an active subscription cannot buy a pass (`SUBSCRIPTION_EXISTS`).
- Migration: `20261004183100_workspace_passes.sql` must be applied **before** deploying the image that reads `pass_expires_at`, otherwise billing reads fail.
- Refunds: refunding a pass in Stripe does not revoke it automatically; set `pass_expires_at` to `now()` for that workspace if access should stop.

References: [Stripe Checkout](https://docs.stripe.com/billing/subscriptions/build-subscriptions?platform=web&ui=stripe-hosted), [customer portal](https://docs.stripe.com/customer-management/integrate-customer-portal), [subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks), [Stripe Tax setup](https://docs.stripe.com/tax/set-up).
