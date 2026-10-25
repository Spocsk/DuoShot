# DuoShot — product direction

<!-- impeccable:product-schema 1 -->

## Purpose and audience

DuoShot is a web atelier for preparing iPhone Duo App Store screenshots. An indie iOS developer imports separate closed and open screen captures, adjusts composition, reviews an explainable preparation report, and downloads the resulting files for manual upload. Studio extends the same workflow with three seats and a seven-day client review link.

## Promise

DuoShot checks what software can check: input and output formats, output dimensions, transparency conversion, pair completeness, visual similarity and framing signals. For the developer's own captures, it asks them to confirm that every image shows the real app in use and remains legible near the fold. The supplied Harbor demo ZIP requires no human confirmation. A preparation score summarizes checks; it does not predict Apple approval or guarantee acceptance.

## Journey

1. Create a set with one orientation.
2. Import 1–10 captures for each screen state.
3. Inspect and adjust every pair in device and output-pixel previews.
4. Review the report, confirm the human checks for your own captures, choose up to 10 screenshots total across both screen states (DuoShot's selection limit), and export. Apple allows up to 10 screenshots per device size; in DuoShot you choose outer alone, inner alone, or a mix.
5. Examine the final file list and dimensions, download the ZIP, then upload files to App Store Connect manually.

The preview is available without an account. Exporting your own captures requires an account. Free trial (Essai gratuit in French) includes two HD exports; Indie is €12/month or €120/year and Studio is €49/month or €490/year. Paid plans allow up to 100 exports per day. The 30-day Pass costs €19 once, without automatic renewal, and grants Indie access for 30 days, including 6.9″ output and up to 100 exports per day. Prices and quotas are defined in `src/lib/plans.ts`.

The business operates under the French VAT exemption (article 293 B of the CGI): “TVA non applicable”. Stripe Tax is disabled.

## Constraints

- The ZIP contains the selected Duo screenshots in separate screen folders and `duo-slot.json` records their upload order. The prudent selection limit of 10 screenshots total across both screen states is DuoShot's rule, not Apple's. Apple's published rule allows up to 10 screenshots per device size. DuoShot lets you choose outer alone, inner alone, or a mix; Apple does not state that both sizes can be mixed in one set. Whether Apple's capacity is shared across both screens remains to be confirmed in a real App Store Connect upload trial. The optional App Store Connect connector is experimental: it is designed for selected Duo files and 6.9″ files, but no real upload has been verified end to end by DuoShot. Use the ZIP for manual upload. Keep this qualification until the end-to-end checks in `docs/app-store-connect.md` pass.
- Stripe is the source for paid access. Manual grants are stored separately. A signed webhook projects billing state into the workspace.
- Checkout availability is evaluated from runtime configuration by `src/lib/billing-availability.ts` and exposed by `/api/billing/availability`; the repository alone does not establish whether a deployment is accepting payments. Deployment history and outstanding payment checks are recorded in `docs/stripe-billing-setup.md`.
- The app supports French and English. It does not claim a rejection probability.
- Harbor is a fictional demo app used to illustrate the workflow and exported ZIP.
