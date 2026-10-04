import { AuthForm } from "@/components/auth-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";
import { safeNextPath } from "@/lib/auth-redirect";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/signup",
  title: "Créer un compte",
  description: "Inscription DuoShot : Google, e-mail ou lien magique.",
});

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale="fr" path="/signup" />
      <main id="main" className="px-5 py-16">
        <AuthForm locale="fr" mode="signup" nextPath={safeNextPath(next)} />
      </main>
      <SiteFooter locale="fr" />
    </div>
  );
}
