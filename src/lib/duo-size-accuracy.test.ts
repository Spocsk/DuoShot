import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SizePage } from "@/components/size-page";
import { DUO_SIZES_VERIFIED_ON } from "./screenshot-pages";
import { sizeEnrichment } from "./size-enrichment";
import { sizeFaq } from "./size-faq";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

/** The verbatim Apple badge sentence both Duo pages must quote. */
const APPLE_BADGE =
  "When you submit iPhone Duo screenshots in App Store Connect, your App Store product page will display a badge to let people know your app is made for iPhone Duo.";

const DUO_SIZES = ["1398x2034", "2007x2853"] as const;
const LOCALES = ["fr", "en"] as const;

describe("iPhone Duo size pages: Apple accuracy", () => {
  it.each(DUO_SIZES)("quotes Apple's badge verbatim and drops the old badge wording on %s", (size) => {
    for (const locale of LOCALES) {
      const html = renderToStaticMarkup(createElement(SizePage, { locale, size }));
      expect(html).toContain(APPLE_BADGE);
      expect(html).not.toContain("optimized for iPhone Duo");
      expect(html).not.toContain("optimisé pour iPhone Duo");
    }
  });

  it.each(DUO_SIZES)("never says Apple rejects Duo screenshots in the enrichment or FAQ on %s", (size) => {
    for (const locale of LOCALES) {
      const enrich = sizeEnrichment(locale, size);
      const faq = sizeFaq(locale, size);
      const text = [
        enrich.devices.body,
        enrich.orientation.body,
        enrich.rejections.heading,
        enrich.rejections.intro,
        ...enrich.rejections.items,
        ...faq.flatMap((item) => [item.q, item.a]),
      ].join(" ").toLowerCase();
      expect(text).not.toMatch(/reject|rejet|refus/);
    }
  });

  it.each(DUO_SIZES)("adds the no-scaling FAQ on %s", (size) => {
    for (const locale of LOCALES) {
      const questions = sizeFaq(locale, size).map((item) => item.q);
      expect(questions).toContain(locale === "fr"
        ? "App Store Connect met-il à l’échelle une autre taille iPhone vers l’iPhone Duo ?"
        : "Will App Store Connect scale another iPhone size to iPhone Duo?");
    }
  });

  it.each(DUO_SIZES)("uses the upload-mistakes heading on %s", (size) => {
    expect(sizeEnrichment("en", size).rejections.heading).toBe("Common upload mistakes");
    expect(sizeEnrichment("fr", size).rejections.heading).toBe("Erreurs de dépôt fréquentes");
  });

  it.each(DUO_SIZES)("shows the Duo verification date on %s", (size) => {
    for (const locale of LOCALES) {
      const html = renderToStaticMarkup(createElement(SizePage, { locale, size }));
      expect(html).toContain(DUO_SIZES_VERIFIED_ON);
    }
  });
});
