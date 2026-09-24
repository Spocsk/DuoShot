# DuoShot — product direction

<!-- impeccable:product-schema 1 -->

## Purpose and audience

DuoShot is a web atelier for preparing iPhone Duo App Store screenshots. An indie iOS developer imports separate closed and open screen captures, adjusts composition, reviews an explainable preparation report, and downloads the resulting files for manual upload. Studio extends the same workflow with three seats and a seven-day client review link.

## Promise

DuoShot checks what software can check: input and output formats, output dimensions, transparency conversion, pair completeness, visual similarity and framing signals. It asks the developer to confirm that every image shows the real app in use and remains legible near the fold. A preparation score summarizes checks; it does not predict Apple approval or guarantee acceptance.

## Journey

1. Create a set with one orientation.
2. Import 1–10 captures for each screen state.
3. Inspect and adjust every pair in device and output-pixel previews.
4. Review the report, confirm the human checks, and export.
5. Examine the final file list and dimensions, download the ZIP, then upload files to App Store Connect manually.

The preview is available without an account. Download requires an account. Free includes two HD exports; Indie is €12/month and Studio is €49/month. Paid plans allow up to 100 sets per day. The Stripe Checkout total and applicable taxes must be confirmed before public payment activation.

## Constraints

- Closed and open exports are separate files and folders; no direct Duo upload to App Store Connect is currently offered.
- Stripe is the source for paid access. Manual grants are stored separately. A signed webhook projects billing state into the workspace.
- Stripe test products and customer portal are configured. Live billing remains off until fiscal settings, webhook, database migration, credentials and end-to-end payment tests are complete.
- The app supports French and English. It does not claim a rejection probability.
- Harbor is a fictional demo app used to illustrate the workflow and exported ZIP.
