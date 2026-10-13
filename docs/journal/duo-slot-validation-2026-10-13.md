# Duo single-slot export validation — 2026-10-13

Reviewed and extended the existing WIP on `codex/duo-single-slot-export`; implementation was not restarted.

## Behavior

- Outer only (default), inner only, or an individually selected mix. Selection is saved with the local draft.
- One shared limit of 10 Duo screenshots per listing locale. The UI warns above 10; synchronous export and queued export admission reject excess selections with HTTP 400 `DUO_SLOT_LIMIT` before reserving quota. Worker execution and ZIP construction enforce the cap again. Nothing is silently trimmed.
- Empty selections return `DUO_SELECTION_EMPTY`; invalid or duplicate picks return `INVALID_DUO_SELECTION`.
- Regular ZIPs contain only selected Duo files. Screen folders retain dimensions and original source indices; `duo-slot.json` records selection order for upload. Optional 6.9-inch output remains separate.
- The public example ZIP retains raw outer + inner sets, explicitly labeled to pick at most 10 for one Duo slot. Keeping both example sets lets users inspect both output sizes without implying two ASC slots.
- ASC groups capacity checks, set creation, replacement and ordering by `APP_IPHONE_DUO`, combining outer and inner files. Overfull legacy ZIPs are rejected; malformed selection manifests fail before contacting Apple.
- FR/EN copy, ZIP README, delivery hints, public `/llms.txt` (implemented by `src/app/llms.txt/route.ts`, not a static `public/llms.txt`), and `/specs` explain one slot, 10 maximum, both sizes accepted, and uploads not yet tested by DuoShot.

Additional review fixes: readiness labels/counts no longer require complete outer/inner pairs; empty/overfull mixes direct the main action to selection; changing selection clears previous acknowledgements; ZIP clone reports only include pairs selected for export. Added request-boundary and malformed-manifest regression tests.

## Final checks

Environment: Node v20.19.2, Next.js 16.3.8.

| Command | Result |
| --- | --- |
| `npm run lint` | PASS, exit 0, no lint diagnostics |
| `npx tsc --noEmit` | PASS, exit 0 |
| `npm run build` | PASS, exit 0, Next production build and render-worker bundle |
| `npm test` | Exit 1: 745 passed, 4 failed, 749 total; 98 passing test files, 2 failing, 100 total |
| `git diff --check` | PASS |
| `npx cypress verify` | Exit 1: Cypress cannot start; missing `/run/dbus/system_bus_socket` reported. Browser E2E suite not run. |

Build warnings: Supabase's Node 20 deprecation warning, and the existing `process.exit` Edge Runtime warning in `src/instrumentation.ts`.

The only four Vitest failures are:

1. `src/lib/supabase/admin.test.ts` — `builds a client from SUPABASE_SERVICE_ROLE_KEY`
2. `src/lib/supabase/admin.test.ts` — `falls back to SUPABASE_SECRET_KEY`
3. `src/worker/render-worker.smoke.test.ts` — `claims each lane once with the service key and exits cleanly when no job is queued`
4. `src/worker/render-worker.smoke.test.ts` — `stops polling and exits 0 on SIGTERM`

All four fail because the installed Supabase client requires a native WebSocket implementation unavailable in this Node 20 runtime. The tests supply their own credentials; these are not missing-production-secret failures. Both suites were also run against a `git archive` of cached `origin/main` at `0c0d1a2`: the same four failed and the other four tests passed. The tested baseline is explicitly the cached main revision, not the new remote main.

Logs in this session: `/tmp/duo-tests-final.log`, `/tmp/duo-lint-final.log`, `/tmp/duo-types-final.log`, `/tmp/duo-build-final.log`, `/tmp/duo-baseline.log`.

## Git blocker and remaining work

The requested first WIP commit failed at `git add` with:

```
fatal: Unable to create '/workspace/duo-export/.git/index.lock': Read-only file system
```

This session grants only read access to `.git` and permits no permission escalation. No commit, fetch, rebase, squash, or push was performed. Source changes remain uncommitted. Cached `origin/main` is `0c0d1a2`; `72aa41e` is not present locally. The SEO merge and promo-code merge `53d5dea` (including Checkout `allow_promotion_codes`) therefore still need integration and verification in a session with writable Git metadata. No Checkout code was modified here.

Remaining: commit the WIP, fetch/rebase onto current main preserving both merges, rerun checks after conflict resolution, and produce clean final commits without pushing. Browser E2E checks need a working Cypress runtime. Real App Store Connect acceptance of outer-only, inner-only and mixed sizes remains untested by DuoShot. The supplied ASC CLI source URL could not be retrieved in this session; implementation follows the user-provided contract.

## Files touched (including inherited WIP)

- `README.md`
- `cypress/e2e/marketing.cy.ts`
- `cypress/e2e/tool-asc.cy.ts`
- `cypress/e2e/tool-export.cy.ts`
- `cypress/support/commands.ts`
- `docs/app-store-connect.md`
- `docs/commercial-learning.md`
- `docs/journal/duo-slot-validation-2026-10-13.md`
- `src/app/api/asc/uploads/route.test.ts`
- `src/app/api/asc/uploads/route.ts`
- `src/app/api/export/route.test.ts`
- `src/app/llms.txt/route.ts`
- `src/components/apple-availability.tsx`
- `src/components/asc/asc-tool-action.tsx`
- `src/components/asc/asc-tool-state.test.ts`
- `src/components/asc/asc-tool-state.ts`
- `src/components/home-page.tsx`
- `src/components/legal-pages.tsx`
- `src/components/tool-app.tsx`
- `src/components/tool/delivery-actions.tsx`
- `src/components/tool/duo-slot-choice.test.ts`
- `src/components/tool/duo-slot-choice.tsx`
- `src/components/tool/errors.ts`
- `src/components/tool/use-render-jobs.ts`
- `src/lib/apple-screenshot-status.test.ts`
- `src/lib/apple-screenshot-status.ts`
- `src/lib/asc/config.ts`
- `src/lib/asc/upload-job.test.ts`
- `src/lib/asc/upload-job.ts`
- `src/lib/duo-selection.test.ts`
- `src/lib/duo-selection.ts`
- `src/lib/i18n/client-keys.ts`
- `src/lib/i18n/en.ts`
- `src/lib/i18n/fr.ts`
- `src/lib/pipeline/compose.test.ts`
- `src/lib/pipeline/compose.ts`
- `src/lib/pipeline/example-zip.test.ts`
- `src/lib/pipeline/example-zip.ts`
- `src/lib/pipeline/request.test.ts`
- `src/lib/pipeline/request.ts`
- `src/lib/pipeline/zip.test.ts`
- `src/lib/pipeline/zip.ts`
- `src/lib/render/enqueue.test.ts`
- `src/lib/render/enqueue.ts`
- `src/lib/render/export.test.ts`
- `src/lib/render/export.ts`
- `src/lib/sets-store.ts`
