import { ToolApp } from "@/components/tool-app";
import { MessagesScope } from "@/components/messages-scope";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../params";

const COPY = {
  fr: { title: "Outil", description: "Composez vos captures Duo : import, double aperçu, ZIP." },
  en: { title: "Tool", description: "Compose Duo screenshots: drop, dual preview, ZIP." },
};

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/tool", ...COPY[locale] });
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
