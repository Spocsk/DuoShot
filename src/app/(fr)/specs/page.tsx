import { SpecsPage } from "@/components/specs-page";
import { pageMetadata } from "@/lib/seo";
import { duoSpec, specPixels } from "@/lib/specs";
import { OUTER_PORTRAIT, INNER_PORTRAIT } from "@/lib/screenshot-copy";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/specs",
  title: `Tailles des captures iPhone Duo : ${specPixels(duoSpec("duo-outer", "portrait")).replace("x", "×")} et ${specPixels(duoSpec("duo-inner", "portrait")).replace("x", "×")}`,
  description: `Dimensions App Store Connect : écran externe ${OUTER_PORTRAIT}, interne ${INNER_PORTRAIT} px. Portrait, paysage, PNG/JPEG et disponibilité du dépôt.`,
});

export default function Page() {
  return <SpecsPage locale="fr" />;
}
