import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const paths = [
    "/",
    "/specs",
    "/signup",
    "/login",
    "/privacy",
    "/terms",
    "/cookies",
    "/legal",
    "/legal/subprocessors",
  ];
  return paths.flatMap((path) => [
    {
      url: `${base}${path}`,
      changeFrequency: "weekly",
      priority: path === "/" || path === "/specs" ? 1 : 0.5,
    },
    {
      url: `${base}/en${path === "/" ? "" : path}`,
      changeFrequency: "weekly",
      priority: path === "/" || path === "/specs" ? 0.9 : 0.4,
    },
  ]);
}
