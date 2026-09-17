describe("prod workflow", () => {
  it("lets a stranger go from home to example ZIP to dual drop to trial export", () => {
    cy.visitFr("/");
    cy.contains("1398×2034").should("be.visible");
    cy.contains("2007×2853").should("be.visible");
    cy.get("header [data-testid='nav-tool']").should("be.visible");
    cy.get("header [data-testid='nav-specs']").should("be.visible");
    cy.get("header [data-testid='nav-reject']").should("be.visible");
    cy.get("header [data-testid='nav-pricing']").should("be.visible");
    cy.get('[data-testid="cta-example"]').should("have.attr", "href").and("include", "/api/example-zip");

    cy.request({
      url: "/api/example-zip?v=2",
      encoding: "binary",
      timeout: 60_000,
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(String(response.headers["content-disposition"] ?? "")).to.include("duoshot-example.zip");
    });

    cy.visitFr("/tool");
    cy.get('[data-testid="preview-outer"]').should("contain", "Dépose PNG ou JPEG");
    cy.get('[data-testid="preview-inner"] .division').should("not.be.visible");

    const triple = [
      "cypress/fixtures/outer.png",
      "cypress/fixtures/outer.png",
      "cypress/fixtures/outer.png",
    ];
    const tripleInner = [
      "cypress/fixtures/inner.png",
      "cypress/fixtures/inner.png",
      "cypress/fixtures/inner.png",
    ];
    cy.dropScreens({ outer: triple, inner: tripleInner });
    cy.get('[data-testid="preview-outer"] img').should("exist");
    cy.get('[data-testid="preview-inner"] img').should("exist");
    cy.get('[data-testid="clone-badges"] [data-testid="clone-badge-0"]').should("be.visible");
    cy.get('[data-testid="clone-badges"] [data-testid="clone-badge-2"]').should("be.visible");
    cy.get('[data-testid="preview-inner"] .division').should("be.visible");
    cy.get('[data-testid="tool-create-account"]').should("contain", "2 ZIP HD");
    cy.get('[data-testid="tool-example"]').should("have.attr", "href").and("include", "/api/example-zip");

    cy.loginAs("free");
    cy.interceptZip("export");
    cy.visitFr("/tool");
    cy.wait("@billing");
    cy.dropScreens({
      outer: "cypress/fixtures/outer.png",
      inner: "cypress/fixtures/inner.png",
    });
    cy.unlockExport();
    cy.get('[data-testid="tool-download"]').should("not.be.disabled").click();
    cy.wait("@export");
    cy.get('[data-testid="tool-zip-link"]').should("have.attr", "href").and("match", /^blob:/);

    cy.visitFr("/pricing");
    cy.contains("h1", "Essai, Launch, Indie, Studio.").should("be.visible");
    cy.contains("3 sièges").should("be.visible");
    cy.contains("Same set").should("not.exist");
    cy.get('[data-testid="pricing-cta-indie_launch"]').should("be.visible");
    cy.get('[data-testid="pricing-cta-indie_monthly"]').should("be.visible");
  });
});
