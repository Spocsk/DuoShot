import { RejectionPage } from "@/components/rejection-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "fr",
  path: "/rejet",
  title: "Décodeur de rejet App Store",
  description: "2.3.3, mauvais pixels, alpha, set incomplet. Traduction DuoShot, sans coller le mail Apple.",
});

export default function Page() {
  return <RejectionPage locale="fr" />;
}
