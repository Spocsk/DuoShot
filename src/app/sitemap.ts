import type { MetadataRoute } from "next";
import { absoluteUrl, MARKETING_ROUTE_PAIRS } from "@/lib/site";
import { LEGAL_PATH } from "@/lib/seo";
import { COMPARE_SITEMAP_PRIORITY, comparePublishedRoutes } from "@/lib/compare";
import { DEVICES, DEVICE_VERIFIED_ON, deviceGuidePath } from "@/lib/devices";
import { SPECS_VERSION_DATE } from "@/lib/specs";

const DEVICE_SITEMAP_PRIORITY = 0.6;

// Derived from this branch's sources of truth, not hardcoded: the freshest content verification date.
// Bumps automatically when the Apple specs or the device data are re-verified.
const SITE_LASTMOD = [SPECS_VERSION_DATE, DEVICE_VERIFIED_ON].sort().at(-1)!;

export default function sitemap(): MetadataRoute.Sitemap {
  const deviceRoutes = DEVICES.map((device) => {
    const fr = deviceGuidePath(device.slug);
    return { fr, en: `/en${fr}`, priority: DEVICE_SITEMAP_PRIORITY, lastmod: DEVICE_VERIFIED_ON };
  });
  const routes = [
    ...MARKETING_ROUTE_PAIRS.filter((route) => !LEGAL_PATH.test(route.fr)).map((route) => ({ ...route, lastmod: SITE_LASTMOD })),
    ...deviceRoutes,
    ...comparePublishedRoutes().map((route) => ({ ...route, priority: COMPARE_SITEMAP_PRIORITY, lastmod: SITE_LASTMOD })),
  ];
  return routes.flatMap((route) => [
    {
      url: absoluteUrl(route.fr),
      lastModified: route.lastmod,
      alternates: { languages: { fr: absoluteUrl(route.fr), en: absoluteUrl(route.en), "x-default": absoluteUrl(route.fr) } },
      changeFrequency: "weekly",
      priority: route.priority,
    },
    {
      url: absoluteUrl(route.en),
      lastModified: route.lastmod,
      alternates: { languages: { fr: absoluteUrl(route.fr), en: absoluteUrl(route.en), "x-default": absoluteUrl(route.fr) } },
      changeFrequency: "weekly",
      priority: route.priority,
    },
  ]);
}
