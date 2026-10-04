import { LegalPage, MentionsContent } from "@/components/legal-pages";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../params";

const COPY = {
  fr: { title: "Mentions légales", description: "Mentions légales DuoShot : éditeur, hébergeur." },
  en: { title: "Legal notice", description: "DuoShot legal notice: publisher and host." },
};

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/legal", ...COPY[locale] });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return (
    <LegalPage locale={locale} path="/legal" title={COPY[locale].title}>
      <MentionsContent locale={locale} />
    </LegalPage>
  );
}
