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

/** Apple quotes copied verbatim into the guide, kept here so the tests fail if the wording drifts. */
const Q_FACEID = "Required if app runs on iPhone and screenshots for iPhone with Dynamic Island (large display) aren't provided";
const Q_SCALING = "If your app’s user interface is consistent across multiple device sizes and localizations, you only need to provide screenshots for the highest required resolution. App Store Connect automatically scales them down for smaller device sizes.";
const Q_IPAD11 = `If screenshots with the accepted sizes aren't provided, scaled screenshots for 13" displays are used.`;
const Q_ALPHA = "Images can’t include alpha channels or transparencies.";

const NEW_FAQ = {
  en: { question: "Is 1206 × 2622 the same as 1179 × 2556?", renamed: "Why won't App Store Connect accept my screenshot?" },
  fr: { question: "1206 × 2622 et 1179 × 2556, est-ce la même chose ?", renamed: "Pourquoi App Store Connect n’accepte-t-il pas ma capture ?" },
} as const;

const FORBIDDEN = [
  "Every other iPhone and iPad size is optional",
  "Other iPhone sizes are optional",
  "Toutes les autres tailles iPhone et iPad sont optionnelles",
  "Les autres tailles iPhone sont optionnelles",
  "In practice most teams",
  "En pratique, la plupart",
  "6,9″ optionnel",
];

const guideMarkdown = (locale: "fr" | "en") =>
  readFileSync(path.join(process.cwd(), `content/guides/app-store-screenshot-sizes.${locale}.md`), "utf8");
const faqText = (locale: "fr" | "en") =>
  sizesGuideCopy(locale).faq.flatMap((item) => [item.q, item.a]).join("\n");
/** Drop markdown link targets so paths like /rejet don't count as "reject" wording. */
const withoutLinkTargets = (text: string) => text.replace(/\]\([^)]*\)/g, "]");

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

  it("shows the new iPad 11-inch size and the new FAQ questions", async () => {
    const html = renderToStaticMarkup(await GuidePage({ params: Promise.resolve({ locale }) }));
    expect(html).toContain("1512 × 2316");
    const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1])["@graph"];
    const questions = graph.find((node: { "@type": string }) => node["@type"] === "FAQPage").mainEntity.map((entity: { name: string }) => entity.name);
    expect(html).toContain(NEW_FAQ[locale].question);
    for (const question of [NEW_FAQ[locale].question, NEW_FAQ[locale].renamed]) expect(questions).toContain(question);
  });

  it("drops the optional-sizes claims and rejection wording", () => {
    const markdown = guideMarkdown(locale);
    const faq = faqText(locale);
    for (const phrase of FORBIDDEN) {
      expect(markdown, phrase).not.toContain(phrase);
      expect(faq, phrase).not.toContain(phrase);
    }
    expect(withoutLinkTargets(markdown)).not.toMatch(/reject|rejet|refus/i);
    expect(withoutLinkTargets(faq)).not.toMatch(/reject|rejet|refus/i);
  });

  it("keeps the verbatim Apple quotes in the guide and FAQ", () => {
    const markdown = guideMarkdown(locale);
    const faq = faqText(locale);
    expect(markdown).toContain(Q_FACEID);
    expect(markdown).toContain(Q_SCALING);
    expect(faq).toContain(Q_IPAD11);
    expect(faq).toContain(Q_ALPHA);
  });
});

it("ships a CSV whose rows all have the header's column count", () => {
  const rows = readFileSync(path.join(process.cwd(), "public/app-store-screenshot-sizes.csv"), "utf8").trim().split("\n");
  const columns = (row: string) => row.match(/("[^"]*"|[^,]*)(,|$)/g)!.filter((cell) => cell !== "").length;
  expect(rows.length).toBeGreaterThan(30);
  for (const row of rows) expect(columns(row)).toBe(columns(rows[0]));
});
