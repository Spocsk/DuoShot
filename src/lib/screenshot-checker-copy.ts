import { getTranslator } from "./i18n";
import type { Locale } from "./specs";

export function screenshotCheckerCopy(locale: Locale) {
  const { t } = getTranslator(locale);
  return {
    title: t("checker_title"), description: t("checker_description"),
    intro: t("checker_intro"), privacy: t("checker_privacy"),
    sizes: t("checker_sizes"), scope: t("checker_scope"),
    faqHeading: t("checker_faq_heading"), cta: t("checker_cta"),
    faq: [
      { q: t("checker_faq_privacy_q"), a: t("checker_privacy") },
      { q: t("checker_faq_duo_q"), a: t("checker_duo_rule") },
      { q: t("checker_faq_alpha_q"), a: t("checker_faq_alpha_a") },
      { q: t("checker_faq_acceptance_q"), a: t("checker_scope") },
    ],
    labels: {
      drop: t("checker_drop"), input: t("checker_input"), clear: t("checker_clear"),
      checking: t("checker_checking"), results: t("checker_results"),
      empty: t("checker_empty"), duoRule: t("checker_duo_rule"),
      duoCount: t("checker_duo_count"), tooMany: t("checker_too_many"),
      outer: t("specs_outer_display"), inner: t("specs_inner_display"),
      portrait: t("specs_portrait"), landscape: t("specs_landscape"),
      matched: t("checker_matched"), appleOnly: t("checker_apple_only"), wrongSize: t("checker_wrong_size"),
      transparent: t("checker_transparent"), alpha: t("checker_alpha"), opaque: t("checker_opaque"),
      format: t("checker_format"), error: t("checker_error"),
    },
  };
}
