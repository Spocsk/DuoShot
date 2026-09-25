# DuoShot billing setup — 25 September 2026

## Configured in Stripe test mode

- DuoShot Indie: product `prod_VJU0ROjuNdmq4G`, monthly EUR 12 price `price_1UIr2AClApGnRrWtevMuWqDB` (`duoshot_indie_monthly`), annual EUR 120 price `price_1UIusDClApGnRrWtQfXhHcG2` (`duoshot_indie_yearly`).
- DuoShot Studio: product `prod_VJU2K68snAML4c`, monthly EUR 49 price `price_1UIr4CClApGnRrWtURRdTjN2` (`duoshot_studio_monthly`), annual EUR 490 price `price_1UIusTClApGnRrWtJzNePk3l` (`duoshot_studio_yearly`).
- Annual billing costs ten monthly payments for twelve months of access (two months free, about 16.7% off). The test customer portal offers all four prices, viewing invoices, updating payment details and canceling at period end.
- The official Stripe Codex plugin is installed and its Stripe MCP connection has been authorized for the test account. This is an operator tool; the SaaS uses its own Stripe SDK credentials.

The four test price IDs, a Stripe test API key and a webhook signing secret are stored only in ignored local configuration. The test account is `acct_1UExSRClApGnRrWt`. Its existing test webhook still points to `https://duoshot.vercel.app/api/stripe/webhook`; move it to an isolated test deployment before conducting payment tests. No Stripe test key was copied to Vercel Production.

The billing migration was applied to the correct Supabase project `jvhqcmqwrihbtwrggwuq` on 25 September after reconciling the migration histories. The server key is configured locally and in Vercel Production. Owner Studio access is held separately in `manual_plan`. Additive export, storage, atomic invitation and Checkout concurrency migrations have also been applied; see `schema-reconciliation-2026-09-25.md`.

**Checkout remains closed** through `STRIPE_CHECKOUT_ENABLED=false`. Tax settings, live account and controlled real purchase remain unvalidated. The production domain is now `https://duoshot.site`.

## Complete before real test checkout

1. Provision a separate Supabase test project, apply the reviewed schema there, and configure its public URL/key and server secret only in the isolated test deployment. Do not use the production database for Stripe test scenarios.
2. In that isolated environment, set `STRIPE_CHECKOUT_ENABLED=true` and `STRIPE_SECRET_KEY` to the Stripe **test** server key. The publishable key is not needed for hosted Checkout. Never put secrets in source control or browser-exposed variables.
3. Deploy the webhook handler, then verify delivery to the registered test endpoint. It subscribes to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `.updated`, `.deleted`, `invoice.paid`, and `invoice.payment_failed`. Verify that the local `STRIPE_WEBHOOK_SECRET` belongs to this endpoint, and set the same endpoint secret in the test deployment.
4. Verify the business's tax registration and Stripe Tax settings before setting `STRIPE_TAX_ENABLED=true`. Stripe Tax is pending with no active tax registrations, so tax calculation is off. The test prices are tax-inclusive, but the marketing copy does not claim tax inclusion until the fiscal setup is confirmed.
5. Test monthly and annual Indie and Studio Checkout, delayed and duplicate webhooks, plan changes (including monthly ↔ annual), cancellation at period end, failed and recovered payments, deletion of a paying account, and two attempted subscriptions for one workspace. The account page must show the active plan only after a signed webhook updates the workspace.
6. Test one and ten capture pairs on desktop and mobile. Confirm the final file dimensions and the signed ZIP URL, including a ZIP over 4.5 MB. The signed URL lasts ten minutes; sources and ZIPs expire after 24 hours and the new API-based purge is configured every 15 minutes. The effective Supabase project upload limit observed during testing is 50 MB. The ten-pair 43 MB acceptance ZIP passed; a 55.7 MB stress archive was correctly rejected and its trial refunded.

## Production gate

Create separate live products with monthly and annual prices and a live webhook, then set live keys and all four live price IDs in the production environment. Both `STRIPE_CHECKOUT_ENABLED=true` and `STRIPE_LIVE_ENABLED=true` are required to start live Checkout. Confirm tax behavior and perform one controlled real purchase before opening paid CTAs publicly. Keep Stripe test and live identifiers separate.

References: [Stripe Checkout](https://docs.stripe.com/billing/subscriptions/build-subscriptions?platform=web&ui=stripe-hosted), [customer portal](https://docs.stripe.com/customer-management/integrate-customer-portal), [subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks), [Stripe Tax setup](https://docs.stripe.com/tax/set-up).
