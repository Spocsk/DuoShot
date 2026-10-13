import type { MetadataRoute } from "next";
import { absoluteUrl, MARKETING_ROUTE_PAIRS } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return MARKETING_ROUTE_PAIRS.flatMap((route) => [
    {
      url: absoluteUrl(route.fr),
      alternates: { languages: { fr: absoluteUrl(route.fr), en: absoluteUrl(route.en), "x-default": absoluteUrl(route.fr) } },
      changeFrequency: "weekly",
      priority: route.priority,
    },
    {
      url: absoluteUrl(route.en),
      alternates: { languages: { fr: absoluteUrl(route.fr), en: absoluteUrl(route.en), "x-default": absoluteUrl(route.fr) } },
      changeFrequency: "weekly",
      priority: route.priority,
    },
  ]);
}
