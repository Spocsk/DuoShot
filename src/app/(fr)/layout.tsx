import { DocumentLayout } from "@/components/document-layout";
export { metadata } from "@/components/document-layout";

export default function FrenchLayout({ children }: { children: React.ReactNode }) {
  return <DocumentLayout locale="fr">{children}</DocumentLayout>;
}
