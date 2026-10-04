import type { ReactNode } from "react";
import { I18nProvider } from "@/components/i18n-provider";
import { getClientMessages, type MessageScope } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";

/**
 * Server component: gives the client components below it the messages of `scope`
 * (in addition to the "site" ones every layout sends). Pages that render the tool,
 * account, review or invitation UI wrap their content in <MessagesScope scope="app">.
 */
export function MessagesScope({ locale, scope, children }: { locale: Locale; scope: MessageScope; children: ReactNode }) {
  return <I18nProvider locale={locale} messages={getClientMessages(locale, scope)}>{children}</I18nProvider>;
}
