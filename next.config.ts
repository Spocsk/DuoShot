import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    "/api/export": ["./src/lib/pipeline/fonts/**/*"],
    "/api/example-zip": ["./src/lib/pipeline/fonts/**/*"],
    "/api/reviews": ["./src/lib/pipeline/fonts/**/*"],
    "/opengraph-image": ["./src/lib/pipeline/fonts/**/*"],
    "/en/opengraph-image": ["./src/lib/pipeline/fonts/**/*"],
  },
};

export default nextConfig;
