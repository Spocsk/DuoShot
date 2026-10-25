import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("@/lib/featured-on");
});

async function render(locale: "fr" | "en") {
  const { FeaturedOn } = await import("./featured-on");
  return renderToStaticMarkup(createElement(FeaturedOn, { locale }));
}

describe.each(["fr", "en"] as const)("%s featured-on footer line", (locale) => {
  it("renders nothing when the list is empty", async () => {
    vi.doMock("@/lib/featured-on", () => ({ FEATURED_ON: [] }));
    expect(await render(locale)).toBe("");
  });

  it("renders the label, a nofollow badge and a plain-name link when populated", async () => {
    vi.doMock("@/lib/featured-on", () => ({
      FEATURED_ON: [
        { name: "Product Hunt", url: "https://example.com/ph", badgeUrl: "https://example.com/ph.svg" },
        { name: "Indie Hackers", url: "https://example.com/ih" },
      ],
    }));
    const html = await render(locale);
    expect(html).toContain(locale === "fr" ? "Vu sur" : "Featured on");
    expect(html).toContain('data-testid="footer-featured-on"');
    expect(html).toContain('href="https://example.com/ph"');
    expect(html).toContain('rel="nofollow noopener"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('<img src="https://example.com/ph.svg" alt="Product Hunt"');
    expect(html).toContain('href="https://example.com/ih"');
    expect(html).toContain("Indie Hackers");
  });
});
