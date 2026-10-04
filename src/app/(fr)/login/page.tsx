import { AuthForm } from "@/components/auth-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";
import { safeNextPath } from "@/lib/auth-redirect";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/login",
  title: "Connexion",
  description: "Connexion DuoShot : Google, mot de passe ou lien magique.",
});

export default async function Page({ searchParams }: { searchParams: Promise<{ auth_error?: string; next?: string }> }) {
  const { auth_error, next } = await searchParams;
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale="fr" path="/login" />
      <main id="main" className="px-5 py-16">
        <AuthForm locale="fr" mode="login" initialError={auth_error === "invalid_link"} nextPath={safeNextPath(next)} />
      </main>
      <SiteFooter locale="fr" />
    </div>
  );
}
