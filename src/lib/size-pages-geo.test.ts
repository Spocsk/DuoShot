import { describe, expect, it } from "vitest";
import { aspectRatio, SCREENSHOT_SIZES, SCREENSHOT_VERIFIED_ON, sizePageCopy } from "./screenshot-pages";
import { sizeFaq } from "./size-faq";
import { jsonLdGraph } from "./json-ld";
import { MAX_IMAGES, SPECS_VERSION_DATE } from "./specs";
import { getTranslator } from "./i18n";

describe("size page summary box data", () => {
  it("keeps the verification date tied to the specs source of truth", () => {
    expect(SCREENSHOT_VERIFIED_ON).toBe(SPECS_VERSION_DATE);
  });

  it.each([
    ["1398x2034", 1398, 2034, "233:339"],
    ["2007x2853", 2007, 2853, "223:317"],
    ["1206x2622", 1206, 2622, "201:437"],
    ["1320x2868", 1320, 2868, "110:239"],
  ] as const)("reduces %s to an integer ratio with a localized decimal", (_size, width, height, reduced) => {
    expect(aspectRatio(width, height, "en")).toBe(`${reduced} (≈ 1:${(height / width).toFixed(2).replace(/0$/, "")})`);
    // French uses a comma as the decimal separator.
    expect(aspectRatio(width, height, "fr")).toContain(`${reduced} (≈ 1:`);
    expect(aspectRatio(width, height, "fr")).toContain(",");
    expect(aspectRatio(width, height, "en")).not.toContain(",");
  });

  it.each(["fr", "en"] as const)("renders the required/optional status copy in %s", (locale) => {
    const { t } = getTranslator(locale);
    // iPhone 6.3" reuses the existing required-slot source of truth.
    expect(t("specs_required_iphone_sizes")).toContain(locale === "fr" ? "6,3" : "6.3");
    // The optional 6.9" status names the paid plans, never "required".
    expect(t("size_status_optional")).toContain(locale === "fr" ? "optionnelle" : "Optional");
    expect(t("size_status_optional")).not.toMatch(locale === "fr" ? /requis/i : /required/i);
    // The Duo status carries the April 2027 / iOS 27.1 SDK qualifier and the outer/inner/mix choice.
    expect(t("size_status_duo")).toContain(locale === "fr"
      ? "avril 2027 pour les apps compilées avec le SDK iOS 27.1 ou ultérieur"
      : "April 2027 for apps built with the iOS 27.1 SDK or later");
    expect(t("size_status_duo")).toContain(locale === "fr" ? "un mix" : "a mix");
    expect(t("size_summary_count_detail").replace("{max}", String(MAX_IMAGES))).toContain(String(MAX_IMAGES));
  });
});

describe("size page FAQ content", () => {
  it.each(["fr", "en"] as const)("grounds every size FAQ in repo facts in %s", (locale) => {
    for (const size of SCREENSHOT_SIZES) {
      const faq = sizeFaq(locale, size);
      expect(faq.length).toBeGreaterThanOrEqual(2);
      for (const item of faq) {
        expect(item.q).toBeTruthy();
        expect(item.a).toBeTruthy();
        // No fabricated screenshot count beyond Apple's documented maximum.
        expect(item.a).not.toMatch(/\b(11|12|15|20)\s*(captures|screenshots)\b/);
      }
      const answers = faq.map((item) => item.a).join(" ");
      expect(answers).toContain(String(MAX_IMAGES));
    }
  });

  it.each(["fr", "en"] as const)("states the Duo requirement without claiming both sizes are required in %s", (locale) => {
    for (const size of ["1398x2034", "2007x2853"] as const) {
      const answers = sizeFaq(locale, size).map((item) => item.a).join(" ");
      expect(answers).toContain(locale === "fr"
        ? "avril 2027 pour les apps compilées avec le SDK iOS 27.1 ou ultérieur"
        : "April 2027 for apps built with the iOS 27.1 SDK or later");
      // DuoShot lets users choose; it never says both Duo sizes are required.
      expect(answers).toContain(locale === "fr" ? "un mix" : "a mix");
      expect(answers.toLowerCase()).not.toContain(locale === "fr" ? "les deux tailles sont requises" : "both sizes are required");
    }
  });

  it.each(["fr", "en"] as const)("explains the inner panel vs screenshot size only on 2007x2853 in %s", (locale) => {
    const inner = sizeFaq(locale, "2007x2853").map((item) => item.a).join(" ");
    expect(inner).toContain("1878 × 2670");
    expect(inner).toContain("2007 × 2853");
    // The other Duo size does not invent panel figures.
    expect(sizeFaq(locale, "1398x2034").map((item) => item.a).join(" ")).not.toContain("1878 × 2670");
  });

  it.each(["fr", "en"] as const)("emits a FAQPage whose entities match the visible FAQ in %s", (locale) => {
    for (const size of SCREENSHOT_SIZES) {
      const faq = sizeFaq(locale, size);
      const copy = sizePageCopy(locale, size);
      const graph = jsonLdGraph(locale, { path: `/${size}`, faq, article: { ...copy, dateModified: SCREENSHOT_VERIFIED_ON } })["@graph"];
      expect(graph.map((node) => node["@type"])).toEqual(["TechArticle", "FAQPage"]);
      const faqNode = graph.find((node) => node["@type"] === "FAQPage")!;
      expect(faqNode.inLanguage).toBe(locale);
      expect(faqNode.mainEntity).toEqual(faq.map(({ q, a }) => ({
        "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a },
      })));
    }
  });
});
