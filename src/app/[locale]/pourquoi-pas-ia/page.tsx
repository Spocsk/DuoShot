import { WhyNotAiPage } from "@/components/why-not-ai-page";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../params";

// French slug of /en/why-not-ai (same page, localized URL).

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params, "fr");
  return pageMetadata({
    locale,
    path: "/pourquoi-pas-ia",
    title: "Pourquoi pas votre IA",
    description: "Votre IA redimensionne. DuoShot aplatit l’alpha, évalue le risque clone 2.3.3, masque la charnière et prépare un ZIP pour Connect.",
  });
}

export default async function Page({ params }: LocaleParams) {
  return <WhyNotAiPage locale={await pageLocale(params, "fr")} />;
}
