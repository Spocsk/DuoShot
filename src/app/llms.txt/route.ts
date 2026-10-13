import { SIZE_SPECS, SPECS_VERSION_DATE } from "@/lib/specs";
import { SITE_PITCH_FR, getSiteUrl } from "@/lib/site";
import { APPLE_SCREENSHOT_SOURCE, DUO_SLOT_COPY, DUO_SLOT_SOURCE } from "@/lib/apple-screenshot-status";
import { passCheckoutAvailable } from "@/lib/billing-availability";
import { getTranslator } from "@/lib/i18n";
import { PASS30 } from "@/lib/plans";

export function GET() {
  const sizes = SIZE_SPECS.map(
    (spec) => `- ${spec.label}${spec.label.includes(spec.inches) ? "" : ` ${spec.inches}`} ${spec.orientation}: ${spec.width}x${spec.height}`,
  ).join("\n");
  const { t, tf } = getTranslator("fr");
  const passOffer = passCheckoutAvailable()
    ? `- ${t("pricing_pass_title")}: ${tf("pricing_pass_price", { price: `${PASS30.priceEur} €` })}. ${t("pricing_pass_body")}\n`
    : "";
  const body = `# DuoShot — App Store Screenshot QA
> ${SITE_PITCH_FR}

- Specs version: ${SPECS_VERSION_DATE}
- Frameless App Store screenshots for iPhone Duo
- Canonical specs: ${getSiteUrl()}/specs
- Outer display sizes: ${getSiteUrl()}/1398x2034
- Inner display sizes: ${getSiteUrl()}/2007x2853
- Why not AI: ${getSiteUrl()}/pourquoi-pas-ia
- Rejection decoder: ${getSiteUrl()}/rejet
- Tool (noindex): ${getSiteUrl()}/tool

## Pixels
${sizes}

## Notes
- App Store Connect uses a single iPhone Duo slot, with up to 10 screenshots per locale; both outer and inner sizes are accepted.
- Duo slot content: outer only, inner only, or a user-selected mix; normal ZIPs contain the selection only
- Screen folders identify dimensions, not separate ASC slots; duo-slot.json records upload order
- Example ZIP: raw outer + inner sets; pick up to 10 for the single Duo slot
- Exports over the combined cap return HTTP 400 DUO_SLOT_LIMIT; no silent trimming
- Guideline 2.3.3: screenshots must accurately represent the app
- Optional 6.9" sizes are Indie / Studio
- Trial: 2 HD ZIP exports after signup, no card
- Indie: 12 EUR/month or 120 EUR/year; Studio: 49 EUR/month or 490 EUR/year. Annual billing upfront; paid limit 100 ZIPs per UTC day.
${passOffer}- ${DUO_SLOT_COPY.en}
- Duo slot source: ${DUO_SLOT_SOURCE}
- Apple upload status checked 2026-10-13: since 2026-10-05, App Store Connect accepts iPhone Duo optimized apps; from April 2027, every app submission must include iPhone Duo screenshots (for apps built with the iOS 27.1 SDK or later). Upload files manually.
- Apple source: ${APPLE_SCREENSHOT_SOURCE}
- Harbor is a fictional demonstration. No approval guarantee.
- Projects are saved locally on the device, not synchronized.
- Studio 49 EUR/month includes 3 seats and client reviews retained for 7 days
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
