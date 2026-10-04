import type { Locale } from "../specs";
import { createTranslator } from "./core";
import { en } from "./en";
import { fr } from "./fr";
import type { Messages, Translator } from "./types";

/*
 * Server-side entry: it loads both dictionaries. Client components must not import it
 * (src/lib/i18n/client-boundary.test.ts enforces that); they read the current locale's
 * messages through I18nProvider / useI18n from "@/components/i18n-provider".
 */

const MESSAGES: Record<Locale, Messages> = { fr, en };
const translators = new Map<Locale, Translator>();

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}

export function getTranslator(locale: Locale): Translator {
  let translator = translators.get(locale);
  if (!translator) {
    translator = createTranslator(locale, MESSAGES[locale]);
    translators.set(locale, translator);
  }
  return translator;
}

export { createTranslator } from "./core";
export type { MessageKey, MessageVars, Messages, PluralKey, Translator } from "./types";
export { FAQ } from "./faq";
