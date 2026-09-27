import { RejectionPage } from "@/components/rejection-page";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  locale: "en",
  path: "/rejection",
  title: "App Store screenshot errors: dimensions & alpha channel",
  description: "Fix wrong screenshot dimensions, “image dimensions are not valid”, and alpha channel issues. Check iPhone Duo sizes before preparing your files.",
});

export default function Page() {
  return <RejectionPage locale="en" />;
}
