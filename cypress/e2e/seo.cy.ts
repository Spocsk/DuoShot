type SchemaNode = {
  "@type": string;
  "@id"?: string;
  name?: string;
  logo?: string;
  description?: string;
  url?: string;
  sameAs?: string[];
  publisher?: { "@id": string };
  headline?: string;
  dateModified?: string;
  name?: string;
  inLanguage?: string;
  step?: { "@type": string; position: number; name: string; text: string; url: string }[];
  mainEntity?: { name: string; acceptedAnswer: { text: string } }[];
  offers?: { price: string; priceCurrency: string; priceSpecification?: { billingDuration: string } }[];
};

function graphOf(doc: Document): SchemaNode[] {
  return Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
    .flatMap((script) => JSON.parse(script.textContent!)["@graph"]);
}

function checkSiteEntities(doc: Document) {
  const graph = graphOf(doc);
  const organizations = graph.filter((node) => node["@type"] === "Organization");
  const applications = graph.filter((node) => node["@type"] === "SoftwareApplication");
  expect(organizations).to.have.length(1);
  expect(applications).to.have.length(1);
  expect(organizations[0].name).to.eq("DuoShot");
  expect(organizations[0].logo).to.eq(`${organizations[0].url}/brand/duoshot-logo.png`);
  expect(organizations[0].sameAs).to.deep.eq(["https://www.threads.com/@duoshot.app", "https://www.instagram.com/duoshot.app/"]);
  expect(applications[0].publisher?.["@id"]).to.eq(organizations[0]["@id"]);
  for (const node of [organizations[0], applications[0]]) {
    expect(node.description).to.contain(doc.documentElement.lang === "fr"
      ? "iPhone Duo (le téléphone pliable d'Apple)" : "iPhone Duo (Apple's foldable iPhone)");
  }
  const offers = applications[0].offers!;
  expect(JSON.stringify(offers)).not.to.match(/coupon|discount|remise|réduction/i);
  const passConfigured = Cypress.expose("passPriceConfigured");
  expect(offers.map(({ price }) => price)).to.deep.eq(passConfigured ? ["0", "12", "49", "120", "490", "19"] : ["0", "12", "49", "120", "490"]);
  offers.forEach((offer) => expect(offer.priceCurrency).to.eq("EUR"));
  expect(offers.slice(1).map((offer) => offer.priceSpecification?.billingDuration))
    .to.deep.eq(passConfigured ? ["P1M", "P1M", "P1Y", "P1Y", "P30D"] : ["P1M", "P1M", "P1Y", "P1Y"]);
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

    it(`renders the approved home search and social copy in ${locale}`, () => {
      const title = locale === "fr"
        ? "Générateur de captures App Store pour iPhone Duo | DuoShot"
        : "iPhone Duo App Store Screenshot Generator | DuoShot";
      const description = locale === "fr"
        ? "Générateur de captures App Store pour iPhone Duo à partir de vos vraies captures : cadrage aux formats Apple, vérifications et export PNG/JPEG en ZIP."
        : "App Store screenshot generator for iPhone Duo, built from your real screenshots: framed to Apple's sizes, checked, and exported as PNG/JPEG in a ZIP.";
      visit(prefix || "/");
      cy.get("main h2").first().should("have.text", locale === "fr"
        ? "Des captures brutes aux fichiers Duo vérifiés"
        : "From raw captures to checked Duo files")
        .invoke("text").should("not.match", /générateur|generator/i);
      cy.document().then((doc) => {
        expect(doc.querySelectorAll("title")).to.have.length(1);
        expect(doc.title).to.eq(title);
        expect(doc.querySelector('meta[name="description"]')!.getAttribute("content")).to.eq(description);
        expect(description.length).to.be.at.most(160);
        for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) {
          expect(doc.querySelectorAll(selector)).to.have.length(1);
          expect(doc.querySelector(selector)!.getAttribute("content")).to.eq(title);
        }
        expect(doc.querySelector('meta[property="og:description"]')!.getAttribute("content")).to.eq(description);
        expect(doc.querySelector('meta[name="twitter:description"]')!.getAttribute("content")).to.eq(description);
        checkSiteEntities(doc);
      });
    });

    it(`links to the manual Duo upload guide with matching HowTo and FAQ in ${locale}`, () => {
      const guidePath = `${prefix}/guides/iphone-duo-app-store-connect`;
      for (const source of [`${prefix}/specs`, `${prefix}/guides/best-app-store-screenshot-generator`]) {
        visit(source);
        cy.get(`main a[href="${guidePath}"]`).click();
        cy.location("pathname").should("eq", guidePath);
      }
      cy.get("h1").should("have.length", 1).and("contain", "App Store Connect");
      cy.get('main a[href="https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications"]').should("exist");
      cy.get("main").should("contain", locale === "en" ? "up to 10 screenshots per device size" : "jusqu’à 10 captures par taille d’appareil")
        .and("not.contain", "APP_IPHONE_DUO")
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
        .and("contain", locale === "en" ? "In DuoShot: outer only, inner only, or a mix." : "Dans DuoShot : externe uniquement, interne uniquement ou un mix.")
        .and("not.contain", locale === "en" ? "iPhone Duo slot" : "un emplacement iPhone Duo")
        .and("contain", locale === "en" ? "10 screenshots per device size" : "10 captures par taille d’appareil")
        .and("contain", "DuoShot (duoshot.site)")
        .and("contain", "DuoScreenshot (duoscreenshot.com)")
        .and("contain", locale === "en" ? "DuoShot (duoshot.site) is not affiliated with DuoScreenshot (duoscreenshot.com)." : "DuoShot (duoshot.site) est distinct de DuoScreenshot (duoscreenshot.com).");
      cy.get("h1").should("contain", locale === "en"
        ? "iPhone Duo (Apple's foldable iPhone)" : "iPhone Duo (le téléphone pliable d'Apple)");
      cy.get('main a[href="https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/"]').should("exist");
      cy.document().then((doc) => {
        checkSiteEntities(doc);
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
          checkSiteEntities(doc);
          expect(graph.map((node) => node["@type"])).to.deep.eq(["Organization", "SoftwareApplication", "TechArticle"]);
          const article = graph.find((node) => node["@type"] === "TechArticle")!;
          expect(article.url).to.eq(canonical);
          expect(article.headline).to.eq(doc.querySelector("h1")!.textContent);
          expect(doc.documentElement.scrollWidth).to.be.at.most(doc.defaultView!.innerWidth + 1);
          cy.request("/sitemap.xml").its("body").should("contain", `<loc>${canonical}</loc>`);
        });
      });
    }

    for (const [slug, name, officialUrl] of [
      ["duoshot-vs-applaunchflow", "AppLaunchFlow", "https://applaunchflow.com/"],
      ["duoshot-vs-appscreens", "AppScreens", "https://appscreens.com/"],
      ["duoshot-vs-screenhance", "Screenhance", "https://screenhance.com/"],
    ]) {
      it(`discovers the ${name} comparison from the guide and serves indexable ${locale} content`, () => {
        const path = `/guides/${slug}`;
        visit(`${prefix}/guides/best-app-store-screenshot-generator`);
        cy.get(`main a[href="${prefix}${path}"]`).click();
        cy.location("pathname").should("eq", `${prefix}${path}`);
        cy.get("h1").should("have.length", 1).and("contain", `DuoShot vs ${name}`);
        cy.get(`main a[href="${officialUrl}"]`).should("exist");
        for (const target of ["/specs", "/pricing", "/tool", "/guides/best-app-store-screenshot-generator"]) {
          cy.get(`main a[href="${prefix}${target}"]`).should("exist");
        }
        cy.get("main").should("contain", "1398 × 2034").and("contain", "2007 × 2853")
          .and("contain", "1206 × 2622").and("contain", "1320 × 2868")
          .and("contain", locale === "fr" ? "n’a pas été testé par DuoShot" : "has not tested iPhone Duo uploads");
        cy.document().then((doc) => {
          const canonical = doc.querySelector('link[rel="canonical"]')!.getAttribute("href")!;
          const origin = new URL(canonical).origin;
          expect(canonical).to.eq(`${origin}${prefix}${path}`);
          expect(doc.title).to.contain(`DuoShot vs ${name}`);
          expect(doc.documentElement.lang).to.eq(locale);
          expect(doc.querySelector('meta[name="description"]')!.getAttribute("content")).to.contain(name);
          expect(doc.querySelector('meta[name="robots"]')?.getAttribute("content") || "").not.to.contain("noindex");
          for (const language of ["fr", "en", "x-default"]) {
            expect(doc.querySelector(`link[rel="alternate"][hreflang="${language}"]`)!.getAttribute("href"))
              .to.eq(`${origin}${language === "en" ? "/en" : ""}${path}`);
          }
          expect(doc.querySelector('meta[property="og:url"]')!.getAttribute("content")).to.eq(canonical);
          expect(doc.querySelector('meta[property="og:image"]')?.getAttribute("content")).to.contain(`${path}/opengraph-image`);
          expect(doc.querySelector('meta[name="twitter:card"]')?.getAttribute("content")).to.eq("summary_large_image");
          const article = graphOf(doc).find((node) => node["@type"] === "TechArticle")!;
          expect(article.headline).to.eq(doc.querySelector("h1")!.textContent);
          expect(article.url).to.eq(canonical);
          expect(article.dateModified).to.eq("2026-10-16");
          expect(doc.documentElement.scrollWidth).to.be.at.most(doc.defaultView!.innerWidth + 1);
          cy.request("/sitemap.xml").its("body").should("contain", `<loc>${canonical}</loc>`);
        });
        const otherPrefix = locale === "fr" ? "/en" : "";
        cy.get('[data-testid="locale-switch"]').should("have.attr", "href", `${otherPrefix}${path}`).click();
        cy.location("pathname").should("eq", `${otherPrefix}${path}`);
        cy.get("html").should("have.attr", "lang", locale === "fr" ? "en" : "fr");
        cy.get("h1").should("contain", `DuoShot vs ${name}`);
      });
    }

    it(`matches FAQ markup to displayed questions on home, pricing and rejection in ${locale}`, () => {
      for (const path of [prefix || "/", `${prefix}/pricing`, locale === "fr" ? "/rejet" : "/en/rejection"]) {
        visit(path);
        cy.document().then((doc) => {
          checkSiteEntities(doc);
          checkFaq(doc);
        });
      }
    });

    it(`includes the shared entities on the guide and legal page in ${locale}`, () => {
      for (const path of [`${prefix}/guides/best-app-store-screenshot-generator`, `${prefix}/legal`]) {
        visit(path);
        cy.document().then(checkSiteEntities);
      }
    });

    it(`publishes the free screenshot checker with localized links and SEO in ${locale}`, () => {
      const path = `${prefix}/tools/iphone-duo-screenshot-checker`;
      visit(`${prefix}/specs`);
      cy.get(`main a[href="${path}"]`).click();
      cy.location("pathname").should("eq", path);
      cy.get("h1").should("contain", locale === "fr" ? "Vérificateur gratuit" : "Free iPhone Duo screenshot checker");
      cy.get("#checker-privacy").should("contain", locale === "fr" ? "Aucune image n’est envoyée" : "No images are uploaded");
      cy.get('input[type="file"]').should("have.attr", "multiple");
      cy.get('[aria-live="polite"]').should("exist");
      cy.contains("main a", locale === "fr" ? "Générer mes captures" : "Generate screenshots").should("have.attr", "href", `${prefix}/tool`);
      cy.document().then((doc) => {
        const canonical = doc.querySelector('link[rel="canonical"]')!.getAttribute("href")!;
        expect(canonical).to.eq(`${new URL(canonical).origin}${path}`);
        expect(doc.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "").not.to.contain("noindex");
        for (const language of ["fr", "en", "x-default"]) {
          expect(doc.querySelector(`link[rel="alternate"][hreflang="${language}"]`)!.getAttribute("href"))
            .to.eq(`${new URL(canonical).origin}${language === "en" ? "/en" : ""}/tools/iphone-duo-screenshot-checker`);
        }
        const graph = graphOf(doc);
        const software = graph.find((node) => node["@id"] === `${canonical}#software`)!;
        expect(graph.filter((node) => node["@type"] === "Organization")).to.have.length(1);
        expect(graph.filter((node) => node["@type"] === "SoftwareApplication")).to.have.length(2);
        expect(software.publisher?.["@id"]).to.eq(graph.find((node) => node["@type"] === "Organization")!["@id"]);
        expect(software.name).to.eq(doc.querySelector("h1")!.textContent);
        expect(software.description).to.eq(doc.querySelector('meta[name="description"]')!.getAttribute("content"));
        expect(software.url).to.eq(canonical);
        expect(software.offers).to.have.length(1);
        expect(software.offers![0]).to.include({ price: "0", priceCurrency: "EUR" });
        expect(doc.querySelector('meta[property="og:image"]')!.getAttribute("content")).to.contain("/tools/iphone-duo-screenshot-checker/opengraph-image/");
        checkFaq(doc);
        cy.request("/sitemap.xml").its("body").should("contain", `<loc>${canonical}</loc>`);
      });
      visit(`${prefix}/guides/best-app-store-screenshot-generator`);
      cy.get(`main a[href="${path}"]`).should("exist");
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

  it("publishes the identity, sizes, prices and bilingual guides alongside the SDK qualifier in llms.txt", () => {
    cy.request("/llms.txt").its("body").should("match", /April 2027[^\n]+for apps built with the iOS 27\.1 SDK or later/)
      .and("contain", "DuoShot (duoshot.site) is the App Store screenshot studio for iPhone Duo (Apple's foldable iPhone)")
      .and("contain", "DuoScreenshot (duoscreenshot.com)")
      .and("contain", "DuoShot (duoshot.site) is not affiliated with DuoScreenshot (duoscreenshot.com).")
      .and("contain", 'iPhone Duo outer display: 1398x2034')
      .and("contain", 'iPhone Duo inner display: 2007x2853')
      .and("contain", 'iPhone with Dynamic Island (medium display, 6.3") required: 1206x2622, included in the free trial')
      .and("contain", 'iPhone 6.9": 1320x2868, optional with')
      .and("contain", "Free trial: 0 EUR, 2 HD ZIPs")
      .and("contain", "Indie: 12 EUR/month or 120 EUR/year; Studio: 49 EUR/month or 490 EUR/year")
      .and("not.match", /coupon|discount|remise|réduction/i)
      .and("contain", "/guides/best-app-store-screenshot-generator")
      .and("contain", "/en/guides/best-app-store-screenshot-generator")
      .and("contain", "Uploads have not yet been tested by DuoShot");
  });
});
