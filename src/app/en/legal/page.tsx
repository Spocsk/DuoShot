import { LegalPage, MentionsContent } from "@/components/legal-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "en",
  path: "/legal",
  title: "Legal notice",
  description: "DuoShot legal notice: publisher and host.",
});

export default function Page() {
  return (
    <LegalPage locale="en" path="/legal" title="Legal notice">
      <MentionsContent locale="en" />
    </LegalPage>
  );
}
