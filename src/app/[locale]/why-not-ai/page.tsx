import { WhyNotAiPage } from "@/components/why-not-ai-page";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../params";

// English slug of /pourquoi-pas-ia (same page, localized URL).

export function generateStaticParams() {
  return [{ locale: "en" }];
}

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params, "en");
  return pageMetadata({
    locale,
    path: "/pourquoi-pas-ia",
    title: "Why not your AI",
    description: "Your AI resizes. DuoShot flattens alpha, scores 2.3.3 clones, masks the hinge, and packs a Connect ZIP.",
  });
}

export default async function Page({ params }: LocaleParams) {
  return <WhyNotAiPage locale={await pageLocale(params, "en")} />;
}
