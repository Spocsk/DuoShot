import { CookiesContent, LegalPage } from "@/components/legal-pages";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../params";

const COPY = {
  fr: { title: "Cookies", description: "Cookies DuoShot : session Auth et statistiques Datafast sur consentement." },
  en: { title: "Cookies", description: "DuoShot cookies: Auth session and optional Datafast analytics with consent." },
};

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/cookies", ...COPY[locale] });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return (
    <LegalPage locale={locale} path="/cookies" title={COPY[locale].title}>
      <CookiesContent locale={locale} />
    </LegalPage>
  );
}
