import { ToolApp } from "@/components/tool-app";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "en",
  path: "/tool",
  title: "Tool",
  description: "Compose Duo screenshots: drop, dual preview, ZIP.",
});

export const robots = { index: false, follow: false };
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale="en" path="/tool" />
      <ToolApp locale="en" />
      <SiteFooter locale="en" />
    </div>
  );
}
