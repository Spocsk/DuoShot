"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createTranslator } from "@/lib/i18n/core";
import type { Messages, Translator } from "@/lib/i18n/types";
import type { Locale } from "@/lib/specs";

const I18nContext = createContext<Translator | null>(null);

/** Receives one locale's messages from a server layout; client code never imports a dictionary. */
export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  const translator = useMemo(() => createTranslator(locale, messages), [locale, messages]);
  return <I18nContext.Provider value={translator}>{children}</I18nContext.Provider>;
}

export function useI18n(): Translator {
  const translator = useContext(I18nContext);
  if (!translator) throw new Error("useI18n must be used inside <I18nProvider>");
  return translator;
}
