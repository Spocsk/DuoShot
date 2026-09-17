import { PricingPage } from "@/components/pricing-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "en",
  path: "/pricing",
  title: "Pricing",
  description: "Trial with 2 HD ZIPs, Launch at €29/60 days until 23 Oct 2026, Indie at €12/month, and Studio at €49/month with 3 seats and 7-day reviews.",
});

export default function Page() {
  return <PricingPage locale="en" />;
}
