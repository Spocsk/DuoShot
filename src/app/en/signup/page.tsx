import { AuthForm } from "@/components/auth-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "en",
  path: "/signup",
  title: "Sign up",
  description: "Create a DuoShot account: Google, email or magic link. Age 16+.",
});

export default function Page() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale="en" path="/signup" />
      <main className="px-5 py-16">
        <AuthForm locale="en" mode="signup" />
      </main>
      <SiteFooter locale="en" />
    </div>
  );
}
