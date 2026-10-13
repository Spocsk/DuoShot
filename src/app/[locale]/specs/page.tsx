import { SpecsPage } from "@/components/specs-page";
import { pageMetadata } from "@/lib/seo";
import { SPECS_PAGE_COPY } from "@/lib/screenshot-pages";
import { pageLocale, type LocaleParams } from "../params";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/specs", ...SPECS_PAGE_COPY[locale] });
}

export default async function Page({ params }: LocaleParams) {
  return <SpecsPage locale={await pageLocale(params)} />;
}
