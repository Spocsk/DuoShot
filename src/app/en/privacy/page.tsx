import { LegalPage, PrivacyContent } from "@/components/legal-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "en",
  path: "/privacy",
  title: "Privacy",
  description: "DuoShot privacy policy — GDPR, UK GDPR, CCPA, LGPD.",
});

export default function Page() {
  return (
    <LegalPage locale="en" path="/privacy" title="Privacy">
      <PrivacyContent locale="en" />
    </LegalPage>
  );
}
