import { ReviewPage } from "@/components/review-page";
import { MessagesScope } from "@/components/messages-scope";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { isDemoReview } from "@/lib/pipeline/harbor";

export const metadata = { robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <MessagesScope locale="en" scope="app">
      <ReviewPage
        id={id}
        locale="en"
        demo={isDemoReview(id)}
        header={<SiteHeader locale="en" path={`/en/r/${id}`} />}
        footer={<SiteFooter locale="en" />}
      />
    </MessagesScope>
  );
}
