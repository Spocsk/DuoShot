import { HomePage } from "@/components/home-page";
import { pageMetadata } from "@/lib/seo";
import { SITE_PITCH_FR } from "@/lib/site";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/",
  title: "Préparer vos captures iPhone Duo pour App Store Connect",
  description: SITE_PITCH_FR,
});

export default function Page() {
  return <HomePage locale="fr" />;
}
