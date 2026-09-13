import type { Metadata } from "next";
import { headers } from "next/headers";
import { Figtree, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { LOCALE_HEADER } from "@/lib/locale";
import { SITE_NAME, SITE_PITCH_FR, getSiteUrl } from "@/lib/site";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const sans = Figtree({
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
    default: `${SITE_NAME} — ${SITE_PITCH_FR}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_PITCH_FR,
  applicationName: SITE_NAME,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = (await headers()).get(LOCALE_HEADER) === "en" ? "en" : "fr";
  return (
    <html
      lang={lang}
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
