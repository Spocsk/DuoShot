import { ToolApp } from "@/components/tool-app";
import { MessagesScope } from "@/components/messages-scope";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/tool",
  title: "Outil",
  description: "Composez vos captures Duo : import, double aperçu, ZIP.",
});


export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale="fr" path="/tool" />
      <MessagesScope locale="fr" scope="app">
        <ToolApp locale="fr" />
      </MessagesScope>
      <SiteFooter locale="fr" />
    </div>
  );
}
