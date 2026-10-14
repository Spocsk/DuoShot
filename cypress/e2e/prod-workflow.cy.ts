describe("prod workflow", () => {
  it("lets a stranger go from home to example ZIP to dual drop to trial export", () => {
    cy.visitFr("/");
    cy.get('[data-testid="zip-tree"]').should("contain", "duo-outer-portrait").and("contain", "duo-inner-portrait");
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
    cy.get('[data-testid="preview-outer"]').should("contain", "Importer");
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
    cy.get('[data-testid="tool-tab-review"]').click();
    cy.get('[data-testid="clone-badges"] [data-testid="clone-badge-0"]').should("be.visible");
    cy.get('[data-testid="clone-badges"] [data-testid="clone-badge-2"]').should("be.visible");
    // Portrait open screen: the fold is a horizontal band across the middle height (device turned a quarter turn).
    cy.get('[data-testid="preview-inner"] .division').should("not.be.visible");
    cy.get('[data-testid="tool-tab-adjust"]').click();
    cy.get("details.tool-advanced > summary").click();
    cy.get('[data-testid="toggle-hinge"]').click();
    cy.get('[data-testid="preview-inner"] .division').should("be.visible").then(($band) => {
      const band = $band[0]!.getBoundingClientRect();
      const frame = $band[0]!.parentElement!.getBoundingClientRect();
      expect(band.width).to.be.greaterThan(band.height);
      expect(Math.abs(band.top + band.height / 2 - (frame.top + frame.height / 2))).to.be.lessThan(2);
    });
    // The account offer lives in the Check and Export panels.
    cy.get('[data-testid="tool-tab-review"]').click();
    cy.get('[data-testid="tool-create-account"]').should("contain", "2 exports HD");
    cy.get('[data-testid="tool-example"]').should("have.attr", "href").and("include", "/api/example-zip");

    cy.loginAs("free");
    cy.interceptZip("export");
    cy.visitFr("/tool");
    cy.wait("@billing");
    cy.dropScreens({
      outer: "cypress/fixtures/outer.png",
      inner: "cypress/fixtures/inner.png",
    });
    cy.acknowledgeQuality();
    cy.get('[data-testid="tool-download"]').click();
    cy.wait("@export");
    cy.get('[data-testid="tool-zip-link"]').should("have.attr", "href", "https://storage.example/app.zip");

    cy.visitFr("/pricing");
    cy.contains("h1", "Tarifs des captures App Store : essai, Indie, Studio.").should("be.visible");
    cy.contains("3 sièges").should("be.visible");
    cy.contains("Same set").should("not.exist");
    cy.get('[data-testid="pricing-cta-indie_monthly"]').should("be.visible");
  });
});
