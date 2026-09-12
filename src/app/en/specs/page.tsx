import { SpecsPage } from "@/components/specs-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "en",
  path: "/specs",
  title: "iPhone Duo pixels",
  description: "iPhone Duo shelf sizes: outer 5.4″, inner 7.6″, optional 6.9″. Versioned, guideline 2.3.3.",
});

export default function Page() {
  return <SpecsPage locale="en" />;
}
