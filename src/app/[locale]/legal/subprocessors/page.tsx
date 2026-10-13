import { LegalPage, SubprocessorsContent } from "@/components/legal-pages";
import { getTranslator } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../../params";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const { t } = getTranslator(locale);
  return pageMetadata({ locale, path: "/legal/subprocessors", title: t("legal_subprocessors_title"), description: t("legal_subprocessors_description") });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const { t } = getTranslator(locale);
  return (
    <LegalPage locale={locale} path="/legal/subprocessors" title={t("legal_subprocessors_title")}>
      <SubprocessorsContent locale={locale} />
    </LegalPage>
  );
}
