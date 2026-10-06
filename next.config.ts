import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

/** Browser navigations ask for HTML; image and RSC fetches do not. */
const HTML_DOCUMENT = { type: "header", key: "accept", value: ".*text/html.*" } as const;

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    "/api/export": ["./src/lib/pipeline/fonts/**/*"],
    "/api/example-zip": ["./src/lib/pipeline/fonts/**/*"],
    "/api/reviews": ["./src/lib/pipeline/fonts/**/*"],
    "/api/reviews/[id]/media": ["./src/lib/pipeline/fonts/**/*"],
    "/[locale]/**/opengraph-image/*": ["./src/lib/og/fonts/**/*"],
  },
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: securityHeaders({ supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, dev: process.env.NODE_ENV === "development" }),
    }];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "duoshot.vercel.app" }],
        destination: "https://duoshot.site/:path*",
        permanent: true,
      },
      { source: "/why-not-ai", destination: "/pourquoi-pas-ia", permanent: true },
      { source: "/rejection", destination: "/rejet", permanent: true },
      { source: "/en/pourquoi-pas-ia", destination: "/en/why-not-ai", permanent: true },
      { source: "/en/rejet", destination: "/en/rejection", permanent: true },
      // French pages are served by app/[locale] with locale "fr" (see rewrites): a page opened
      // at /fr/… goes back to its public unprefixed URL. Only the French OG images, fetched as
      // images rather than documents, are served under /fr.
      { source: "/fr", has: [HTML_DOCUMENT], destination: "/", permanent: true },
      { source: "/fr/:path+", has: [HTML_DOCUMENT], destination: "/:path+", permanent: true },
      // Social cards cached before the single [locale] tree (route groups added a hash), then
      // before each card got an id for its localized alt text.
      { source: "/opengraph-image-:hash", destination: "/fr/opengraph-image/card", permanent: true },
      { source: "/:page(specs|rejet)/opengraph-image-:hash", destination: "/fr/:page/opengraph-image/card", permanent: true },
      { source: "/:locale(fr|en)/opengraph-image", destination: "/:locale/opengraph-image/card", permanent: true },
      { source: "/:locale(fr|en)/:page(specs|rejet|rejection)/opengraph-image", destination: "/:locale/:page/opengraph-image/card", permanent: true },
    ];
  },
  async rewrites() {
    // Plain rewrites run after filesystem routes (API, auth, metadata files, public assets)
    // and before dynamic ones: unprefixed paths reach app/[locale] as French, /en/… as is.
    return [
      { source: "/", destination: "/fr" },
      { source: "/:first((?!(?:en|fr|api|auth|_next)(?![^/]))[^/]+)/:rest*", destination: "/fr/:first/:rest*" },
    ];
  },
};

export default nextConfig;
