import { LegalPage, TermsContent } from "@/components/legal-pages";
import { getTranslator } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../params";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const { t } = getTranslator(locale);
  return pageMetadata({ locale, path: "/terms", title: t("legal_terms_title"), description: t("legal_terms_description") });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const { t } = getTranslator(locale);
  return (
    <LegalPage locale={locale} path="/terms" title={t("legal_terms_heading")}>
      <TermsContent locale={locale} />
    </LegalPage>
  );
}
