import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    "/api/export": ["./src/lib/pipeline/fonts/**/*"],
  },
};

export default nextConfig;
