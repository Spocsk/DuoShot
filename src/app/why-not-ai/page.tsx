import { WhyNotAiPage } from "@/components/why-not-ai-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/why-not-ai",
  title: "Pourquoi pas ton IA",
  description: "Ton IA resize. DuoShot flatten l’alpha, score le clone 2.3.3, masque la charnière et pack un ZIP Connect.",
});

export default function Page() {
  return <WhyNotAiPage locale="fr" />;
}
