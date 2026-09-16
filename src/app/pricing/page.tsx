import { PricingPage } from "@/components/pricing-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/pricing",
  title: "Tarifs",
  description: "Essai avec 2 ZIP HD, Indie 12 €/mois et Studio 49 €/mois avec 3 sièges et reviews 7 jours.",
});

export default function Page() {
  return <PricingPage locale="fr" />;
}
