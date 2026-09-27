import { SpecsPage } from "@/components/specs-page";
import { pageMetadata } from "@/lib/seo";
import { duoSpec, specPixels } from "@/lib/specs";
import { OUTER_PORTRAIT, INNER_PORTRAIT } from "@/lib/screenshot-copy";

export const metadata = pageMetadata({
  locale: "en",
  path: "/specs",
  title: `iPhone Duo Screenshot Sizes: ${specPixels(duoSpec("duo-outer", "portrait")).replace("x", "×")} & ${specPixels(duoSpec("duo-inner", "portrait")).replace("x", "×")}`,
  description: `App Store Connect screenshot dimensions: outer ${OUTER_PORTRAIT}, inner ${INNER_PORTRAIT} px. Portrait, landscape, PNG/JPEG and upload availability.`,
});

export default function Page() {
  return <SpecsPage locale="en" />;
}
