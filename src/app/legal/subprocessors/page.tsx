import { LegalPage, SubprocessorsContent } from "@/components/legal-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/legal/subprocessors",
  title: "Sous-traitants",
  description: "Liste datée des sous-traitants DuoShot.",
});

export default function Page() {
  return (
    <LegalPage locale="fr" path="/legal/subprocessors" title="Sous-traitants">
      <SubprocessorsContent locale="fr" />
    </LegalPage>
  );
}
