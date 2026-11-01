import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import GuidePage, { generateMetadata } from "@/app/[locale]/guides/app-store-screenshot-sizes/page";
import sitemap from "@/app/sitemap";
import { sizesGuide, SIZES_GUIDE_PATH } from "./guides";
import { sizesGuideCopy } from "./sizes-guide-copy";
import { absoluteUrl, localizedPath } from "./site";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

describe.each(["fr", "en"] as const)("%s screenshot sizes guide", (locale) => {
  it("is indexable and listed in the sitemap", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
    const canonical = absoluteUrl(localizedPath(locale, SIZES_GUIDE_PATH));
    expect(metadata.title).toBe(sizesGuide(locale).title);
    expect(metadata.robots).toBeUndefined();
    expect(sitemap().some((entry) => entry.url === canonical)).toBe(true);
  });

  it("renders Apple sizes, the April 2027 Duo rule and FAQ structured data", async () => {
    const html = renderToStaticMarkup(await GuidePage({ params: Promise.resolve({ locale }) }));
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    for (const size of ["1398 × 2034", "2007 × 2853", "1206 × 2622", "1320 × 2868", "2064 × 2752"]) expect(html).toContain(size);
    expect(html).toContain("27.1");
    expect(html).toContain('href="/app-store-screenshot-sizes.csv"');
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1])["@graph"];
    const faq = graph.find((node: { "@type": string }) => node["@type"] === "FAQPage");
    expect(faq.mainEntity).toHaveLength(sizesGuideCopy(locale).faq.length);
  });
});

it("ships a CSV whose rows all have the header's column count", () => {
  const rows = readFileSync(path.join(process.cwd(), "public/app-store-screenshot-sizes.csv"), "utf8").trim().split("\n");
  const columns = (row: string) => row.match(/("[^"]*"|[^,]*)(,|$)/g)!.filter((cell) => cell !== "").length;
  expect(rows.length).toBeGreaterThan(30);
  for (const row of rows) expect(columns(row)).toBe(columns(rows[0]));
});
