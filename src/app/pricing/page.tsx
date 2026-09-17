import { PricingPage } from "@/components/pricing-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/pricing",
  title: "Tarifs",
  description: "Essai avec 2 ZIP HD, Launch 29 € / 60 j jusqu’au 23 oct. 2026, Indie 12 €/mois et Studio 49 €/mois avec 3 sièges et reviews 7 jours.",
});

export default function Page() {
  return <PricingPage locale="fr" />;
}
