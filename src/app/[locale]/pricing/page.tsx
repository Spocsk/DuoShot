import { PricingPage } from "@/components/pricing-page";
import { pageMetadata } from "@/lib/seo";
import { PLANS } from "@/lib/plans";
import { REVIEW_TTL_DAYS } from "@/lib/reviews";
import { pageLocale, type LocaleParams } from "../params";

const COPY = {
  fr: { title: "Tarifs", description: `Essai gratuit avec ${PLANS.free.freeExports} exports et taille iPhone 6,3″ requise. Indie ${PLANS.indie.monthlyEur} €/mois et Studio ${PLANS.studio.monthlyEur} €/mois : 6,9″ optionnel ; Studio inclut ${PLANS.studio.seats} sièges et validation client pendant ${REVIEW_TTL_DAYS} jours.` },
  en: { title: "Pricing", description: `Free trial with ${PLANS.free.freeExports} exports and the required 6.3″ iPhone size. Indie at €${PLANS.indie.monthlyEur}/month and Studio at €${PLANS.studio.monthlyEur}/month: optional 6.9″; Studio includes ${PLANS.studio.seats} seats and ${REVIEW_TTL_DAYS}-day reviews.` },
};

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/pricing", ...COPY[locale] });
}

export default async function Page({ params }: LocaleParams) {
  return <PricingPage locale={await pageLocale(params)} />;
}
