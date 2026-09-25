import type { MetadataRoute } from "next";
import { getSiteUrl, MARKETING_ROUTE_PAIRS } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  return MARKETING_ROUTE_PAIRS.flatMap((route) => [
    {
      url: `${base}${route.fr}`,
      alternates: { languages: { fr: `${base}${route.fr}`, en: `${base}${route.en}`, "x-default": `${base}${route.fr}` } },
      changeFrequency: "weekly",
      priority: route.priority,
    },
    {
      url: `${base}${route.en}`,
      alternates: { languages: { fr: `${base}${route.fr}`, en: `${base}${route.en}`, "x-default": `${base}${route.fr}` } },
      changeFrequency: "weekly",
      priority: Math.max(0.3, route.priority - 0.1),
    },
  ]);
}
