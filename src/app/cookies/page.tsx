import { CookiesContent, LegalPage } from "@/components/legal-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/cookies",
  title: "Cookies",
  description: "Cookies DuoShot : session Auth, Web Analytics Vercel sans cookie.",
});

export default function Page() {
  return (
    <LegalPage locale="fr" path="/cookies" title="Cookies">
      <CookiesContent locale="fr" />
    </LegalPage>
  );
}
