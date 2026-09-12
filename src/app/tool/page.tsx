import { ToolApp } from "@/components/tool-app";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/tool",
  title: "Outil",
  description: "Compose tes screenshots Duo : drop, preview dual, ZIP.",
});

export const robots = { index: false, follow: false };

export default function Page() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale="fr" path="/tool" />
      <ToolApp locale="fr" />
      <SiteFooter locale="fr" />
    </div>
  );
}
