import { LegalPage, MentionsContent } from "@/components/legal-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/legal",
  title: "Mentions légales",
  description: "Mentions légales DuoShot : éditeur, hébergeur.",
});

export default function Page() {
  return (
    <LegalPage locale="fr" path="/legal" title="Mentions légales">
      <MentionsContent locale="fr" />
    </LegalPage>
  );
}
