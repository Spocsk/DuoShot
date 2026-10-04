import { RejectionPage } from "@/components/rejection-page";
import { pageMetadata } from "@/lib/seo";
import { pageLocale, type LocaleParams } from "../params";

// French slug of /en/rejection (same page, localized URL).

export function generateStaticParams() {
  return [{ locale: "fr" }];
}

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await pageLocale(params, "fr");
  return pageMetadata({
    locale,
    path: "/rejet",
    title: "Erreurs de captures App Store : dimensions et canal alpha",
    description: "Dimensions de capture invalides ou canal alpha : vérifiez les formats iPhone Duo et préparez des fichiers PNG/JPEG opaques pour App Store Connect.",
  });
}

export default async function Page({ params }: LocaleParams) {
  return <RejectionPage locale={await pageLocale(params, "fr")} />;
}
