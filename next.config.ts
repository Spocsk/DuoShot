import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    "/api/export": ["./src/lib/pipeline/fonts/**/*"],
    "/api/example-zip": ["./src/lib/pipeline/fonts/**/*"],
    "/api/reviews": ["./src/lib/pipeline/fonts/**/*"],
    "/api/reviews/[id]/media": ["./src/lib/pipeline/fonts/**/*"],
    "/opengraph-image": ["./src/lib/pipeline/fonts/**/*"],
    "/en/opengraph-image": ["./src/lib/pipeline/fonts/**/*"],
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
    ];
  },
};

export default nextConfig;
