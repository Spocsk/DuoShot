import { LegalPage, TermsContent } from "@/components/legal-pages";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../params";

const COPY = {
  fr: { title: "CGU", heading: "Conditions générales", description: "Conditions générales d’utilisation et de vente DuoShot." },
  en: { title: "Terms", heading: "Terms", description: "DuoShot terms of use and sale." },
};

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const { title, description } = COPY[locale];
  return pageMetadata({ locale, path: "/terms", title, description });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return (
    <LegalPage locale={locale} path="/terms" title={COPY[locale].heading}>
      <TermsContent locale={locale} />
    </LegalPage>
  );
}
