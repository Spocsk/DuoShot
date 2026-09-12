import { LegalPage, TermsContent } from "@/components/legal-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/terms",
  title: "Conditions",
  description: "Conditions d’utilisation DuoShot.",
});

export default function Page() {
  return (
    <LegalPage locale="fr" path="/terms" title="Conditions d’utilisation">
      <TermsContent locale="fr" />
    </LegalPage>
  );
}
