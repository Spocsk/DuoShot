import { AuthForm } from "@/components/auth-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";
import { safeNextPath } from "@/lib/auth-redirect";
import { pageLocale, type LocaleParams } from "../params";

const COPY = {
  fr: { title: "Connexion", description: "Connexion DuoShot : Google, mot de passe ou lien magique." },
  en: { title: "Log in", description: "Log in to DuoShot: Google, password or magic link." },
};

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  return pageMetadata({ locale, path: "/login", ...COPY[locale] });
}

export default async function Page({ params, searchParams }: LocaleParams & { searchParams: Promise<{ auth_error?: string; next?: string }> }) {
  const locale = await pageLocale(params);
  const { auth_error, next } = await searchParams;
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale={locale} path="/login" />
      <main id="main" className="px-5 py-16">
        <AuthForm locale={locale} mode="login" initialError={auth_error === "invalid_link"} nextPath={safeNextPath(next)} />
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
