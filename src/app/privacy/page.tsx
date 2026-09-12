import { LegalPage, PrivacyContent } from "@/components/legal-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/privacy",
  title: "Confidentialité",
  description: "Politique de confidentialité DuoShot — RGPD, UK GDPR, CCPA, LGPD.",
});

export default function Page() {
  return (
    <LegalPage locale="fr" path="/privacy" title="Confidentialité">
      <PrivacyContent locale="fr" />
    </LegalPage>
  );
}
