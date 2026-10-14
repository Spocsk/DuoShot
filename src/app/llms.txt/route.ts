import { IPHONE_63_ALTERNATIVE, SIZE_SPECS, SPECS_VERSION_DATE, specPixels } from "@/lib/specs";
import { SITE_PITCH_FR, getSiteUrl } from "@/lib/site";
import { APPLE_SCREENSHOT_SOURCE, DUO_SLOT_COPY, DUO_SLOT_SOURCE } from "@/lib/apple-screenshot-status";
import { passCheckoutAvailable } from "@/lib/billing-availability";
import { getTranslator } from "@/lib/i18n";
import { FREE_EXPORTS, PASS30, PLANS, STUDIO_SEATS } from "@/lib/plans";

export function GET() {
  const sizes = SIZE_SPECS.map(
    (spec) => `- ${spec.label}${spec.label.includes(spec.inches) ? "" : ` ${spec.inches}`} ${spec.orientation}: ${spec.width}x${spec.height}`,
  ).join("\n");
  const { tf } = getTranslator("fr");
  const passOffer = passCheckoutAvailable()
    ? `- ${tf("pricing_pass_title", { days: PASS30.days })}: ${tf("pricing_pass_price", { price: `${PASS30.priceEur} €` })}. ${tf("pricing_pass_body", { days: PASS30.days })}\n`
    : "";
  const body = `# DuoShot — App Store Screenshot QA
> ${SITE_PITCH_FR}

- Specs version: ${SPECS_VERSION_DATE}
- Frameless App Store screenshots for iPhone Duo
- Canonical specs: ${getSiteUrl()}/specs
- Outer display sizes: ${getSiteUrl()}/1398x2034
- Inner display sizes: ${getSiteUrl()}/2007x2853
- Required 6.3" iPhone sizes: ${getSiteUrl()}/1206x2622 (EN: ${getSiteUrl()}/en/1206x2622)
- Why not AI: ${getSiteUrl()}/pourquoi-pas-ia
- Rejection decoder: ${getSiteUrl()}/rejet
- Tool (noindex): ${getSiteUrl()}/tool

## Pixels
${sizes}
- iPhone 6.3" portrait alternative accepted by App Store Connect: ${specPixels(IPHONE_63_ALTERNATIVE.portrait)}
- iPhone 6.3" landscape alternative accepted by App Store Connect: ${specPixels(IPHONE_63_ALTERNATIVE.landscape)}

## Notes
- App Store Connect uses a single iPhone Duo slot, with up to 10 screenshots per locale; both outer and inner sizes are accepted.
- Duo slot content: outer only, inner only, or a user-selected mix; normal ZIPs contain the selection only
- Screen folders identify dimensions, not separate ASC slots; duo-slot.json records upload order
- Example ZIP: raw outer + inner sets; pick up to 10 for the single Duo slot
- Exports over the combined cap return HTTP 400 DUO_SLOT_LIMIT; no silent trimming
- Guideline 2.3.3: screenshots must accurately represent the app
- Optional 6.9" sizes are Indie / Studio
- App Store Connect requires 6.3" iPhone screenshots; DuoShot exports 1206x2622 portrait or 2622x1206 landscape, included in the free trial. The accepted 1179x2556 alternative is not a DuoShot export preset.
- Free trial: ${FREE_EXPORTS} HD exports after signup, no card; selected Duo screenshots and the required 6.3" iPhone size
- Indie: ${PLANS.indie.monthlyEur} EUR/month or ${PLANS.indie.yearlyEur} EUR/year; Studio: ${PLANS.studio.monthlyEur} EUR/month or ${PLANS.studio.yearlyEur} EUR/year. Annual billing upfront; paid limit ${PLANS.indie.dailyHdSets} exports per UTC day.
${passOffer}- ${DUO_SLOT_COPY.en}
- Duo slot source: ${DUO_SLOT_SOURCE}
- Apple upload status checked 2026-10-13: since 2026-10-05, App Store Connect accepts iPhone Duo optimized apps; from April 2027, every app submission must include iPhone Duo screenshots (for apps built with the iOS 27.1 SDK or later). Upload files manually.
- Apple source: ${APPLE_SCREENSHOT_SOURCE}
- Harbor is a fictional demonstration. No approval guarantee.
- Projects are saved locally on the device, not synchronized.
- Studio ${PLANS.studio.monthlyEur} EUR/month includes ${STUDIO_SEATS} seats and client reviews retained for 7 days
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
