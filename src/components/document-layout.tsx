import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import { AnalyticsProvider } from "@/components/analytics-provider";
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
  robots: process.env.VERCEL_ENV === "preview" ? { index: false, follow: false } : undefined,
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
};

export function DocumentLayout({ children, locale }: { children: React.ReactNode; locale: "fr" | "en" }) {
  return (
    <html
      lang={locale}
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AnalyticsProvider />
      </body>
    </html>
  );
}
