# Supabase schema reconciliation — 25 September 2026

Project: jvhqcmqwrihbtwrggwuq (DuoShot). Read from the authenticated SQL editor; no initial migration replayed.

| Remote versions | Local equivalent |
|---|---|
| 20260912210559, 20260912210630, 20260912210657, 20260912210659, 20260912210743, 20260912210928 | 20260912120000_init_duoshot (split initialization and search_path fix) |
| 20260913092534 | 20260913120000_free_exports_used |
| 20260913140647 | 20260913143000_rpc_wrapper_security_definer |
| 20260913200046 | 20260913210000_review_links |
| 20260916100545 | 20260916120000_studio_reviews_and_invites (includes reviews bucket) |
| 20260916140903 | 20260916180000_review_public_access |

Tables/columns and public/private function signatures checked against the remote catalog. Remote cron duoshot-storage-24h runs `private.cleanup_expired_storage()` hourly at minute 20; it must be replaced with API-based physical deletion.

Applied in one transaction on 25 September: billing_lifecycle (20260923140000), analytics_consent (20260924120000), analytics_erasure_jobs (20260924123000). Registered those versions in the remote migration ledger. Verified two workspaces: one free, one studio with manual_plan=studio. No accounts or exports removed.

Do not blindly run db push: the historical initialization versions remain different. Apply only reviewed new migrations, or explicitly reconcile the ledger on a backed-up database first. New export/storage migrations are additive; the legacy RPC revocations in supabase/cutover are a separate post-deployment step. Rolling back old application code after cutover requires restoring the legacy permissions or keeping the corrected export/delete routes.

Also applied and verified in the remote ledger: 20260925120000_export_delivery, 20260925121000_storage_lifecycle, 20260925122000_studio_atomic_invites, 20260925123000_billing_concurrency. The existing 13 export records were preserved. The legacy cleanup cron now only expires review links; physical object deletion awaits the new API cron deployment. Legacy RPC and public review-bucket cutover has not been applied.
