import { ToolApp } from "@/components/tool-app";
import { MessagesScope } from "@/components/messages-scope";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";
import { TOOL_PAGE_COPY } from "@/lib/marketing-copy";
import { pageLocale, type LocaleParams } from "../params";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/tool", ...TOOL_PAGE_COPY[locale] });
}

export const dynamic = "force-dynamic";

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale={locale} path="/tool" />
      <MessagesScope locale={locale} scope="app">
        <ToolApp locale={locale} />
      </MessagesScope>
      <SiteFooter locale={locale} />
    </div>
  );
}
