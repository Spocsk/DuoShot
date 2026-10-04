import { DocumentLayout } from "@/components/document-layout";
import { LOCALES, pageLocale, type LocaleParams } from "./params";
export { metadata } from "@/components/document-layout";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/** /de/… and other unknown first segments are 404s, not new locales. */
export const dynamicParams = false;

export default async function LocaleLayout({ children, params }: LocaleParams & { children: React.ReactNode }) {
  return <DocumentLayout locale={await pageLocale(params)}>{children}</DocumentLayout>;
}
