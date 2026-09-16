import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  async redirects() {
    return [
      { source: "/why-not-ai", destination: "/pourquoi-pas-ia", permanent: true },
      { source: "/rejection", destination: "/rejet", permanent: true },
      { source: "/en/pourquoi-pas-ia", destination: "/en/why-not-ai", permanent: true },
      { source: "/en/rejet", destination: "/en/rejection", permanent: true },
    ];
  },
};

export default nextConfig;
