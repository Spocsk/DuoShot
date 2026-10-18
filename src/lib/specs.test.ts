import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SpecsPage } from "@/components/specs-page";
import { SizePage } from "@/components/size-page";
import { connectPreviewStyle, duoChassisAspect, duoSpec, formatInches, IPHONE_63_ALTERNATIVE, iphone63Spec, SIZE_SPECS, specRowDetail, targetsFor } from "./specs";
import { SCREENSHOT_SIZES, sizePageCopy } from "./screenshot-pages";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

describe.each(["fr", "en"] as const)("%s screenshot guides", (locale) => {
  it("renders the required iPhone preset and its alternative alongside optional paid sizes", () => {
    const html = renderToStaticMarkup(createElement(SpecsPage, { locale }));
    const section = html.match(/<section[^>]*aria-labelledby="iphone-63-sizes"[^>]*>([\s\S]*?)<\/section>/)![1];
    expect(section).toContain("1206 × 2622");
    expect(section).toContain("2622 × 1206");
    expect(section).toContain("1179 × 2556");
    expect(section).toContain("2556 × 1179");
    expect(section).toContain(locale === "fr" ? "essai gratuit" : "free trial");
    expect(section).toContain(locale === "fr" ? "optionnelle" : "optional");
    for (const size of SCREENSHOT_SIZES) {
      expect(html).toContain(`href="${locale === "en" ? "/en" : ""}/${size}"`);
    }
    expect(html).toContain(locale === "fr" ? "dépôt pas encore testé par DuoShot" : "uploads have not yet been tested by DuoShot");
  });

  it("uses the correct Duo copy and links every guide to specs and the other sizes", () => {
    for (const size of SCREENSHOT_SIZES) {
      const html = renderToStaticMarkup(createElement(SizePage, { locale, size }));
      if (size === "1206x2622") {
        expect(html).toContain("1179 × 2556");
        expect(html).toContain(locale === "fr" ? "essai gratuit" : "free trial");
        expect(html).not.toContain(locale === "fr" ? "Déposer dans l’emplacement iPhone Duo" : "Upload to the iPhone Duo slot");
      } else if (size === "1320x2868") {
        expect(html).toContain("1320 × 2868");
        expect(html).toContain("2868 × 1320");
        expect(html).toContain("1290 × 2796");
        expect(html).toContain(locale === "fr" ? "optionnelles" : "optional");
        expect(html).toContain(locale === "fr" ? "avec Pass, Indie et Studio" : "with Pass, Indie and Studio");
        const slotSection = html.match(/<section[^>]*>\s*<h2[^>]*>[^<]*6[,.]9[^<]*<\/h2>([\s\S]*?)<\/section>/)![1];
        expect(slotSection).not.toContain(locale === "fr" ? "emplacement iPhone Duo" : "iPhone Duo slot");
      } else {
        expect(html).toContain(locale === "fr" ? "Les captures iPhone Duo dans App Store Connect" : "iPhone Duo screenshots in App Store Connect");
        expect(html).toContain(locale === "fr" ? "App Store Connect accepte jusqu’à 10 captures par taille d’appareil." : "App Store Connect accepts up to 10 screenshots per device size.");
      }
      expect(html).not.toMatch(/emplacement Duo|emplacement iPhone Duo|Duo slot/i);
      const prefix = locale === "en" ? "/en" : "";
      expect(html).toContain(`href="${prefix}/specs"`);
      for (const related of SCREENSHOT_SIZES.filter((related) => related !== size)) {
        expect(html).toContain(`href="${prefix}/${related}"`);
      }
    }
  });
});

describe("6.3-inch export preset", () => {
  it.each(["free", "indie", "studio"] as const)("is available on %s with portrait and landscape pixels", (plan) => {
    for (const orientation of ["portrait", "landscape"] as const) {
      const targets = targetsFor({ orientation, include63: true, include69: false, plan });
      expect(targets.map((spec) => [spec.slot, spec.width, spec.height])).toEqual(orientation === "portrait"
        ? [["duo-outer", 1398, 2034], ["duo-inner", 2007, 2853], ["iphone-63", 1206, 2622]]
        : [["duo-outer", 2034, 1398], ["duo-inner", 2853, 2007], ["iphone-63", 2622, 1206]]);
      expect(targets.find((spec) => spec.slot === "iphone-63")?.gated).toBeUndefined();
    }
  });

  it("is opt-in and preserves the 6.9-inch gate", () => {
    expect(targetsFor({ orientation: "portrait", include69: false, plan: "free" })).toHaveLength(2);
    expect(() => targetsFor({ orientation: "portrait", include63: true, include69: true, plan: "free" })).toThrow("IPHONE_69_GATED");
    const paid = targetsFor({ orientation: "portrait", include63: true, include69: true, plan: "indie" });
    expect(paid.filter((spec) => spec.slot === "iphone-63")).toHaveLength(1);
    expect(paid.filter((spec) => spec.slot === "iphone-69")).toHaveLength(3);
  });

  it("documents the accepted alternative without adding another export target", () => {
    expect(IPHONE_63_ALTERNATIVE).toEqual({
      portrait: { width: 1179, height: 2556 }, landscape: { width: 2556, height: 1179 },
    });
    expect(SIZE_SPECS.filter((spec) => spec.slot === "iphone-63")).toHaveLength(2);
    for (const locale of ["fr", "en"] as const) {
      const copy = sizePageCopy(locale, "1206x2622");
      expect(copy.portrait).toEqual(iphone63Spec("portrait"));
      expect(copy.landscape).toEqual(iphone63Spec("landscape"));
      expect(copy.portrait).toMatchObject({ width: 1206, height: 2622, gated: undefined });
      expect(copy.landscape).toMatchObject({ width: 2622, height: 1206, gated: undefined });
      expect(copy.intro).toContain("1179 × 2556");
      expect(copy.intro).toContain("2556 × 1179");
      expect(copy.related).toEqual(SCREENSHOT_SIZES.filter((size) => size !== "1206x2622"));
      expect(sizePageCopy(locale, "1398x2034").related).toContain("1206x2622");
    }
  });
});

describe("duoChassisAspect", () => {
  it("turns the open device a quarter turn for portrait screenshots", () => {
    expect(duoChassisAspect("inner", "portrait")).toBe("117.8/164.6");
    expect(duoChassisAspect("inner", "landscape")).toBe("164.6/117.8");
  });

  it("rotates only the closed outer with landscape screenshots", () => {
    expect(duoChassisAspect("outer", "portrait")).toBe("84.1/117.8");
    expect(duoChassisAspect("outer", "landscape")).toBe("117.8/84.1");
  });
});

describe("connectPreviewStyle", () => {
  it("exposes Connect pixel boxes for portrait crop frames", () => {
    expect(connectPreviewStyle(duoSpec("duo-outer", "portrait"), duoSpec("duo-inner", "portrait"))).toEqual({
      "--preview-outer-w": "1398",
      "--preview-outer-h": "2034",
      "--preview-inner-w": "2007",
      "--preview-inner-h": "2853",
    });
  });

  it("exposes Connect pixel boxes for landscape crop frames", () => {
    expect(connectPreviewStyle(duoSpec("duo-outer", "landscape"), duoSpec("duo-inner", "landscape"))).toEqual({
      "--preview-outer-w": "2034",
      "--preview-outer-h": "1398",
      "--preview-inner-w": "2853",
      "--preview-inner-h": "2007",
    });
  });
});

describe("formatInches", () => {
  it("uses the locale's decimal mark and inch sign", () => {
    expect(formatInches('5.4"', "fr")).toBe("5,4\u2033");
    expect(formatInches('5.4"', "en")).toBe('5.4"');
    expect(formatInches(7.6, "fr")).toBe("7,6\u2033");
  });
});

describe("specRowDetail", () => {
  it("tells the three iPhone 6.9″ rows apart in both orientations", () => {
    const rows = SIZE_SPECS.filter((spec) => spec.slot === "iphone-69" && spec.orientation === "portrait");
    const details = rows.map((spec) => specRowDetail(spec, "fr"));
    expect(new Set(details).size).toBe(rows.length);
    expect(details[0]).toBe("6,9\u2033 · format 1320 px");
    const landscape = SIZE_SPECS.find((spec) => spec.id === "69b-l")!;
    expect(specRowDetail(landscape, "en")).toBe('6.9" · 1290 px format');
  });

  it("keeps Duo rows to the display size", () => {
    expect(specRowDetail(duoSpec("duo-outer", "portrait"), "fr")).toBe("5,4\u2033");
  });
});
