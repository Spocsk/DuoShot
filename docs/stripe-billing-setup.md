# DuoShot billing setup — 23 September 2026

## Configured in Stripe test mode

- DuoShot Indie: product `prod_VJU0ROjuNdmq4G`, monthly EUR 12 price `price_1UIr2AClApGnRrWtevMuWqDB` (`duoshot_indie_monthly`), annual EUR 120 price `price_1UIusDClApGnRrWtQfXhHcG2` (`duoshot_indie_yearly`).
- DuoShot Studio: product `prod_VJU2K68snAML4c`, monthly EUR 49 price `price_1UIr4CClApGnRrWtURRdTjN2` (`duoshot_studio_monthly`), annual EUR 490 price `price_1UIusTClApGnRrWtJzNePk3l` (`duoshot_studio_yearly`).
- Annual billing costs ten monthly payments for twelve months of access (two months free, about 16.7% off). The test customer portal offers all four prices, viewing invoices, updating payment details and canceling at period end.
- The official Stripe Codex plugin is installed and its Stripe MCP connection has been authorized for the test account. This is an operator tool; the SaaS uses its own Stripe SDK credentials.

The four price IDs, a Stripe test API key, and a webhook signing secret are in the local ignored `.env.local`. The test key resolves to Stripe account `acct_1UExSRClApGnRrWt`. The test webhook endpoint is registered at `https://duoshot.vercel.app/api/stripe/webhook` with the seven subscription events below; its signing secret still needs an end-to-end delivery check. Both monthly test prices have inclusive tax behavior. Stripe Tax settings are pending and there are no active tax registrations, so automatic tax remains off. The local Supabase URL references project `jvhqcmqwrihbtwrggwuq`; the currently configured Supabase MCP references a different project. The matching database migration has therefore **not** been applied to the app project.

## Complete before real test checkout

1. Apply `supabase/migrations/20260923140000_billing_lifecycle.sql` to the app's Supabase project and verify the `stripe_events` table plus new `workspaces` columns. Set its server-only service role key in `SUPABASE_SERVICE_ROLE_KEY` locally and in the test deployment.
2. Keep `STRIPE_SECRET_KEY` set to the Stripe **test** server key. The publishable key is not needed for hosted Checkout. Never put secrets in source control or browser-exposed variables.
3. Deploy the webhook handler, then verify delivery to the registered test endpoint. It subscribes to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `.updated`, `.deleted`, `invoice.paid`, and `invoice.payment_failed`. Verify that the local `STRIPE_WEBHOOK_SECRET` belongs to this endpoint, and set the same endpoint secret in the test deployment.
4. Verify the business's tax registration and Stripe Tax settings before setting `STRIPE_TAX_ENABLED=true`. Stripe Tax is pending with no active tax registrations, so tax calculation is off. The test prices are tax-inclusive, but the marketing copy does not claim tax inclusion until the fiscal setup is confirmed.
5. Test monthly and annual Indie and Studio Checkout, delayed and duplicate webhooks, plan changes (including monthly ↔ annual), cancellation at period end, failed and recovered payments, deletion of a paying account, and two attempted subscriptions for one workspace. The account page must show the active plan only after a signed webhook updates the workspace.
6. Test one and ten capture pairs on desktop and mobile. Confirm the final file dimensions and the signed ZIP URL, including a ZIP over 4.5 MB. The signed URL lasts ten minutes; stored sources and ZIPs are cleaned up according to the existing storage job.

## Production gate

Create separate live products with monthly and annual prices and a live webhook, then set live keys and all four live price IDs in the production environment. `STRIPE_LIVE_ENABLED=true` is required to start live Checkout. Confirm tax behavior and perform one controlled real purchase before opening paid CTAs publicly. Keep Stripe test and live identifiers separate.

References: [Stripe Checkout](https://docs.stripe.com/billing/subscriptions/build-subscriptions?platform=web&ui=stripe-hosted), [customer portal](https://docs.stripe.com/customer-management/integrate-customer-portal), [subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks), [Stripe Tax setup](https://docs.stripe.com/tax/set-up).
