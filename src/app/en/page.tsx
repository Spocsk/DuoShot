import { HomePage } from "@/components/home-page";
import { pageMetadata } from "@/lib/seo";
import { SITE_PITCH_EN } from "@/lib/site";

export const metadata = pageMetadata({
  locale: "en",
  path: "/",
  title: "App Store Connect ZIP for iPhone Duo",
  description: SITE_PITCH_EN,
});

export default function Page() {
  return <HomePage locale="en" />;
}
