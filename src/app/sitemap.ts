import type { MetadataRoute } from "next";
import { absoluteUrl, MARKETING_ROUTE_PAIRS } from "@/lib/site";
import { COMPARE_SITEMAP_PRIORITY, comparePublishedRoutes } from "@/lib/compare";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    ...MARKETING_ROUTE_PAIRS,
    ...comparePublishedRoutes().map((route) => ({ ...route, priority: COMPARE_SITEMAP_PRIORITY })),
  ];
  return routes.flatMap((route) => [
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
