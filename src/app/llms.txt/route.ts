import { IPHONE_63_ALTERNATIVE, SIZE_SPECS, SPECS_VERSION_DATE, duoSpec, specPixels } from "@/lib/specs";
import { getSiteUrl } from "@/lib/site";
import { APPLE_SCREENSHOT_SOURCE, DUO_SLOT_SOURCE } from "@/lib/apple-screenshot-status";
import { INNER_PORTRAIT, OUTER_PORTRAIT } from "@/lib/screenshot-copy";
import { passCheckoutAvailable } from "@/lib/billing-availability";
import { getTranslator } from "@/lib/i18n";
import { COMPARISON_GUIDE_PATH } from "@/lib/guides";
import { COMPARISONS, comparisonPath } from "@/lib/comparisons";
import { compareLlmsEntry } from "@/lib/compare";
import { FREE_EXPORTS, PASS30, PLANS, STUDIO_SEATS } from "@/lib/plans";

export function GET() {
  const sizes = SIZE_SPECS.map((spec) => {
    const label = spec.slot === "duo-outer" ? "iPhone Duo outer display"
      : spec.slot === "duo-inner" ? "iPhone Duo inner display"
      : `${spec.label}${spec.label.includes(spec.inches) ? "" : ` ${spec.inches}`}`;
    return `- ${label} ${spec.orientation}: ${spec.width}x${spec.height}`;
  }).join("\n");
  const comparisonLinks = COMPARISONS.map(({ slug, name }) =>
    `- DuoShot vs ${name}: ${getSiteUrl()}${comparisonPath(slug)} (EN: ${getSiteUrl()}/en${comparisonPath(slug)})`,
  ).join("\n");
  const compareEntry = compareLlmsEntry(getSiteUrl());
  const { t, tf } = getTranslator("fr");
  const passAvailable = passCheckoutAvailable();
  const tagline = t(passAvailable ? "home_import_closed_open_captures" : "home_import_closed_open_captures_without_pass");
  const passOffer = passAvailable
    ? `- ${tf("pricing_pass_title", { days: PASS30.days })}: ${tf("pricing_pass_price", { price: `${PASS30.priceEur} €` })}. ${tf("pricing_pass_body", { days: PASS30.days })}\n`
    : "";
  const body = `# DuoShot — App Store Screenshot QA
> ${tagline}

${getTranslator("en").t("specs_duoshot_identity")}

- Specs version: ${SPECS_VERSION_DATE}
- Frameless App Store screenshots for iPhone Duo
- Canonical specs: ${getSiteUrl()}/specs (EN: ${getSiteUrl()}/en/specs)
- Outer display sizes: ${getSiteUrl()}/1398x2034 (EN: ${getSiteUrl()}/en/1398x2034)
- Inner display sizes: ${getSiteUrl()}/2007x2853 (EN: ${getSiteUrl()}/en/2007x2853)
- iPhone with Dynamic Island (medium display, 6.3") required: ${getSiteUrl()}/1206x2622 (EN: ${getSiteUrl()}/en/1206x2622)
- Optional 6.9" iPhone sizes: ${getSiteUrl()}/1320x2868 (EN: ${getSiteUrl()}/en/1320x2868)
- Why not AI: ${getSiteUrl()}/pourquoi-pas-ia (EN: ${getSiteUrl()}/en/why-not-ai)
- Rejection decoder: ${getSiteUrl()}/rejet (EN: ${getSiteUrl()}/en/rejection)
- Screenshot generator comparison: ${getSiteUrl()}${COMPARISON_GUIDE_PATH} (EN: ${getSiteUrl()}/en${COMPARISON_GUIDE_PATH})
${comparisonLinks}${compareEntry ? `\n${compareEntry}` : ""}
- Manual iPhone Duo (Apple's foldable iPhone) upload guide: ${getSiteUrl()}/guides/iphone-duo-app-store-connect (EN: ${getSiteUrl()}/en/guides/iphone-duo-app-store-connect)
- Free screenshot checker (dimensions, transparency, Duo count; client-side, no uploads): ${getSiteUrl()}/tools/iphone-duo-screenshot-checker (EN: ${getSiteUrl()}/en/tools/iphone-duo-screenshot-checker)
- Tool (noindex): ${getSiteUrl()}/tool

## Export sizes (portrait)
- iPhone Duo outer display: 1398x2034
- iPhone Duo inner display: 2007x2853
- iPhone with Dynamic Island (medium display, 6.3") required: 1206x2622, included in the free trial
- iPhone 6.9": 1320x2868, optional with ${passAvailable ? "Pass, Indie and Studio" : "Indie and Studio"}

## Pixels
${sizes}
- iPhone 6.3" portrait alternative accepted by App Store Connect: ${specPixels(IPHONE_63_ALTERNATIVE.portrait)}
- iPhone 6.3" landscape alternative accepted by App Store Connect: ${specPixels(IPHONE_63_ALTERNATIVE.landscape)}

## Notes
- App Store Connect accepts up to 10 iPhone Duo screenshots per device size; outer (${specPixels(duoSpec("duo-outer", "portrait"))}) and inner (${specPixels(duoSpec("duo-inner", "portrait"))}) sizes are both accepted.
- DuoShot selection: outer only, inner only, or a user-selected mix; normal ZIPs contain the selection only
- Screen folders identify dimensions; duo-slot.json records upload order
- Example ZIP: raw outer + inner sets; pick up to 10 in total for your selection
- The limit of 10 screenshots total across both screens is DuoShot's rule, not Apple's; exports above it are refused with HTTP 400, no silent trimming. Whether Apple's capacity is shared across both screens remains to be confirmed in a real App Store Connect upload.
- Guideline 2.3.3: screenshots must accurately represent the app
- ${getTranslator("en").t("duo_landscape_first_warning")}
- Optional 6.9" sizes are included with ${passAvailable ? "Pass / Indie / Studio" : "paid access"}
- iPhone with Dynamic Island (medium display, 6.3") required for App Store Connect; DuoShot exports 1206x2622 portrait or 2622x1206 landscape, included in the free trial. The accepted 1179x2556 alternative is not a DuoShot export preset.

## Prices (EUR)
- Pricing: ${getSiteUrl()}/pricing (EN: ${getSiteUrl()}/en/pricing)
- Free trial: 0 EUR, ${FREE_EXPORTS} HD ZIPs after signup, no card; selected Duo screenshots and iPhone with Dynamic Island (medium display, 6.3") required
- Indie: ${PLANS.indie.monthlyEur} EUR/month or ${PLANS.indie.yearlyEur} EUR/year; Studio: ${PLANS.studio.monthlyEur} EUR/month or ${PLANS.studio.yearlyEur} EUR/year. Annual billing upfront; paid limit ${PLANS.indie.dailyHdSets} exports per UTC day.
${passOffer}
## Upload status
- Apple: up to 10 screenshots per device size; both sizes are accepted: ${OUTER_PORTRAIT} and ${INNER_PORTRAIT}, or their landscape dimensions. Uploads have not yet been tested by DuoShot.
- Third-party reference (ASC CLI): ${DUO_SLOT_SOURCE}
- Apple upload status checked 2026-10-13: since 2026-10-05, App Store Connect accepts iPhone Duo optimized apps; from April 2027, every app submission must include iPhone Duo screenshots (for apps built with the iOS 27.1 SDK or later). Upload files manually.
- Primary source (Apple screenshot specifications): ${APPLE_SCREENSHOT_SOURCE}
- Harbor is a fictional demonstration. No approval guarantee.
- Projects are saved locally on the device, not synchronized.
- Studio ${PLANS.studio.monthlyEur} EUR/month includes ${STUDIO_SEATS} seats and client reviews retained for 7 days
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
