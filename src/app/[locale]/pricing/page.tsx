import { PricingPage } from "@/components/pricing-page";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../params";

const COPY = {
  fr: { title: "Tarifs", description: "Essai avec 2 ZIP HD, Indie 12 €/mois et Studio 49 €/mois avec 3 sièges et validation client pendant 7 jours." },
  en: { title: "Pricing", description: "Trial with 2 HD ZIPs, Indie at €12/month, and Studio at €49/month with 3 seats and 7-day reviews." },
};

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/pricing", ...COPY[locale] });
}

export default async function Page({ params }: LocaleParams) {
  return <PricingPage locale={await pageLocale(params)} />;
}
