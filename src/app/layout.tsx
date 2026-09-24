import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import { AnalyticsProvider } from "@/components/analytics-provider";
import "./transitions-root.css";
import "./transitions-dev.css";
import "./globals.css";
import "./studio.css";
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AnalyticsProvider />
      </body>
    </html>
  );
}
