import { AuthForm } from "@/components/auth-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";
import { safeNextPath } from "@/lib/auth-redirect";
import { pageLocale, type LocaleParams } from "../params";

const COPY = {
  fr: { title: "Créer un compte", description: "Inscription DuoShot : Google, e-mail ou lien magique." },
  en: { title: "Sign up", description: "Create a DuoShot account: Google, email or magic link." },
};

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/signup", ...COPY[locale] });
}

export default async function Page({ params, searchParams }: LocaleParams & { searchParams: Promise<{ next?: string }> }) {
  const locale = await pageLocale(params);
  const { next } = await searchParams;
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale={locale} path="/signup" />
      <main id="main" className="px-5 py-16">
        <AuthForm locale={locale} mode="signup" nextPath={safeNextPath(next)} />
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
