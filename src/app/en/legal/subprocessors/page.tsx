import { LegalPage, SubprocessorsContent } from "@/components/legal-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "en",
  path: "/legal/subprocessors",
  title: "Sub-processors",
  description: "Dated DuoShot sub-processor list.",
});

export default function Page() {
  return (
    <LegalPage locale="en" path="/legal/subprocessors" title="Sub-processors">
      <SubprocessorsContent locale="en" />
    </LegalPage>
  );
}
