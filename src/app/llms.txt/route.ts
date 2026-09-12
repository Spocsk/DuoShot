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
- Tool (noindex): ${getSiteUrl()}/tool

## Pixels
${sizes}

## Notes
- Separate shelf (one file per display), not boxed window
- Guideline 2.3.3: screenshots must accurately represent the app
- Optional 6.9" sizes are Indie/Studio only
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
