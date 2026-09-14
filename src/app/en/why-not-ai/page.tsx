import { WhyNotAiPage } from "@/components/why-not-ai-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "en",
  path: "/why-not-ai",
  title: "Why not your AI",
  description: "Your AI resizes. DuoShot flattens alpha, scores 2.3.3 clones, masks the hinge, and packs a Connect ZIP.",
});

export default function Page() {
  return <WhyNotAiPage locale="en" />;
}
