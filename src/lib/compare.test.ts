import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComparePage } from "@/components/compare-page";
import { generateMetadata as compareEnMetadata } from "@/app/[locale]/compare/page";
import { generateMetadata as compareFrMetadata } from "@/app/[locale]/comparatif/page";
import sitemap from "@/app/sitemap";
import { GET as llms } from "@/app/llms.txt/route";
import {
  COMPARE_COLUMNS,
  COMPARE_COMPETITORS,
  COMPARE_PAGE_COPY,
  COMPARE_PAGE_PUBLISHED,
  COMPARE_ROUTE,
  COMPARE_ROWS,
  compareLlmsEntry,
  comparePublishedRoutes,
  compareRobots,
} from "./compare";
import { absoluteUrl, localizedPath } from "./site";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

afterEach(() => vi.unstubAllEnvs());

describe("comparison page data shape", () => {
  it("compares DuoShot against the four named competitors", () => {
    expect(COMPARE_ROWS[0]).toMatchObject({ id: "duoshot", name: "DuoShot" });
    expect(COMPARE_ROWS.slice(1).map((row) => row.name)).toEqual([...COMPARE_COMPETITORS]);
    expect(COMPARE_COMPETITORS).toEqual(["Shipper", "Screenies", "Rotato", "Framegrove"]);
  });

  it("lists the five compared dimensions as typed cells on every row", () => {
    expect(COMPARE_COLUMNS.map((column) => column.key)).toEqual(["platform", "price", "duoSizes", "zipExport", "ascUpload"]);
    for (const row of COMPARE_ROWS) {
      for (const { key } of COMPARE_COLUMNS) {
        const cell = row[key];
        expect(typeof cell.value.fr).toBe("string");
        expect(typeof cell.value.en).toBe("string");
        expect(cell.value.fr.length).toBeGreaterThan(0);
        expect(cell.value.en.length).toBeGreaterThan(0);
        expect(typeof cell.source).toBe("string");
      }
    }
  });

  it("fills every competitor cell with an https source and no placeholder text", () => {
    for (const row of COMPARE_ROWS.slice(1)) {
      for (const { key } of COMPARE_COLUMNS) {
        const cell = row[key];
        expect(cell.source).toMatch(/^https:\/\/\S+$/);
        for (const locale of ["fr", "en"] as const) {
          expect(cell.value[locale].length).toBeGreaterThan(0);
          expect(cell.value[locale].toLowerCase()).not.toMatch(/todo|à compléter|à vérifier/i);
        }
      }
    }
  });

  it("keeps DuoShot cells to sourced repo facts without unsafe claims", () => {
    const duoshot = COMPARE_ROWS[0];
    for (const { key } of COMPARE_COLUMNS) {
      expect(duoshot[key].source.startsWith("/")).toBe(true);
    }
    const everything = COMPARE_COLUMNS
      .flatMap(({ key }) => [duoshot[key].value.fr, duoshot[key].value.en])
      .join(" ");
    // Never claim both Duo sizes are required, nor that App Store Connect upload is tested.
    expect(everything).not.toMatch(/requis|required/i);
    expect(everything).toMatch(/non testé par DuoShot|not tested by DuoShot/);
    const tested = everything.match(/\btest(?:é|ed)\b/gi) ?? [];
    const qualified = everything.match(/\b(?:non testé|not tested)\b/gi) ?? [];
    expect(tested.length).toBe(qualified.length);
  });

  it("puts « générateur »/'generator' in both titles and descriptions", () => {
    expect(COMPARE_PAGE_COPY.fr.title.toLowerCase()).toContain("générateur");
    expect(COMPARE_PAGE_COPY.fr.description.toLowerCase()).toContain("générateur");
    expect(COMPARE_PAGE_COPY.en.title.toLowerCase()).toContain("generator");
    expect(COMPARE_PAGE_COPY.en.description.toLowerCase()).toContain("generator");
    for (const locale of ["fr", "en"] as const) {
      expect([...COMPARE_PAGE_COPY[locale].description].length).toBeLessThanOrEqual(160);
    }
  });
});

describe("comparison page flag behaviour", () => {
  it("is published", () => {
    expect(COMPARE_PAGE_PUBLISHED).toBe(true);
  });

  it("includes the page in the sitemap while published and omits it when unpublished", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://duoshot.site");
    expect(comparePublishedRoutes(false)).toEqual([]);
    expect(comparePublishedRoutes(true)).toEqual([COMPARE_ROUTE]);
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain(absoluteUrl(COMPARE_ROUTE.fr));
    expect(urls).toContain(absoluteUrl(COMPARE_ROUTE.en));
  });

  it("includes the page in /llms.txt while published and omits it when unpublished", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://duoshot.site");
    expect(compareLlmsEntry("https://duoshot.site", false)).toBe("");
    expect(compareLlmsEntry("https://duoshot.site", true)).toContain("https://duoshot.site/comparatif");
    expect(compareLlmsEntry("https://duoshot.site", true)).toContain("https://duoshot.site/en/compare");
    const body = await llms().text();
    expect(body).toContain("https://duoshot.site/comparatif");
    expect(body).toContain("https://duoshot.site/en/compare");
  });

  it("marks the page noindex while unpublished and indexable once published", () => {
    expect(compareRobots(false)).toEqual({ index: false, follow: false });
    expect(compareRobots(true)).toBeUndefined();
  });
});

describe.each(["fr", "en"] as const)("comparison page metadata and render in %s", (locale) => {
  const generateMetadata = locale === "fr" ? compareFrMetadata : compareEnMetadata;

  it("sets the reciprocal canonical, hreflang and current noindex", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://duoshot.site");
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
    expect(metadata.title).toBe(COMPARE_PAGE_COPY[locale].title);
    expect(metadata.description).toBe(COMPARE_PAGE_COPY[locale].description);
    expect(metadata.robots).toEqual(COMPARE_PAGE_PUBLISHED ? undefined : { index: false, follow: false });
    expect(metadata.alternates).toEqual({
      canonical: absoluteUrl(COMPARE_ROUTE[locale]),
      languages: {
        fr: absoluteUrl(COMPARE_ROUTE.fr),
        en: absoluteUrl(COMPARE_ROUTE.en),
        "x-default": absoluteUrl(COMPARE_ROUTE.fr),
      },
    });
  });

  it("renders a single heading and a sourced comparison table", () => {
    const html = renderToStaticMarkup(ComparePage({ locale }));
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain(`${COMPARE_PAGE_COPY[locale].heading}</h1>`);
    expect(html).toContain("<table");
    expect(html).toContain("DuoShot");
    for (const name of COMPARE_COMPETITORS) expect(html).toContain(name);
    for (const { key } of COMPARE_COLUMNS) expect(html).toContain(COMPARE_ROWS[0][key].value[locale]);
    // DuoShot facts link to their localized source pages.
    expect(html).toContain(`href="${localizedPath(locale, "/specs")}"`);
    expect(html).toContain(`href="${localizedPath(locale, "/pricing")}"`);
    // Every competitor cell renders its external source link.
    for (const row of COMPARE_ROWS.slice(1)) {
      for (const { key } of COMPARE_COLUMNS) {
        expect(html).toContain(`href="${row[key].source}"`);
      }
    }
    // The neutral closing sentence and the prices-checked note are visible.
    expect(html).toContain(COMPARE_PAGE_COPY[locale].closing);
    expect(html).toContain(COMPARE_PAGE_COPY[locale].pricesNote);
  });
});
