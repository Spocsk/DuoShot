describe("tool export", () => {
  it("uploads and exposes the ZIP once the API succeeds", () => {
    cy.loginAs("free");
    cy.intercept("POST", "**/api/export", { url: "https://cdn.example/duoshot.zip" }).as("export");
    cy.visitFr("/tool");
    cy.wait("@billing");
    cy.dropScreens({
      outer: "cypress/fixtures/outer.png",
      inner: "cypress/fixtures/inner.png",
    });
    cy.get('[data-testid="tool-download"]').click();
    cy.wait("@export");
    cy.get('[data-testid="tool-status"]').should("contain", "ZIP prêt");
    cy.get('[data-testid="tool-zip-link"]').should("have.attr", "href", "https://cdn.example/duoshot.zip");
  });

  it("opens the trial paywall when free exports are exhausted", () => {
    cy.loginAs("free", 0);
    cy.intercept("POST", "**/api/export", { statusCode: 402, body: { error: "TRIAL_EXHAUSTED" } }).as("trial");
    cy.visitFr("/tool");
    cy.wait("@billing");
    cy.dropScreens({
      outer: "cypress/fixtures/outer.png",
      inner: "cypress/fixtures/inner.png",
    });
    cy.get('[data-testid="tool-download"]').click();
    cy.get('[data-testid="paywall"]').should("contain", "2 sets gratuits");
  });

  it("blocks clone risk then allows export after assume", () => {
    cy.loginAs("free");
    cy.intercept("POST", "**/api/export", { statusCode: 403, body: { error: "CLONE_RISK" } }).as("cloneRisk");
    cy.visitFr("/tool");
    cy.wait("@billing");
    cy.dropScreens();
    cy.get('[data-testid="toggle-same-set"]').click();
    cy.get('[data-testid="toggle-assume-clone"]').click();
    cy.get('[data-testid="tool-download"]').click();
    cy.wait("@cloneRisk");
    cy.get('[data-testid="tool-status"]').should("contain", "Risque 2.3.3");
    cy.intercept("POST", "**/api/export", { url: "https://cdn.example/duoshot.zip" }).as("exportOk");
    cy.get('[data-testid="tool-download"]').click();
    cy.wait("@exportOk");
    cy.get('[data-testid="tool-zip-link"]').should("be.visible");
  });

  it("sends the set orientation to export", () => {
    cy.loginAs("free");
    cy.intercept("POST", "**/api/export", (req) => {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      expect(body.options.orientation).to.eq("landscape");
      req.reply({ url: "https://cdn.example/duoshot.zip" });
    }).as("export");
    cy.visitFr("/tool");
    cy.wait("@billing");
    cy.get('[data-seg="landscape"]').click();
    cy.get('[data-testid="preview-outer"]').should("contain", "2034×1398");
    cy.get('[data-testid="preview-inner"]').should("contain", "2853×2007");
    cy.dropScreens({
      outer: "cypress/fixtures/outer.png",
      inner: "cypress/fixtures/inner.png",
    });
    cy.get('[data-testid="tool-download"]').click();
    cy.wait("@export");
    cy.get('[data-testid="tool-status"]').should("contain", "ZIP prêt");
  });
});
