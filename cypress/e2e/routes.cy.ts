/*
 * Every public URL served before the single app/[locale] tree, with its language,
 * canonical and hreflang pairs. French stays unprefixed; /fr/… is internal.
 */

const CRAWLER = { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)", accept: "text/html" };

type Page = { fr: string; en: string; indexed: boolean };

const PAGES: Page[] = [
  { fr: "/", en: "/en", indexed: true },
  { fr: "/pricing", en: "/en/pricing", indexed: true },
  { fr: "/specs", en: "/en/specs", indexed: true },
  { fr: "/pourquoi-pas-ia", en: "/en/why-not-ai", indexed: true },
  { fr: "/rejet", en: "/en/rejection", indexed: true },
  { fr: "/privacy", en: "/en/privacy", indexed: true },
  { fr: "/terms", en: "/en/terms", indexed: true },
  { fr: "/cookies", en: "/en/cookies", indexed: true },
  { fr: "/legal", en: "/en/legal", indexed: true },
  { fr: "/legal/subprocessors", en: "/en/legal/subprocessors", indexed: true },
  { fr: "/tool", en: "/en/tool", indexed: false },
  { fr: "/account", en: "/en/account", indexed: false },
  { fr: "/login", en: "/en/login", indexed: false },
  { fr: "/signup", en: "/en/signup", indexed: false },
  { fr: "/forgot-password", en: "/en/forgot-password", indexed: false },
  { fr: "/reset-password", en: "/en/reset-password", indexed: false },
];

/** Private pages without canonical (review links, invitations). */
const PRIVATE = [
  { url: "/r/demo", lang: "fr" },
  { url: "/en/r/demo", lang: "en" },
  { url: "/invite/token", lang: "fr" },
  { url: "/en/invite/token", lang: "en" },
];

function documentOf(url: string) {
  return cy.request({ url, headers: CRAWLER, followRedirect: false }).then((response) => {
    expect(response.status, url).to.eq(200);
    return new DOMParser().parseFromString(response.body as string, "text/html");
  });
}

const pathOf = (href: string | null | undefined) => (href ? new URL(href).pathname : null);

describe("public routes", () => {
  PAGES.forEach((page) => {
    (["fr", "en"] as const).forEach((locale) => {
      const url = page[locale];
      it(`serves ${url} in ${locale} with its canonical and hreflang`, () => {
        documentOf(url).then((doc) => {
          expect(doc.documentElement.lang).to.eq(locale);
          expect(pathOf(doc.querySelector('link[rel="canonical"]')?.getAttribute("href"))).to.eq(url);
          expect(pathOf(doc.querySelector('link[rel="alternate"][hreflang="fr"]')?.getAttribute("href"))).to.eq(page.fr);
          expect(pathOf(doc.querySelector('link[rel="alternate"][hreflang="en"]')?.getAttribute("href"))).to.eq(page.en);
          expect(pathOf(doc.querySelector('link[rel="alternate"][hreflang="x-default"]')?.getAttribute("href"))).to.eq(page.fr);
          const robots = doc.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "";
          expect(robots.includes("noindex"), "noindex").to.eq(!page.indexed);
        });
      });
    });
  });

  PRIVATE.forEach(({ url, lang }) => {
    it(`serves the private page ${url}`, () => {
      documentOf(url).then((doc) => {
        expect(doc.documentElement.lang).to.eq(lang);
        expect(doc.querySelector('meta[name="robots"]')?.getAttribute("content")).to.contain("noindex");
      });
    });
  });

  it("keeps an Open Graph image on the pages that had one", () => {
    ["/", "/en", "/specs", "/en/specs", "/rejet", "/en/rejection", "/r/demo", "/en/r/demo"].forEach((url) => {
      documentOf(url).then((doc) => {
        const image = doc.querySelector('meta[property="og:image"]')?.getAttribute("content");
        expect(image, url).to.be.a("string");
        cy.request({ url: new URL(image!).pathname, headers: { accept: "image/*" } }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.headers["content-type"]).to.contain("image/png");
        });
      });
    });
  });

  it("serves the metadata files", () => {
    ["/robots.txt", "/sitemap.xml", "/llms.txt"].forEach((url) => {
      cy.request(url).its("status").should("eq", 200);
    });
  });

  it("redirects localized slugs and the internal /fr prefix", () => {
    const redirects: [string, string][] = [
      ["/why-not-ai", "/pourquoi-pas-ia"],
      ["/rejection", "/rejet"],
      ["/en/pourquoi-pas-ia", "/en/why-not-ai"],
      ["/en/rejet", "/en/rejection"],
      ["/fr", "/"],
      ["/fr/tool", "/tool"],
      ["/fr/legal/subprocessors", "/legal/subprocessors"],
    ];
    redirects.forEach(([from, to]) => {
      cy.request({ url: from, headers: CRAWLER, followRedirect: false }).then((response) => {
        expect(response.status, from).to.eq(308);
        expect(new URL(response.redirectedToUrl!).pathname, from).to.eq(to);
      });
    });
  });

  it("does not serve unknown locales or pages", () => {
    ["/de", "/de/tool", "/en/fr", "/nope", "/en/nope"].forEach((url) => {
      cy.request({ url, headers: CRAWLER, failOnStatusCode: false, followRedirect: false }).its("status").should("eq", 404);
    });
  });

  it("navigates client-side between unprefixed French pages", () => {
    cy.visitFr("/");
    cy.window().then((win) => {
      (win as Window & { routesMarker?: boolean }).routesMarker = true;
    });
    cy.get("header [data-testid='nav-tool']").click();
    cy.location("pathname").should("eq", "/tool");
    cy.get('[data-testid="drop-outer"]').should("be.visible");
    cy.get("html").should("have.attr", "lang", "fr");
    // Still the same document: the rewrite did not force a full reload.
    cy.window().its("routesMarker").should("eq", true);
  });
});
