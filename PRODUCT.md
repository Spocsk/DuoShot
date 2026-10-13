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
4. Review the report, confirm the human checks for your own captures, choose up to 10 screenshots across both screen states for the single Duo slot, and export.
5. Examine the final file list and dimensions, download the ZIP, then upload files to App Store Connect manually.

The preview is available without an account. Exporting your own captures requires an account. Free trial (Essai gratuit in French) includes two HD exports; Indie is €12/month or €120/year and Studio is €49/month or €490/year. Paid plans allow up to 100 exports per day. The 30-day Pass costs €19 once, without automatic renewal, and grants Indie access for 30 days, including 6.9″ output and up to 100 exports per day. Prices and quotas are defined in `src/lib/plans.ts`.

The business operates under the French VAT exemption (article 293 B of the CGI): “TVA non applicable”. Stripe Tax is disabled.

## Constraints

- The ZIP contains the selected Duo screenshots in separate screen folders and `duo-slot.json` records their upload order. Both screen sizes share one `APP_IPHONE_DUO` slot, with at most 10 screenshots per locale. The optional App Store Connect connector supports selected Duo files and supported 6.9″ files; Duo uploads have not yet been tested by DuoShot. Manual ZIP upload remains available.
- Stripe is the source for paid access. Manual grants are stored separately. A signed webhook projects billing state into the workspace.
- Stripe test products and customer portal are configured. Live billing remains off until fiscal settings, webhook, database migration, credentials and end-to-end payment tests are complete.
- The app supports French and English. It does not claim a rejection probability.
- Harbor is a fictional demo app used to illustrate the workflow and exported ZIP.
