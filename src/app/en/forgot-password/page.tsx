import { PasswordRecovery } from "@/components/password-recovery";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ locale: "en", path: "/forgot-password", title: "Forgot password", description: "Forgot password · DuoShot" });
export default function Page() {
  return <div className="flex min-h-full flex-col">
    <SiteHeader locale="en" path="/forgot-password" />
    <main id="main" className="px-5 py-16"><PasswordRecovery locale="en" reset={false} /></main>
    <SiteFooter locale="en" />
  </div>;
}
