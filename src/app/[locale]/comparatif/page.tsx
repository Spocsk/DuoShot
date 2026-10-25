import { ComparePage } from "@/components/compare-page";
import { pageMetadata } from "@/lib/seo";
import { COMPARE_PAGE_COPY, COMPARE_ROUTE, compareRobots } from "@/lib/compare";
import { pageLocale, type LocaleParams } from "../params";

// French slug of /en/compare (same page, localized URL).

export function generateStaticParams() {
  return [{ locale: "fr" }];
}

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params, "fr");
  const { title, description } = COMPARE_PAGE_COPY[locale];
  return { ...pageMetadata({ locale, path: COMPARE_ROUTE.fr, title, description }), robots: compareRobots() };
}

export default async function Page({ params }: LocaleParams) {
  return <ComparePage locale={await pageLocale(params, "fr")} />;
}
