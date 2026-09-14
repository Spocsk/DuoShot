import { ReviewPage } from "@/components/review-page";

export const robots = { index: false, follow: false };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReviewPage id={id} locale="fr" />;
}
