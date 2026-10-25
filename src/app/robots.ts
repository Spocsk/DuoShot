import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  // The private API and auth paths that every crawler, including AI crawlers, must stay out of.
  const disallow = ["/api/", "/auth/"];
  return {
    // Crawlers must reach private page HTML to read noindex. Authentication protects data.
    // AI crawlers get the same allow/disallow as "*" so they are never less restricted.
    rules: [
      { userAgent: "*", allow: "/", disallow },
      { userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"], allow: "/", disallow },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
