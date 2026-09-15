import { PricingPage } from "@/components/pricing-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/pricing",
  title: "Tarifs",
  description: "Free, Launch 29 € / 60 j, Indie 12 €/mois, Studio 49 €/mois. ZIP Connect iPhone Duo.",
});

export default function Page() {
  return <PricingPage locale="fr" />;
}
