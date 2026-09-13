import { LegalPage, TermsContent } from "@/components/legal-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/terms",
  title: "CGU",
  description: "Conditions générales d’utilisation et de vente DuoShot.",
});

export default function Page() {
  return (
    <LegalPage locale="fr" path="/terms" title="Conditions générales">
      <TermsContent locale="fr" />
    </LegalPage>
  );
}
