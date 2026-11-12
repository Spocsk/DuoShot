import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SizePage } from "@/components/size-page";
import { SpecsPage } from "@/components/specs-page";
import { SCREENSHOT_SIZES } from "./screenshot-pages";
import { comparisonPath } from "./comparisons";
import { ALTERNATIVES_BASE_PATH } from "./alternatives";
import { localizedPath } from "./site";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));
vi.mock("@/lib/billing-availability", () => ({
  checkoutDisplayAvailable: () => true,
  passCheckoutAvailable: () => true,
}));

// Point 5: the size pages and /specs mesh into the existing vs/alternatives pages, incl. the AppScreens comparison.
describe.each(["fr", "en"] as const)("internal linking to vs/alternatives pages in %s", (locale) => {
  const vsAppScreens = localizedPath(locale, comparisonPath("duoshot-vs-appscreens"));
  const alternativesHub = localizedPath(locale, ALTERNATIVES_BASE_PATH);

  it("links /specs to the AppScreens comparison and the alternatives hub", () => {
    const html = renderToStaticMarkup(createElement(SpecsPage, { locale }));
    expect(html).toContain(`href="${vsAppScreens}"`);
    expect(html).toContain(`href="${alternativesHub}"`);
  });

  it.each(SCREENSHOT_SIZES)("links the %s size page to an existing vs/alternatives page incl. AppScreens", (size) => {
    const html = renderToStaticMarkup(createElement(SizePage, { locale, size }));
    expect(html).toContain(`href="${vsAppScreens}"`);
    expect(html).toContain(`href="${alternativesHub}"`);
  });
});
