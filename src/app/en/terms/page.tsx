import { LegalPage, TermsContent } from "@/components/legal-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "en",
  path: "/terms",
  title: "Terms",
  description: "DuoShot terms of use and sale.",
});

export default function Page() {
  return (
    <LegalPage locale="en" path="/terms" title="Terms">
      <TermsContent locale="en" />
    </LegalPage>
  );
}
