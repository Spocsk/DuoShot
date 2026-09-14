import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
