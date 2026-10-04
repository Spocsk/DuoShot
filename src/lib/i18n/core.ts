import type { Locale } from "../specs";
import type { MessageKey, Messages, Translator } from "./types";

/**
 * Builds `t` / `tf` over one locale's dictionary. It imports no dictionary itself,
 * so client code that uses it only ships the messages it was given.
 */
export function createTranslator(locale: Locale, messages: Messages): Translator {
  const rules = new Intl.PluralRules(locale);
  const t = (key: MessageKey) => messages[key];
  const pluralKey = (key: MessageKey, n: unknown): MessageKey => {
    if (typeof n !== "number" || rules.select(n) !== "one") return key;
    const one = `${key}_one`;
    return one in messages ? (one as MessageKey) : key;
  };
  return {
    locale,
    t,
    has: (key: string): key is MessageKey => Object.hasOwn(messages, key),
    tf(key, vars) {
      const values = vars as Record<string, string | number | undefined>;
      return t(pluralKey(key, values.n)).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ""));
    },
  };
}
