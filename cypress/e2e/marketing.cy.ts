describe("marketing", () => {
  it("renders the French home, pricing, and primary CTAs", () => {
    cy.visitFr("/");
    cy.contains("h1", "ZIP anti-rejet.").should("be.visible");
    cy.contains("Pour les indés iOS et les studios qui livrent leurs listings.").should("be.visible");
    cy.get('[data-testid="cta-tool"]').should("have.attr", "href", "/tool");
    cy.get('[data-testid="cta-example"]').should("have.attr", "href").and("include", "/api/example-zip");
    cy.get('[data-testid="zip-tree"]').should("contain", "exampleapp/duo-outer-portrait/03.png");
    cy.get('[data-testid="zip-tree"]').should("contain", "exampleapp/duo-inner-portrait/03.png");
    cy.get('[data-testid="zip-tree"]').should("not.contain", "duo-inner-landscape");
    cy.contains("Listing exemple — ce n’est pas le produit.").should("be.visible");
    cy.contains("3 sièges").should("be.visible");
    cy.contains("Same set").should("not.exist");
    cy.get('[data-testid="cta-review-demo"]').should("have.attr", "href", "/r/harbor");
    cy.get('[data-testid="trust-line"]').should("be.visible");
    cy.get('[data-testid="pricing"]').scrollIntoView().should("be.visible");
    cy.get('[data-testid="pricing-cta-indie_launch"]').should("be.visible");
    cy.get('[data-testid="pricing-cta-indie_monthly"]').should("be.visible");
    cy.get('[data-testid="pricing-cta-studio_monthly"]').should("be.visible");
  });

  it("renders the English home", () => {
    cy.visitEn("/en");
    cy.contains("h1", "Anti-rejection ZIP.").should("be.visible");
    cy.get('[data-testid="cta-tool"]').should("have.attr", "href", "/en/tool");
    cy.contains("Example listing — not the product.").should("be.visible");
    cy.get('[data-testid="cta-review-demo"]').should("have.attr", "href", "/en/r/harbor");
  });

  it("serves a dedicated pricing page", () => {
    cy.visitFr("/pricing");
    cy.contains("h1", "Essai, Launch, Indie, Studio.").should("be.visible");
    cy.get('[data-testid="pricing-cta-trial"]').should("have.attr", "href", "/signup");
    cy.get('[data-testid="pricing-cta-indie_launch"]').should("be.visible");
    cy.get('[data-testid="pricing-review-demo"]').should("have.attr", "href", "/r/harbor");
    cy.contains("3 sièges").should("be.visible");
    cy.visitEn("/en/pricing");
    cy.contains("h1", "Trial, Launch, Indie, Studio.").should("be.visible");
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
    cy.contains("h1", "Décodeur de rejet").should("be.visible");
    cy.visitFr("/rejection");
    cy.contains("h1", "Décodeur de rejet").should("be.visible");
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
