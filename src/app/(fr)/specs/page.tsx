import { SpecsPage } from "@/components/specs-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/specs",
  title: "Pixels iPhone Duo",
  description: "Tailles d’étagère iPhone Duo : outer 5,4″, inner 7,6″, option 6,9″. Versionnées, guideline 2.3.3.",
});

export default function Page() {
  return <SpecsPage locale="fr" />;
}
