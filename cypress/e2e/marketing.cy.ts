describe("marketing", () => {
  it("keeps the closed/open example and CTA readable on mobile", () => {
    cy.viewport(390, 844);
    cy.visitFr("/");
    cy.get("h1").should("have.length", 1).and("have.text", "Vos captures App Store, prêtes pour l’iPhone Duo.").and("be.visible");
    cy.get('[data-testid="cta-tool"]').should("be.visible");
    cy.get(".studio-sequence-stage").should("not.be.visible");
    cy.get(".studio-sequence-step-visual").should("have.length", 4);
    cy.get('[data-testid="zip-tree"]').scrollIntoView().should("be.visible");
    cy.get(".studio-review-preview").scrollIntoView().should("be.visible").and("contain", "Votre décision");
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.defaultView!.innerWidth + 1);
    });
  });

  it("renders the French home, pricing, and primary CTAs", () => {
    cy.visitFr("/");
    cy.get("h1").should("have.length", 1).and("have.text", "Vos captures App Store, prêtes pour l’iPhone Duo.").and("be.visible");
    cy.get('[data-testid="cta-tool"]').should("have.attr", "href", "/tool");
    cy.get('[data-testid="cta-demo"]').should("have.attr", "href", "/tool?demo=harbor");
    cy.get('[data-testid="nav-signup"]').should("have.class", "ds-cta-ghost").and("not.have.class", "ds-cta");
    cy.get('[data-testid="cta-demo-proof"]').should("have.attr", "href", "/tool?demo=harbor").and("contain", "Voir l’exemple");
    cy.get('[data-testid="cta-example"]').should("have.attr", "href").and("include", "/api/example-zip");
    cy.get('[data-testid="zip-tree"]').should("contain", "exampleapp/duo-outer-portrait/01.png");
    cy.get('[data-testid="zip-tree"]').should("contain", "exampleapp/duo-inner-portrait/01.png");
    cy.get('[data-testid="zip-tree"]').should("not.contain", "duo-inner-landscape");
    cy.contains("Harbor · app fictive").should("be.visible");
    cy.contains("3 sièges").should("be.visible");
    cy.contains("Same set").should("not.exist");
    cy.get('[data-testid="cta-review-demo"]').should("have.attr", "href", "/r/harbor");
    cy.get(".studio-review-preview").should("contain", "Écran fermé").and("contain", "Approuver");
    cy.get('[data-testid="trust-line"]').should("be.visible");
    cy.get('[data-testid="pricing"]').scrollIntoView().should("be.visible");
    cy.get('[data-testid="pricing-cta-indie_monthly"]').should("be.visible");
    cy.get('[data-testid="pricing-cta-studio_monthly"]').should("be.visible");
    cy.get('[data-testid="billing-monthly"]').should("not.exist");
    cy.get('[data-testid="billing-yearly"]').should("not.exist");
    cy.get('[data-testid="cta-tool-closing"]').scrollIntoView().should("be.visible").and("have.attr", "href", "/tool");
    cy.get('[data-testid="footer-fazier"]').should("contain", "DuoShot sur Fazier").find("img").should("not.exist");
  });

  it("shows the open Harbor device turned to portrait, at its real scale", () => {
    cy.viewport(1397, 920);
    cy.visitFr("/");
    cy.get(".studio-hero-object .duo-chassis").then(($closed) => {
      cy.get(".studio-hero-object .duo-book").then(($open) => {
        // Open 164.6 mm tall once turned, closed 117.8 mm.
        const ratio = $open[0].getBoundingClientRect().height / $closed[0].getBoundingClientRect().height;
        expect(ratio).to.be.closeTo(164.6 / 117.8, 0.03);
      });
    });
    cy.get(".studio-hero-object .duo-book img").should("have.attr", "src", "/harbor/fr/01-inner.webp");
    cy.get('[data-testid="locale-switch"]').should("contain", "🇬🇧");
  });

  for (const [locale, path] of [["fr", "/"], ["en", "/en"]] as const) {
    it(`matches each scroll step to its phone scene in ${locale}`, () => {
      cy.viewport(1397, 920);
      if (locale === "fr") cy.visitFr(path);
      else cy.visitEn(path);
      const layer = (name: string) => cy.get(`.studio-sequence-stage .studio-sequence-${name}`);
      cy.get(".studio-sequence-step").eq(0).scrollIntoView();
      layer("import").should("be.visible");
      cy.get(".studio-sequence-step").eq(1).scrollIntoView();
      layer("analysis").should("be.visible").should("contain", "83 / 100");
      layer("import").should("not.be.visible");
      cy.get(".studio-sequence-step").eq(2).scrollIntoView();
      layer("report").should("be.visible");
      layer("analysis").should("not.be.visible");
      cy.get(".studio-sequence-step").eq(3).scrollIntoView({ offset: { top: -120, left: 0 } });
      layer("prevent").should("be.visible");
      layer("report").should("not.be.visible");
      // Scrolling back up replays the transitions in reverse.
      cy.get(".studio-sequence-step").eq(1).scrollIntoView();
      layer("analysis").should("be.visible");
      layer("report").should("not.be.visible");
      layer("prevent").should("not.be.visible");
    });
  }

  it("keeps the language button the same size on home and inside the site", () => {
    cy.visitFr("/");
    cy.get('[data-testid="locale-switch"]').then(($button) => {
      const homeSize = Number.parseFloat(getComputedStyle($button[0]).fontSize);
      cy.visitFr("/tool");
      cy.get('[data-testid="locale-switch"]').then(($innerButton) => {
        expect(Number.parseFloat(getComputedStyle($innerButton[0]).fontSize)).to.eq(homeSize);
      });
    });
  });

  it("explains the limits of AI in both FAQ languages", () => {
    cy.visitFr("/");
    cy.contains("button", "Pourquoi une IA ne suffit-elle pas").click();
    cy.contains("la validation du contenu reste humaine").should("be.visible");
    cy.visitEn("/en");
    cy.contains("button", "Why isn’t AI alone enough").click();
    cy.contains("a person makes the final content decision").should("be.visible");
  });

  it("renders the English home", () => {
    cy.visitEn("/en");
    cy.get("h1").should("have.length", 1).and("have.text", "Your App Store screenshots, ready for iPhone Duo.").and("be.visible");
    cy.get('[data-testid="cta-tool"]').should("have.attr", "href", "/en/tool");
    cy.get('[data-testid="nav-signup"]').should("have.class", "ds-cta-ghost");
    cy.get('[data-testid="cta-demo-proof"]').should("contain", "See the example");
    cy.contains("Harbor · fictional app").should("be.visible");
    cy.get('[data-testid="cta-review-demo"]').should("have.attr", "href", "/en/r/harbor");
    cy.get(".studio-review-preview").should("contain", "Closed screen").and("contain", "Approve");
    cy.get('[data-testid="locale-switch"]').should("contain", "🇫🇷");
    cy.get('[data-testid="pricing-cta-indie_monthly"]').should("be.visible");
    cy.get('[data-testid="pricing-cta-studio_monthly"]').should("be.visible");
    cy.get('[data-testid="billing-monthly"]').should("not.exist");
    cy.get('[data-testid="billing-yearly"]').should("not.exist");
    cy.get('[data-testid="cta-tool-closing"]').should("have.attr", "href", "/en/tool");
    cy.get('[data-testid="footer-fazier"]').should("contain", "DuoShot on Fazier").find("img").should("not.exist");
  });

  it("serves a dedicated pricing page", () => {
    cy.visitFr("/pricing");
    cy.contains("h1", "Tarifs des captures App Store : essai, Indie, Studio.").should("be.visible");
    cy.get('[data-testid="nav-pricing"]').should("have.attr", "aria-current", "page");
    cy.contains("Paiement sécurisé par Stripe").should("be.visible");
    cy.get('[data-testid="pricing-cta-trial"]').should("have.attr", "href", "/tool");
    cy.get('[data-testid="pricing-review-demo"]').should("have.attr", "href", "/r/harbor");
    cy.contains("3 sièges").should("be.visible");
    cy.visitEn("/en/pricing");
    cy.contains("h1", "App Store screenshot plans: Free, Indie, Studio.").should("be.visible");
    cy.get('[data-testid="pricing-review-demo"]').should("have.attr", "href", "/en/r/harbor");
    cy.get('[data-testid="pricing-cta-trial"]').should("have.attr", "href", "/en/tool");
  });

  for (const locale of ["fr", "en"] as const) {
    it(`switches annual and monthly billing on the ${locale} pricing page`, () => {
      if (locale === "fr") cy.visitFr("/pricing");
      else cy.visitEn("/en/pricing");
      cy.get("h1").should("have.length", 1);
      cy.get('meta[name="description"]').invoke("attr", "content").should("contain", locale === "fr" ? "6,3″ requis" : "6.3″ iPhone required")
        .and("contain", locale === "fr" ? "6,9″ optionnel" : "optional 6.9″")
        .its("length").should("be.at.most", 155);
      cy.get(".studio-plan-title").each(($title) => {
        expect($title.find("h2")).to.have.length(1);
        expect($title.find("h3")).to.have.length(0);
      });
      cy.get(".studio-plan-team h2").should("have.length", 1);
      cy.get('[data-testid="pricing-faq"]').should("have.length", 1).find(".t-acc").should("have.length", 12);
      cy.get(".studio-pricing-faq").should("not.exist");
      cy.get('[data-testid="billing-monthly"]').should("have.attr", "aria-pressed", "true");
      cy.get('[data-testid="billing-yearly"]').click().should("have.attr", "aria-pressed", "true");
      cy.contains(locale === "fr" ? "120 € / an" : "€120 / year").should("be.visible");
      cy.contains(locale === "fr" ? "490 € / an" : "€490 / year").should("be.visible");
      cy.get('[data-testid="pricing-cta-indie_yearly"]').should("be.visible").and("contain", locale === "fr" ? "120 €/an" : "€120/year");
      cy.get('[data-testid="pricing-cta-studio_yearly"]').should("be.visible").and("contain", locale === "fr" ? "490 €/an" : "€490/year");
      cy.get('[data-testid="billing-monthly"]').click().should("have.attr", "aria-pressed", "true");
      cy.get('[data-testid="pricing-cta-indie_monthly"]').should("be.visible");
      cy.get('[data-testid="pricing-cta-studio_monthly"]').should("be.visible");
    });
  }

  it("serves content and legal pages", () => {
    cy.visitFr("/specs");
    cy.contains("h1", "Tailles des captures iPhone Duo").should("be.visible");
    cy.visitFr("/pourquoi-pas-ia");
    cy.contains("h1", "Captures App Store : IA ou captures réelles ?").should("be.visible");
    cy.contains("IA et DuoShot : les points à vérifier").should("be.visible");
    cy.contains("Listing exemple").should("not.exist");
    cy.visitFr("/why-not-ai");
    cy.contains("h1", "Captures App Store : IA ou captures réelles ?").should("be.visible");
    cy.visitFr("/rejet");
    cy.contains("h1", "Captures iPhone Duo dans App Store Connect").should("be.visible");
    cy.get('[data-testid="rejection-cta-tool"]').should("have.class", "ds-cta").and("have.attr", "href", "/tool");
    cy.get("article").eq(2).find("p").first().should("have.text", "contenu");
    cy.visitFr("/rejection");
    cy.contains("h1", "Captures iPhone Duo dans App Store Connect").should("be.visible");
    cy.visitFr("/privacy");
    cy.contains("h1", "Confidentialité").should("be.visible");
    cy.visitFr("/terms");
    cy.contains("h1", "Conditions générales").should("be.visible");
    cy.visitFr("/cookies");
    cy.contains("h1", "Cookies").should("be.visible");
    cy.visitFr("/legal");
    cy.contains("h1", "Mentions légales").should("be.visible");
    cy.visitFr("/legal/subprocessors");
    cy.contains("h1", "Sous-traitants").should("be.visible");
  });

  it("exposes robots and sitemap", () => {
    cy.request("/robots.txt").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).not.to.include("Disallow: /tool");
      expect(response.body).not.to.include("Disallow: /account");
      expect(response.body).not.to.include("Disallow: /r/");
      expect(response.body).to.include("sitemap.xml");
    });
    cy.request("/sitemap.xml").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.include("/specs");
      expect(response.body).to.include("/pricing");
      expect(response.body).to.include("/en");
      expect(response.body).not.to.include("<loc>http://localhost:3000/why-not-ai</loc>");
      expect(response.body).not.to.include("<loc>http://localhost:3000/rejection</loc>");
    });
  });
});


describe("camera and review preparation", () => {
  it("places the closed camera at the top right and leaves the third step intact", () => {
    cy.viewport(1397, 920);
    cy.visitFr("/");
    cy.get(".studio-hero-object .device-camera").should("be.visible").then(($camera) => {
      const camera = $camera[0].getBoundingClientRect();
      const screen = $camera[0].parentElement!.getBoundingClientRect();
      expect(camera.left).to.be.greaterThan(screen.left + screen.width * 0.8);
      expect(camera.bottom).to.be.lessThan(screen.top + screen.height * 0.15);
    });
    cy.get(".studio-sequence-step").should("have.length", 4).eq(2).should("contain", "Sachez ce qui reste à vérifier.").and("contain", "Le bilan sépare les contrôles techniques, les alertes visuelles et vos confirmations.");
    cy.get(".studio-sequence-step").eq(3).scrollIntoView({ offset: { top: -120, left: 0 } });
    cy.get(".studio-sequence-stage .studio-prevent-outcome").should("be.visible");
    cy.get(".studio-sequence-stage .studio-prevent-checks li").should("have.length", 4).each(($check) => cy.wrap($check).should("have.css", "visibility", "visible"));
    cy.contains("button", "DuoShot peut-il éviter des retards").click();
    cy.contains("DuoShot ne garantit ni l’approbation ni un délai de validation").should("be.visible");
  });

  it("keeps the camera out of export-pixel previews", () => {
    cy.viewport(1397, 920);
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-tab-adjust"]').click();
    cy.get('[data-testid="tool-device-view"]').click();
    cy.get('[data-testid="preview-outer"] .device-camera').should("have.css", "background-color", "rgb(8, 11, 16)").and("have.css", "z-index", "5");
    cy.get('[data-testid="preview-inner"] .device-camera').should("not.exist");
    cy.dropScreens();
    cy.get('[data-testid="preview-outer"] img').should("be.visible");
    cy.get('[data-testid="preview-outer"] .device-camera').should("have.css", "background-color", "rgb(8, 11, 16)").and("have.css", "z-index", "5");
    cy.get('[data-testid="tool-tab-adjust"]').click();
    cy.get('[data-testid="tool-pixel-view"]').click();
    cy.get('[data-testid="preview-outer"] .device-camera').should("not.exist");
    cy.get('[data-testid="tool-device-view"]').click();
    cy.get('[data-testid="preview-outer"] .device-camera').should("have.css", "background-color", "rgb(8, 11, 16)").and("have.css", "z-index", "5");
  });
});


describe("screenshot dimensions and search intent", () => {
  for (const locale of ["fr", "en"] as const) {
    const prefix = locale === "fr" ? "" : "/en";
    const visit = (path: string) => locale === "fr" ? cy.visitFr(path) : cy.visitEn(path);

    it(`shows dimensions, availability and localized CTAs in ${locale}`, () => {
      cy.viewport(390, 844);
      visit(prefix || "/");
      cy.get('[data-testid="hero-dimensions"]').should("be.visible")
        .and("contain", "1398 × 2034").and("contain", "2007 × 2853").and("contain", "portrait");
      // The App Store Connect status lives on the dimensions page, not in the hero.
      cy.get('[data-testid="apple-availability"]').should("not.exist");
      cy.get('[data-testid="cta-tool"]').should("be.visible").and("have.attr", "href", `${prefix}/tool`);
      cy.get('[data-testid="cta-specs"]').should("have.attr", "href", `${prefix}/specs`).click();
      cy.location("pathname").should("eq", `${prefix}/specs`);
      cy.get('[data-testid="apple-availability"]').should("be.visible")
        .and("contain", locale === "fr"
          ? "un emplacement iPhone Duo, avec jusqu’à 10 captures par taille d’appareil."
          : "an iPhone Duo slot, with up to 10 screenshots per device size.")
        .and("contain", locale === "fr" ? "pas encore été testé" : "not yet been tested")
        .and("contain", locale === "fr" ? "avril 2027" : "April 2027")
        .and("contain", locale === "fr" ? "SDK iOS 27.1 ou ultérieur" : "for apps built with the iOS 27.1 SDK or later");
      cy.get('[data-testid="apple-availability"] a[href="https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/"]')
        .should("have.text", locale === "fr" ? "Spécifications des captures d’Apple" : "Apple screenshot specifications");
      cy.get('[data-testid="apple-availability"] a[href*="github.com/rorkai"]').should("not.exist");
      cy.get('section[aria-labelledby="iphone-63-sizes"] table').find("tbody tr").should("have.length", 2);
      cy.get('section[aria-labelledby="iphone-63-sizes"] table').should("contain", "1206 × 2622").and("contain", "2622 × 1206");
      cy.get('section[aria-labelledby="duo-sizes"] table').find("tbody tr").should("have.length", 4);
      for (const size of ["1398 × 2034", "2034 × 1398", "2007 × 2853", "2853 × 2007"]) {
        cy.get('section[aria-labelledby="duo-sizes"] table').should("contain", size);
      }
      cy.get('section[aria-labelledby="duo-sizes"] table').should("not.contain", "Indie").and("not.contain", "6.9");
      cy.get("#panel-vs-connect").parent().should("contain", "1878 × 2670").and("contain", "2007 × 2853");
      cy.get('[data-testid="specs-cta-tool"]').should("have.attr", "href", `${prefix}/tool`);
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth).to.be.at.most(doc.defaultView!.innerWidth + 1);
        const graph = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
          .flatMap((script) => JSON.parse(script.textContent!)["@graph"]);
        const faq = graph.find((item: { "@type": string }) => item["@type"] === "FAQPage");
        const rows = Array.from(doc.querySelectorAll(".t-acc"));
        expect(faq.mainEntity).to.have.length(rows.length);
        rows.forEach((row, index) => {
          expect(faq.mainEntity[index].name).to.eq(row.querySelector("button > span")!.textContent);
          expect(faq.mainEntity[index].acceptedAnswer.text).to.eq(row.querySelector("p")!.textContent);
        });
      });
      cy.get(".t-acc").eq(3).find("button").click().should("have.attr", "aria-expanded", "true");
      cy.get(".t-acc").eq(3).find("p").should("be.visible");
    });

    it(`renders crawlable specs and prioritizes file errors in ${locale}`, () => {
      visit(`${prefix}/specs`);
      cy.request(`${prefix}/specs`).then(({ body }) => {
        const doc = new DOMParser().parseFromString(body, "text/html");
        expect(doc.querySelector("h1")!.textContent!.replace(/\u00a0/g, " ")).to.contain("App Store Connect");
        expect(doc.title).to.contain(locale === "fr" ? "Tailles des captures iPhone Duo" : "iPhone Duo screenshot size");
        expect(doc.title).to.contain(locale === "fr" ? "pli" : "fold");
        expect(doc.title.length).to.be.at.most(60);
        const description = doc.querySelector('meta[name="description"]')!.getAttribute("content")!;
        expect(description.length).to.be.at.most(155);
        expect(doc.querySelector('meta[property="og:title"]')!.getAttribute("content")).to.eq(doc.title);
        expect(doc.querySelector('meta[name="twitter:title"]')!.getAttribute("content")).to.eq(doc.title);
        expect(doc.querySelector('meta[property="og:description"]')!.getAttribute("content")).to.eq(description);
        expect(doc.querySelector('meta[name="twitter:description"]')!.getAttribute("content")).to.eq(description);
        expect(doc.querySelector('#safe-area-fold')!.textContent).to.contain(locale === "fr" ? "Zone de sécurité" : "safe area");
        const image = doc.querySelector('meta[property="og:image"]')!.getAttribute("content")!;
        expect(doc.querySelector('meta[name="twitter:image"]')!.getAttribute("content")).to.eq(image);
        cy.setCookie("duoshot_locale_manual", locale === "fr" ? "en" : "fr");
        cy.request({ url: new URL(image).pathname, followRedirect: false }).then((response) => {
          expect(response.status).to.eq(200);
          expect(response.headers["content-type"]).to.include("image/png");
        });
        expect(doc.querySelector('link[rel="canonical"]')!.getAttribute("href")).to.match(new RegExp(`${prefix}/specs$`));
        expect(doc.querySelector('link[hreflang="en"]')!.getAttribute("href")).to.match(/\/en\/specs$/);
        expect(doc.querySelector('link[hreflang="fr"]')!.getAttribute("href")).to.match(/\/specs$/);
        for (const size of ["1398 × 2034", "2034 × 1398", "2007 × 2853", "2853 × 2007"]) {
          expect(doc.querySelector('section[aria-labelledby="duo-sizes"] table')!.textContent).to.contain(size);
        }
        for (const size of ["1206 × 2622", "2622 × 1206"]) {
          expect(doc.querySelector('section[aria-labelledby="iphone-63-sizes"] table')!.textContent).to.contain(size);
        }
      });
      visit(locale === "fr" ? "/rejet" : "/en/rejection");
      cy.get('[data-testid="rejection-cta-tool"]').should("have.attr", "href", `${prefix}/tool`).and("have.class", "ds-cta");
      cy.get("article").eq(0).should("contain", "image dimensions are not valid");
      cy.get("article").eq(1).should("contain", "alpha");
      cy.get("article").eq(2).find("p").first().should("have.text", locale === "fr" ? "contenu" : "content");
    });
  }
});
