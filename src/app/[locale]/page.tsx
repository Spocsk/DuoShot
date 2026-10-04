import { HomePage } from "@/components/home-page";
import { pageMetadata } from "@/lib/seo";
import { SITE_PITCH_EN, SITE_PITCH_FR } from "@/lib/site";
import { pageLocale, type LocaleParams } from "./params";

const COPY = {
  fr: { title: "Préparer vos captures iPhone Duo pour App Store Connect", description: SITE_PITCH_FR },
  en: { title: "Prepare iPhone Duo screenshots for App Store Connect", description: SITE_PITCH_EN },
};

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/", ...COPY[locale] });
}

export default async function Page({ params }: LocaleParams) {
  return <HomePage locale={await pageLocale(params)} />;
}
