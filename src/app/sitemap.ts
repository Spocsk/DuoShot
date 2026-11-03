import type { MetadataRoute } from "next";
import { absoluteUrl, MARKETING_ROUTE_PAIRS } from "@/lib/site";
import { LEGAL_PATH } from "@/lib/seo";
import { COMPARE_SITEMAP_PRIORITY, comparePublishedRoutes } from "@/lib/compare";
import { DEVICES, deviceGuidePath } from "@/lib/devices";

const DEVICE_SITEMAP_PRIORITY = 0.6;

export default function sitemap(): MetadataRoute.Sitemap {
  const deviceRoutes = DEVICES.map((device) => {
    const fr = deviceGuidePath(device.slug);
    return { fr, en: `/en${fr}`, priority: DEVICE_SITEMAP_PRIORITY };
  });
  const routes = [
    ...MARKETING_ROUTE_PAIRS.filter((route) => !LEGAL_PATH.test(route.fr)),
    ...deviceRoutes,
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
