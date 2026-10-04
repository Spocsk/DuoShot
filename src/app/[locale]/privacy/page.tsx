import { LegalPage, PrivacyContent } from "@/components/legal-pages";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../params";

const COPY = {
  fr: { title: "Confidentialité", description: "Politique de confidentialité DuoShot — RGPD, UK GDPR, CCPA, LGPD." },
  en: { title: "Privacy", description: "DuoShot privacy policy — GDPR, UK GDPR, CCPA, LGPD." },
};

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/privacy", ...COPY[locale] });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return (
    <LegalPage locale={locale} path="/privacy" title={COPY[locale].title}>
      <PrivacyContent locale={locale} />
    </LegalPage>
  );
}
