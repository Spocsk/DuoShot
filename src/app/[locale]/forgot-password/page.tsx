import { PasswordRecovery } from "@/components/password-recovery";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../params";

const COPY = {
  fr: { title: "Mot de passe oublié", description: "Mot de passe oublié · DuoShot" },
  en: { title: "Forgot password", description: "Forgot password · DuoShot" },
};

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/forgot-password", ...COPY[locale] });
}

export default async function Page({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return <div className="flex min-h-full flex-col">
    <SiteHeader locale={locale} path="/forgot-password" />
    <main id="main" className="px-5 py-16"><PasswordRecovery locale={locale} reset={false} /></main>
    <SiteFooter locale={locale} />
  </div>;
}
