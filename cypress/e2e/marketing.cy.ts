describe("marketing", () => {
  it("keeps the closed/open example and CTA readable on mobile", () => {
    cy.viewport(390, 844);
    cy.visitFr("/");
    cy.contains("h1", "Deux écrans.").should("be.visible");
    cy.get('[data-testid="cta-tool"]').should("be.visible");
    cy.get(".studio-sequence-inspection").should("not.be.visible");
    cy.get('[data-testid="zip-tree"]').scrollIntoView().should("be.visible");
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
    cy.contains("Démo Harbor").should("be.visible");
    cy.contains("3 sièges").should("be.visible");
    cy.contains("Same set").should("not.exist");
    cy.get('[data-testid="cta-review-demo"]').should("have.attr", "href", "/r/harbor");
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
    it(`keeps the inspection labels inside their frame in ${locale}`, () => {
      cy.viewport(1397, 920);
      if (locale === "fr") cy.visitFr(path);
      else cy.visitEn(path);
      cy.get(".studio-sequence-step").eq(1).scrollIntoView();
      cy.get(".studio-sequence-inspection").then(($frame) => {
        const frame = $frame[0].getBoundingClientRect();
        const top = $frame[0].querySelector(".studio-sequence-inspection-label")!.getBoundingClientRect();
        const bottom = $frame[0].querySelector(".studio-sequence-inspection-detail")!.getBoundingClientRect();
        expect(top.top).to.be.greaterThan(frame.top);
        expect(top.bottom).to.be.lessThan(frame.bottom);
        expect(bottom.top).to.be.greaterThan(frame.top);
        expect(bottom.bottom).to.be.lessThan(frame.bottom);
        expect(top.right).to.be.lessThan(frame.right);
        expect(bottom.right).to.be.lessThan(frame.right);
        const devices = $frame[0].parentElement!.querySelector(".duo-cluster")!.getBoundingClientRect();
        expect(top.bottom).to.be.lessThan(devices.top);
        expect(bottom.top).to.be.greaterThan(devices.bottom);
      });
    });
  }

  it("renders the English home", () => {
    cy.visitEn("/en");
    cy.contains("h1", "Two screens.").should("be.visible");
    cy.get('[data-testid="cta-tool"]').should("have.attr", "href", "/en/tool");
    cy.contains("Harbor demo").should("be.visible");
    cy.get('[data-testid="cta-review-demo"]').should("have.attr", "href", "/en/r/harbor");
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
      expect(response.body).to.include("Disallow: /tool");
      expect(response.body).to.include("Disallow: /account");
      expect(response.body).to.include("Disallow: /r/");
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
