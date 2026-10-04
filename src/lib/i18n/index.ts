import type { Locale } from "../specs";
import { CLIENT_KEYS } from "./client-keys";
import { createTranslator } from "./core";
import { en } from "./en";
import { fr } from "./fr";
import type { MessageKey, Messages, Translator } from "./types";

/*
 * Server-side entry: it loads both dictionaries. Client components must not import it
 * (src/lib/i18n/client-boundary.test.ts enforces that); they read the current locale's
 * messages through I18nProvider / useI18n from "@/components/i18n-provider".
 */

const MESSAGES: Record<Locale, Messages> = { fr, en };
const translators = new Map<Locale, Translator>();
const clientMessages = new Map<string, Messages>();

export type MessageScope = keyof typeof CLIENT_KEYS;

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}

/**
 * The subset of one locale's messages that client components can render: "site" for every
 * page, "app" adds the tool, account and review keys. Server components use getTranslator.
 */
export function getClientMessages(locale: Locale, scope: MessageScope): Messages {
  const cacheKey = `${locale}:${scope}`;
  let messages = clientMessages.get(cacheKey);
  if (!messages) {
    const keys: readonly MessageKey[] = scope === "app" ? [...CLIENT_KEYS.site, ...CLIENT_KEYS.app] : CLIENT_KEYS.site;
    // Only the listed keys are present; client-boundary.test.ts keeps the list complete.
    messages = Object.fromEntries(keys.map((key) => [key, MESSAGES[locale][key]])) as Messages;
    clientMessages.set(cacheKey, messages);
  }
  return messages;
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
