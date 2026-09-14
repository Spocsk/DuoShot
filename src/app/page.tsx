import { HomePage } from "@/components/home-page";
import { pageMetadata } from "@/lib/seo";
import { SITE_PITCH_FR } from "@/lib/site";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/",
  title: "ZIP App Store Connect iPhone Duo",
  description: SITE_PITCH_FR,
});

export default function Page() {
  return <HomePage locale="fr" />;
}
