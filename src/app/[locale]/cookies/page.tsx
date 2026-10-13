import { CookiesContent, LegalPage } from "@/components/legal-pages";
import { getTranslator } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../params";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const { t } = getTranslator(locale);
  return pageMetadata({ locale, path: "/cookies", title: t("legal_cookies_title"), description: t("legal_cookies_description") });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const { t } = getTranslator(locale);
  return (
    <LegalPage locale={locale} path="/cookies" title={t("legal_cookies_title")}>
      <CookiesContent locale={locale} />
    </LegalPage>
  );
}
