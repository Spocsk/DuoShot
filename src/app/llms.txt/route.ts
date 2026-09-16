import { SIZE_SPECS, SPECS_VERSION_DATE } from "@/lib/specs";
import { SITE_PITCH_FR, getSiteUrl } from "@/lib/site";

export function GET() {
  const sizes = SIZE_SPECS.map(
    (spec) => `- ${spec.label} ${spec.inches} ${spec.orientation}: ${spec.width}x${spec.height}`,
  ).join("\n");
  const body = `# DuoShot
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
- Trial: 2 HD ZIPs without a card; Indie 12 EUR/month
- Studio 49 EUR/month includes 3 seats and client reviews retained for 7 days
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
