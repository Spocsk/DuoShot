import { CookiesContent, LegalPage } from "@/components/legal-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/cookies",
  title: "Cookies",
  description: "Cookies DuoShot : session Auth uniquement, pas de bandeau CMP en v1.",
});

export default function Page() {
  return (
    <LegalPage locale="fr" path="/cookies" title="Cookies">
      <CookiesContent locale="fr" />
    </LegalPage>
  );
}
