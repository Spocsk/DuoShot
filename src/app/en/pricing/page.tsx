import { PricingPage } from "@/components/pricing-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "en",
  path: "/pricing",
  title: "Pricing",
  description: "Free, Launch €29 / 60 days, Indie €12/month, Studio €49/month. iPhone Duo Connect ZIP.",
});

export default function Page() {
  return <PricingPage locale="en" />;
}
