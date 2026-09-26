import { HomePage } from "@/components/home-page";
import { pageMetadata } from "@/lib/seo";
import { SITE_PITCH_FR } from "@/lib/site";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/",
  title: "captures iPhone Duo pour l’App Store",
  description: SITE_PITCH_FR,
});

export default function Page() {
  return <HomePage locale="fr" />;
}
