import { WhyNotAiPage } from "@/components/why-not-ai-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/pourquoi-pas-ia",
  title: "Pourquoi pas votre IA",
  description: "Votre IA redimensionne. DuoShot aplatit l’alpha, évalue le risque clone 2.3.3, masque la charnière et prépare un ZIP pour Connect.",
});

export default function Page() {
  return <WhyNotAiPage locale="fr" />;
}
