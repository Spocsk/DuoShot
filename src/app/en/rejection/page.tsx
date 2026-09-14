import { RejectionPage } from "@/components/rejection-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "en",
  path: "/rejection",
  title: "App Store rejection decoder",
  description: "2.3.3, wrong pixels, alpha, incomplete set. DuoShot translation — no pasted Apple mail.",
});

export default function Page() {
  return <RejectionPage locale="en" />;
}
