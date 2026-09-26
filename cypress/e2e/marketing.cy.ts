describe("marketing", () => {
  it("keeps the closed/open example and CTA readable on mobile", () => {
    cy.viewport(390, 844);
    cy.visitFr("/");
    cy.contains("h1", "Deux écrans.").should("be.visible");
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
    cy.contains("h1", "Deux écrans.").should("be.visible");
    cy.get('[data-testid="cta-tool"]').should("have.attr", "href", "/tool");
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
  });

  it("keeps the Harbor devices equally tall and reveals annual billing", () => {
    cy.viewport(1397, 920);
    cy.visitFr("/");
    cy.get(".studio-hero-object .duo-chassis").then(($closed) => {
      cy.get(".studio-hero-object .duo-book").then(($open) => {
        expect(Math.abs($closed[0].getBoundingClientRect().height - $open[0].getBoundingClientRect().height)).to.be.lessThan(2);
      });
    });
    cy.get('[data-testid="locale-switch"]').should("contain", "🇬🇧");
    cy.get('[data-testid="billing-yearly"]').click();
    cy.contains("120 € / an").should("be.visible");
    cy.contains("490 € / an").should("be.visible");
    cy.get('[data-testid="pricing-cta-indie_yearly"]').should("be.visible");
    cy.get('[data-testid="pricing-cta-indie_yearly"]').should("contain", "120 €/an");
    cy.get('[data-testid="pricing-cta-studio_yearly"]').should("be.visible");
    cy.get('[data-testid="pricing-cta-studio_yearly"]').should("contain", "490 €/an");
    cy.get('[data-testid="billing-monthly"]').click();
    cy.get('[data-testid="pricing-cta-indie_monthly"]').should("be.visible");
  });

  for (const [locale, path] of [["fr", "/"], ["en", "/en"]] as const) {
    it(`matches each scroll step to its phone scene in ${locale}`, () => {
      cy.viewport(1397, 920);
      if (locale === "fr") cy.visitFr(path);
      else cy.visitEn(path);
      cy.get(".studio-sequence-step").eq(0).scrollIntoView();
      cy.get('.studio-sequence-stage > [data-sequence-scene="import"]').should("be.visible");
      cy.get(".studio-sequence-step").eq(1).scrollIntoView();
      cy.get('.studio-sequence-stage > [data-sequence-scene="inspect"]').should("be.visible").should("contain", "83 / 100");
      cy.get(".studio-sequence-step").eq(2).scrollIntoView();
      cy.get('.studio-sequence-stage > [data-sequence-scene="report"]').should("be.visible");
      cy.get(".studio-sequence-step").eq(3).scrollIntoView();
      cy.get('.studio-sequence-stage > [data-sequence-scene="prevent"]').should("be.visible");
      cy.get(".studio-sequence-step").eq(1).scrollIntoView();
      cy.get('.studio-sequence-stage > [data-sequence-scene="inspect"]').should("be.visible");
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
    cy.contains("h1", "Two screens.").should("be.visible");
    cy.get('[data-testid="cta-tool"]').should("have.attr", "href", "/en/tool");
    cy.contains("Harbor · fictional app").should("be.visible");
    cy.get('[data-testid="cta-review-demo"]').should("have.attr", "href", "/en/r/harbor");
    cy.get(".studio-review-preview").should("contain", "Closed screen").and("contain", "Approve");
    cy.get('[data-testid="locale-switch"]').should("contain", "🇫🇷");
    cy.get('[data-testid="billing-yearly"]').click();
    cy.contains("€120 / year").should("be.visible");
  });

  it("serves a dedicated pricing page", () => {
    cy.visitFr("/pricing");
    cy.contains("h1", "Essai, Indie, Studio.").should("be.visible");
    cy.get('[data-testid="pricing-cta-trial"]').should("have.attr", "href", "/signup");
    cy.get('[data-testid="pricing-review-demo"]').should("have.attr", "href", "/r/harbor");
    cy.contains("3 sièges").should("be.visible");
    cy.visitEn("/en/pricing");
    cy.contains("h1", "Trial, Indie, Studio.").should("be.visible");
    cy.get('[data-testid="pricing-review-demo"]').should("have.attr", "href", "/en/r/harbor");
  });

  it("serves content and legal pages", () => {
    cy.visitFr("/specs");
    cy.contains("h1", "Pixels iPhone Duo").should("be.visible");
    cy.visitFr("/pourquoi-pas-ia");
    cy.contains("h1", "Pourquoi pas ton IA").should("be.visible");
    cy.visitFr("/why-not-ai");
    cy.contains("h1", "Pourquoi pas ton IA").should("be.visible");
    cy.visitFr("/rejet");
    cy.contains("h1", "Points à vérifier").should("be.visible");
    cy.visitFr("/rejection");
    cy.contains("h1", "Points à vérifier").should("be.visible");
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
    cy.get('.studio-sequence-stage > [data-sequence-scene="prevent"] .studio-prevent-outcome').should("be.visible");
    cy.get('.studio-sequence-stage > [data-sequence-scene="prevent"] .studio-prevent-marker').should("have.length", 4).each(($marker) => cy.wrap($marker).should("have.css", "visibility", "visible").and("have.css", "opacity", "1"));
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
