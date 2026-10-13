import type { Translator } from "./i18n/types";
import { appleUploadStatus } from "./apple-screenshot-status";
import type { FaqItem } from "./screenshot-copy";

/** Shared by the visible pricing section and the pricing page's structured data. */
export function pricingFaq({ locale, t }: Pick<Translator, "locale" | "t">): FaqItem[] {
  return [
    { q: t("pricing_faq_refund_q"), a: t("pricing_faq_refund_a") },
    { q: t("pricing_faq_apple_q"), a: appleUploadStatus(locale) },
  ];
}
