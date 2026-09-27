import { RejectionPage } from "@/components/rejection-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/rejet",
  title: "Erreurs de captures App Store : dimensions et canal alpha",
  description: "Dimensions de capture invalides ou canal alpha : vérifiez les formats iPhone Duo et préparez des fichiers PNG/JPEG opaques pour App Store Connect.",
});

export default function Page() {
  return <RejectionPage locale="fr" />;
}
