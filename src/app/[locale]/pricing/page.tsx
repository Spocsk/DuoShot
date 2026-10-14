import { PricingPage } from "@/components/pricing-page";
import { pageMetadata } from "@/lib/seo";
import { PRICING_PAGE_COPY } from "@/lib/marketing-copy";
import { pageLocale, type LocaleParams } from "../params";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/pricing", ...PRICING_PAGE_COPY[locale] });
}

export default async function Page({ params }: LocaleParams) {
  return <PricingPage locale={await pageLocale(params)} />;
}
