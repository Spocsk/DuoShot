import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { I18nProvider } from "@/components/i18n-provider";
import { getMessages } from "@/lib/i18n";
import { LANDING_MOTION_QUERY } from "@/lib/motion";
import "@/app/transitions-root.css";
import "@/app/transitions-dev.css";
import "@/app/globals.css";
import "@/app/studio.css";
import { SITE_DESCRIPTOR, SITE_NAME, SITE_PITCH_FR, getSiteUrl } from "@/lib/site";

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} — ${SITE_DESCRIPTOR}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_PITCH_FR,
  applicationName: SITE_NAME,
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
};

/** The landing picks its scroll layout before first paint, so loading GSAP never shifts it. */
const MOTION_FLAG = `try{if(matchMedia(${JSON.stringify(LANDING_MOTION_QUERY)}).matches)document.documentElement.classList.add("duo-motion")}catch(e){}`;

export function DocumentLayout({ children, locale }: { children: React.ReactNode; locale: "fr" | "en" }) {
  return (
    <html
      lang={locale}
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: MOTION_FLAG }} />
        <I18nProvider locale={locale} messages={getMessages(locale)}>
          {children}
          <AnalyticsProvider />
        </I18nProvider>
      </body>
    </html>
  );
}
