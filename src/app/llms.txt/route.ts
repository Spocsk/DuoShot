import { SIZE_SPECS, SPECS_VERSION_DATE } from "@/lib/specs";
import { SITE_PITCH_FR, getSiteUrl } from "@/lib/site";

export function GET() {
  const sizes = SIZE_SPECS.map(
    (spec) => `- ${spec.label} ${spec.inches} ${spec.orientation}: ${spec.width}x${spec.height}`,
  ).join("\n");
  const body = `# DuoShot — App Store Screenshot QA
> ${SITE_PITCH_FR}

- Specs version: ${SPECS_VERSION_DATE}
- Frameless App Store screenshots for iPhone Duo
- Canonical specs: ${getSiteUrl()}/specs
- Why not AI: ${getSiteUrl()}/pourquoi-pas-ia
- Rejection decoder: ${getSiteUrl()}/rejet
- Tool (noindex): ${getSiteUrl()}/tool

## Pixels
${sizes}

## Notes
- Separate shelf (one file per display), not boxed window
- Guideline 2.3.3: screenshots must accurately represent the app
- Optional 6.9" sizes are Indie / Studio
- Trial: 2 HD ZIP exports after signup, no card
- Indie: 12 EUR/month or 120 EUR/year; Studio: 49 EUR/month or 490 EUR/year. Annual billing upfront; paid limit 100 ZIPs per UTC day.
- Apple upload status checked 2026-09-25: Duo upload support is announced for later this year. Prepare files now, upload manually when available.
- Apple source: https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- Harbor is a fictional demonstration. No approval guarantee.
- Projects are saved locally on the device, not synchronized.
- Studio 49 EUR/month includes 3 seats and client reviews retained for 7 days
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
