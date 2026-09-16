import type { MetadataRoute } from "next";
import { getSiteUrl, MARKETING_ROUTE_PAIRS } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  return MARKETING_ROUTE_PAIRS.flatMap((route) => [
    {
      url: `${base}${route.fr}`,
      changeFrequency: "weekly",
      priority: route.priority,
    },
    {
      url: `${base}${route.en}`,
      changeFrequency: "weekly",
      priority: Math.max(0.3, route.priority - 0.1),
    },
  ]);
}
