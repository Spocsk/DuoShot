import { DocumentLayout } from "@/components/document-layout";
export { metadata } from "@/components/document-layout";

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <DocumentLayout locale="en">{children}</DocumentLayout>;
}
