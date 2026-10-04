import { CookiesContent, LegalPage } from "@/components/legal-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "en",
  path: "/cookies",
  title: "Cookies",
  description: "DuoShot cookies: Auth session and optional Datafast analytics with consent.",
});

export default function Page() {
  return (
    <LegalPage locale="en" path="/cookies" title="Cookies">
      <CookiesContent locale="en" />
    </LegalPage>
  );
}
