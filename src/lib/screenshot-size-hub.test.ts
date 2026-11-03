import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HubPage, { generateMetadata } from "@/app/[locale]/guides/screenshot-size/page";
import sitemap from "@/app/sitemap";
import { DEVICE_SLUGS, SCREENSHOT_SIZE_HUB, deviceGuidePath, devicesByGroup } from "./devices";
import { SIZES_GUIDE_PATH } from "./guides";
import { shouldSkipLocaleRewrite } from "./locale";
import { absoluteUrl, localizedPath } from "./site";

vi.mock("@/components/site-chrome", () => ({ SiteHeader: () => null, SiteFooter: () => null }));

function visibleBreadcrumb(html: string): string[] {
  const nav = html.match(/aria-label="Breadcrumb"[\s\S]*?<\/nav>/)![0];
  return Array.from(nav.matchAll(/<(?:a[^>]*|span aria-current="page")>([^<]+)<\/(?:a|span)>/g)).map((match) => match[1]);
}

function breadcrumbGraph(html: string): { name: string }[] {
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1])["@graph"];
  return graph.find((node: { "@type": string }) => node["@type"] === "BreadcrumbList").itemListElement;
}

describe("devicesByGroup", () => {
  it("covers every device exactly once, grouped by display group", () => {
    const groups = devicesByGroup("en");
    expect(groups.flatMap((group) => group.devices.map((device) => device.slug))).toEqual(DEVICE_SLUGS);
    expect(groups.length).toBeLessThan(DEVICE_SLUGS.length);
    for (const group of groups) expect(group.sizes.length).toBeGreaterThan(0);
  });
});

describe.each(["fr", "en"] as const)("%s screenshot-size hub", (locale) => {
  const props = () => ({ params: Promise.resolve({ locale }) });

  it("renders one h1, links every device page and the by-platform hub", async () => {
    const html = renderToStaticMarkup(await HubPage(props()));
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(DEVICE_SLUGS).toHaveLength(34);
    for (const slug of DEVICE_SLUGS) {
      expect(html, slug).toContain(`href="${localizedPath(locale, deviceGuidePath(slug))}"`);
    }
    const index = html.match(/data-testid="screenshot-size-index"[\s\S]*$/)![0];
    const deviceLinks = index.match(/\/guides\/screenshot-size\/[a-z0-9-]+"/g) ?? [];
    expect(deviceLinks).toHaveLength(DEVICE_SLUGS.length);
    expect(html).toContain(`href="${localizedPath(locale, SIZES_GUIDE_PATH)}"`);
  });

  it("names every display group with its accepted sizes", async () => {
    const html = renderToStaticMarkup(await HubPage(props()));
    for (const group of devicesByGroup(locale)) {
      expect(html, group.group).toContain(group.group);
    }
  });

  it("emits a breadcrumb whose JSON-LD names match the visible breadcrumb", async () => {
    const html = renderToStaticMarkup(await HubPage(props()));
    const expected = [locale === "fr" ? "Accueil" : "Home", "Guides", SCREENSHOT_SIZE_HUB.label[locale]];
    const visible = visibleBreadcrumb(html);
    expect(visible).toEqual(expected);
    expect(breadcrumbGraph(html).map((item) => item.name)).toEqual(visible);
  });

  it("publishes indexable, reciprocal metadata listed in the sitemap", async () => {
    const metadata = await generateMetadata(props());
    const canonical = absoluteUrl(localizedPath(locale, SCREENSHOT_SIZE_HUB.path));
    expect(metadata.robots).toBeUndefined();
    expect([...metadata.description!].length).toBeLessThanOrEqual(160);
    expect(metadata.alternates).toEqual({ canonical, languages: {
      fr: absoluteUrl(SCREENSHOT_SIZE_HUB.path), en: absoluteUrl(`/en${SCREENSHOT_SIZE_HUB.path}`), "x-default": absoluteUrl(SCREENSHOT_SIZE_HUB.path),
    } });
    expect(sitemap().some((entry) => entry.url === canonical)).toBe(true);
    expect(shouldSkipLocaleRewrite(localizedPath(locale, SCREENSHOT_SIZE_HUB.path))).toBe(true);
  });
});
