type SchemaNode = {
  "@type": string;
  url?: string;
  headline?: string;
  dateModified?: string;
  name?: string;
  inLanguage?: string;
  step?: { "@type": string; position: number; name: string; text: string; url: string }[];
  mainEntity?: { name: string; acceptedAnswer: { text: string } }[];
  offers?: { price: string; priceCurrency: string }[];
};

function graphOf(doc: Document): SchemaNode[] {
  return JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.textContent!)["@graph"];
}

function checkFaq(doc: Document) {
  const faq = graphOf(doc).find((node) => node["@type"] === "FAQPage");
  const rows = Array.from(doc.querySelectorAll(".t-acc"));
  expect(rows.length).to.be.greaterThan(0);
  expect(faq?.mainEntity).to.have.length(rows.length);
  rows.forEach((row, index) => {
    expect(faq!.mainEntity![index].name).to.eq(row.querySelector("button > span")!.textContent);
    expect(faq!.mainEntity![index].acceptedAnswer.text).to.eq(row.querySelector("p")!.textContent);
  });
}

describe("SEO screenshot pages", () => {
  for (const locale of ["fr", "en"] as const) {
    const prefix = locale === "en" ? "/en" : "";
    const visit = (path: string) => locale === "fr" ? cy.visitFr(path) : cy.visitEn(path);

    it(`links to the manual Duo upload guide with matching HowTo and FAQ in ${locale}`, () => {
      const guidePath = `${prefix}/guides/iphone-duo-app-store-connect`;
      for (const source of [`${prefix}/specs`, `${prefix}/guides/best-app-store-screenshot-generator`]) {
        visit(source);
        cy.get(`main a[href="${guidePath}"]`).click();
        cy.location("pathname").should("eq", guidePath);
      }
      cy.get("h1").should("have.length", 1).and("contain", "App Store Connect");
      cy.get('main a[href="https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications"]').should("exist");
      cy.get("main").should("contain", "APP_IPHONE_DUO")
        .and("contain", locale === "en" ? "DuoShot has not yet tested Duo uploads" : "DuoShot n’a pas encore testé le dépôt Duo")
        .and("contain", locale === "en" ? "April 2027 for apps built with the iOS 27.1 SDK or later" : "avril 2027 pour les apps compilées avec le SDK iOS 27.1 ou ultérieur")
        .and("contain", "2034 × 1398").and("contain", "2853 × 2007")
        .and("contain", locale === "en" ? "Pass, Indie and Studio" : "Pass, Indie et Studio");
      for (const size of ["1398 × 2034", "2007 × 2853", "1206 × 2622", "1320 × 2868"]) {
        cy.get("main table").should("contain", size);
      }
      cy.document().then((doc) => {
        const canonical = doc.querySelector('link[rel="canonical"]')!.getAttribute("href")!;
        const origin = new URL(canonical).origin;
        expect(canonical).to.eq(`${origin}${guidePath}`);
        expect(doc.querySelector('meta[property="og:image"]')!.getAttribute("content")).to.contain("/guides/iphone-duo-app-store-connect/opengraph-image/");
        expect(doc.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "").not.to.contain("noindex");
        for (const language of ["fr", "en", "x-default"]) {
          expect(doc.querySelector(`link[rel="alternate"][hreflang="${language}"]`)!.getAttribute("href"))
            .to.eq(`${origin}${language === "en" ? "/en" : ""}/guides/iphone-duo-app-store-connect`);
        }
        const howTo = graphOf(doc).find((node) => node["@type"] === "HowTo")!;
        const steps = Array.from(doc.querySelectorAll('section[aria-labelledby="howto"] ol > li'));
        expect(steps).to.have.length(6);
        expect(howTo.inLanguage).to.eq(locale);
        expect(howTo.name).to.eq(doc.querySelector("h2#howto")!.textContent);
        expect(howTo.step).to.have.length(steps.length);
        steps.forEach((step, index) => {
          expect(howTo.step![index]).to.deep.eq({
            "@type": "HowToStep", position: index + 1,
            name: step.querySelector("h3")!.textContent, text: step.querySelector("p")!.textContent,
            url: `${canonical}#${step.id}`,
          });
        });
        checkFaq(doc);
        cy.request("/sitemap.xml").its("body").should("contain", `<loc>${canonical}</loc>`);
      });
      cy.get(".t-acc button").first().click().should("have.attr", "aria-expanded", "true");
      cy.get(".t-acc p").first().should("be.visible");
    });

    it(`links the home to factual specs and size pages in ${locale}`, () => {
      visit(prefix || "/");
      for (const size of ["1398x2034", "2007x2853", "1206x2622", "1320x2868"]) {
        cy.get(`main a[href="${prefix}/${size}"]`).should("exist");
        cy.get(`footer a[href="${prefix}/${size}"]`).should("exist");
      }
      cy.get(`footer a[href="${prefix}/specs"]`).should("exist");
      cy.get('[data-testid="cta-specs"]').click();
      for (const size of ["1398x2034", "2007x2853", "1206x2622", "1320x2868"]) {
        cy.get(`main a[href="${prefix}/${size}"]`).should("exist");
      }
      cy.get("main").should("contain", locale === "en" ? "Verified on 2026-10-13" : "Vérifié le 2026-10-13")
        .and("contain", locale === "en" ? "single iPhone Duo slot" : "un seul emplacement iPhone Duo")
        .and("contain", locale === "en" ? "10 screenshots per locale" : "10 captures par langue");
      cy.get('main a[href="https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications"]').should("exist");
      cy.document().then((doc) => {
        expect(graphOf(doc).find((node) => node["@type"] === "TechArticle")?.dateModified).to.eq("2026-10-13");
        checkFaq(doc);
      });
      cy.get(`main a[href="${prefix}/1398x2034"]`).click();
      cy.location("pathname").should("eq", `${prefix}/1398x2034`);
      cy.get(`main a[href="${prefix}/2007x2853"]`).click();
      cy.location("pathname").should("eq", `${prefix}/2007x2853`);
      cy.get(`main a[href="${prefix}/1206x2622"]`).click();
      cy.location("pathname").should("eq", `${prefix}/1206x2622`);
      cy.get(`main a[href="${prefix}/1320x2868"]`).click();
      cy.location("pathname").should("eq", `${prefix}/1320x2868`);
      cy.get(`main a[href="${prefix}/specs"]`).should("exist");
    });

    for (const [size, portrait, landscape] of [
      ["1398x2034", "1398 × 2034", "2034 × 1398"],
      ["2007x2853", "2007 × 2853", "2853 × 2007"],
      ["1206x2622", "1206 × 2622", "2622 × 1206"],
      ["1320x2868", "1320 × 2868", "2868 × 1320"],
    ]) {
      it(`serves ${prefix}/${size} with an article, unique metadata and sitemap entry`, () => {
        visit(`${prefix}/${size}`);
        cy.get("h1").should("contain", size);
        cy.get("main").should("contain", portrait).and("contain", landscape);
        if (size === "1320x2868") {
          cy.get("main").should("contain", locale === "en" ? "optional in App Store Connect" : "optionnelles dans App Store Connect")
            .and("contain", locale === "en" ? "with Pass, Indie and Studio" : "avec Pass, Indie et Studio");
        }
        cy.contains("main a", locale === "en" ? "Prepare your screenshots" : "Préparer vos captures")
          .should("have.attr", "href", `${prefix}/tool`);
        cy.get(`main a[href="${prefix}/specs"]`).should("exist");
        for (const related of ["1398x2034", "2007x2853", "1206x2622", "1320x2868"].filter((related) => related !== size)) {
          cy.get(`main a[href="${prefix}/${related}"]`).should("exist");
        }
        cy.document().then((doc) => {
          const canonical = doc.querySelector('link[rel="canonical"]')!.getAttribute("href");
          expect(doc.title).to.contain(size);
          expect(doc.querySelector('meta[name="description"]')!.getAttribute("content")).to.contain(size);
          expect(canonical).to.eq(`${new URL(canonical!).origin}${prefix}/${size}`);
          for (const language of ["fr", "en", "x-default"]) {
            const alternate = doc.querySelector(`link[rel="alternate"][hreflang="${language}"]`)!.getAttribute("href");
            expect(alternate).to.eq(`${new URL(canonical!).origin}${language === "en" ? "/en" : ""}/${size}`);
          }
          expect(doc.querySelector('meta[property="og:image"]')!.getAttribute("content")).to.contain(`/${size}/opengraph-image/`);
          const graph = graphOf(doc);
          expect(graph.map((node) => node["@type"])).to.deep.eq(["Organization", "TechArticle"]);
          const article = graph.find((node) => node["@type"] === "TechArticle")!;
          expect(article.url).to.eq(canonical);
          expect(article.headline).to.eq(doc.querySelector("h1")!.textContent);
          expect(doc.documentElement.scrollWidth).to.be.at.most(doc.defaultView!.innerWidth + 1);
          cy.request("/sitemap.xml").its("body").should("contain", `<loc>${canonical}</loc>`);
        });
      });
    }

    it(`matches FAQ markup to displayed questions on home, pricing and rejection in ${locale}`, () => {
      for (const path of [prefix || "/", `${prefix}/pricing`, locale === "fr" ? "/rejet" : "/en/rejection"]) {
        visit(path);
        cy.document().then(checkFaq);
      }
    });

    it(`advertises the 19 EUR Pass only when configured in ${locale}`, () => {
      for (const path of [prefix || "/", `${prefix}/pricing`]) {
        visit(path);
        cy.document().then((doc) => {
          const offers = graphOf(doc).find((node) => node["@type"] === "SoftwareApplication")!.offers!;
          const passes = offers.filter((offer) => offer.price === "19");
          expect(passes).to.have.length(Cypress.expose("passPriceConfigured") ? 1 : 0);
          if (passes.length) expect(passes[0].priceCurrency).to.eq("EUR");
        });
      }
    });

    it(`uses the exact same home canonical and sitemap URL in ${locale}`, () => {
      visit(prefix || "/");
      cy.get('link[rel="canonical"]').invoke("attr", "href").then((canonical) => {
        cy.request("/sitemap.xml").then(({ body }) => {
          const xml = new DOMParser().parseFromString(body, "text/xml");
          const urls = Array.from(xml.querySelectorAll("url > loc")).map((node) => node.textContent);
          expect(urls).to.include(canonical);
          expect(canonical).to.eq(`${new URL(canonical!).origin}${prefix}`);
        });
      });
    });
  }

  it("keeps the SDK qualifier in llms.txt", () => {
    cy.request("/llms.txt").its("body").should("match", /April 2027[^\n]+for apps built with the iOS 27\.1 SDK or later/);
  });
});
