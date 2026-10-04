import { AccountApp } from "@/components/account-app";
import { MessagesScope } from "@/components/messages-scope";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../params";

const COPY = {
  fr: { title: "Compte", description: "Compte DuoShot : offres, export JSON, suppression." },
  en: { title: "Account", description: "DuoShot account: plans, JSON export, deletion." },
};

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/account", ...COPY[locale] });
}

export const dynamic = "force-dynamic";

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale={locale} path="/account" />
      <MessagesScope locale={locale} scope="app">
        <AccountApp locale={locale} />
      </MessagesScope>
      <SiteFooter locale={locale} />
    </div>
  );
}
