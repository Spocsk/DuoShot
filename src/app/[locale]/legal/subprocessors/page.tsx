import { LegalPage, SubprocessorsContent } from "@/components/legal-pages";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../../params";

const COPY = {
  fr: { title: "Sous-traitants", description: "Liste datée des sous-traitants DuoShot." },
  en: { title: "Sub-processors", description: "Dated DuoShot sub-processor list." },
};

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/legal/subprocessors", ...COPY[locale] });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return (
    <LegalPage locale={locale} path="/legal/subprocessors" title={COPY[locale].title}>
      <SubprocessorsContent locale={locale} />
    </LegalPage>
  );
}
