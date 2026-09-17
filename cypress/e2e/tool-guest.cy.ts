describe("tool guest", () => {
  it("shows an honest empty state before any drop", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="preview-outer"]').should("contain", "Dépose PNG ou JPEG");
    cy.get('[data-testid="preview-inner"]').should("contain", "Dépose PNG ou JPEG");
    cy.get('[data-testid="preview-outer"] img').should("not.exist");
    cy.contains("RGB : sRGB").should("not.exist");
    cy.contains("conforme Connect").should("not.exist");
    cy.get('[data-testid="drop-outer"]').should("contain", "1398×2034");
    cy.get('[data-testid="drop-inner"]').should("contain", "2007×2853");
    cy.get('[data-testid="same-set-details"]').should("have.attr", "data-open", "false");
    cy.get('[data-testid="warn-clone"]').should("not.exist");
    cy.get('[data-testid="tool-quota"]').should("contain", "Créer un compte");
    cy.get('[data-testid="tool-quota"]').should("not.contain", "2 essais offerts");
  });

  it("previews uploads and warns on incomplete sets", () => {
    cy.visitFr("/tool");
    cy.dropScreens();
    cy.get('[data-testid="preview-outer"] img').should("exist");
    cy.get('[data-testid="warn-too-few"]').should("be.visible");
    cy.get('[data-testid="warn-clone"]').should("not.exist");
    cy.get('[data-testid="preview-outer-clone"]').should("contain", "dépose les deux");
    cy.get('[data-testid="tool-download"]').should("be.disabled");
  });

  it("warns on clone only when the same-set toggle is on", () => {
    cy.visitFr("/tool");
    cy.dropScreens();
    cy.get('[data-testid="same-set-details"] .t-acc-head').click();
    cy.get('[data-testid="toggle-same-set"]').click();
    cy.get('[data-testid="warn-clone"]').should("be.visible");
    cy.get('[data-testid="same-set-details"]').should("have.attr", "data-open", "true");
    cy.get('[data-testid="preview-outer-clone"]').should("contain", "Risque");
    cy.get('[data-testid="tool-download"]').should("be.disabled");
  });

  it("warns when outer and inner counts differ", () => {
    cy.visitFr("/tool");
    cy.dropScreens({
      outer: "cypress/fixtures/outer.png",
      inner: ["cypress/fixtures/inner.png", "cypress/fixtures/outer.png"],
    });
    cy.get('[data-testid="warn-unpaired"]').should("be.visible");
  });

  it("creates another local set", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-sets"][data-ready="true"]').click();
    cy.get('[data-testid="tool-sets-menu"] [role="option"]').should("have.length", 1);
    cy.get('[data-testid="tool-set-new"]').click();
    cy.get('[data-testid="tool-sets"][data-ready="true"]').click();
    cy.get('[data-testid="tool-sets-menu"] [role="option"]').should("have.length", 2);
  });

  it("asks for an account from the quota pill", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-quota"]').click();
    cy.get('[data-testid="auth-form"]').should("be.visible");
  });

  it("asks for an account when downloading a ZIP", () => {
    cy.visitFr("/tool");
    cy.dropScreens({
      outer: "cypress/fixtures/outer.png",
      inner: "cypress/fixtures/inner.png",
    });
    cy.get('[data-testid="tool-download"]').should("be.disabled");
    cy.get('[data-testid="tool-create-account"]').should("be.visible").click();
    cy.get('[data-testid="auth-form"]').should("be.visible");
  });

  it("opens the 6.9 paywall for guests", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-sets"][data-ready="true"]');
    cy.contains("summary", "Réglages avancés").click();
    cy.get('[data-testid="toggle-69"]').click();
    cy.get('[data-testid="paywall"]').should("contain", "6,9");
  });

  it("opens the auth modal from ?upgrade=1", () => {
    cy.visitFr("/tool?upgrade=1");
    cy.get('[data-testid="auth-form"]').should("be.visible");
  });

  it("shows a filmstrip for 3+3 drops and switches preview", () => {
    cy.visitFr("/tool");
    cy.dropScreens({
      outer: ["cypress/fixtures/outer.png", "cypress/fixtures/outer.png", "cypress/fixtures/outer.png"],
      inner: ["cypress/fixtures/inner.png", "cypress/fixtures/inner.png", "cypress/fixtures/inner.png"],
    });
    cy.get('[data-testid="filmstrip-outer-03"]').should("be.visible");
    cy.get('[data-testid="filmstrip-inner-03"]').should("be.visible");
    cy.get('[data-testid="preview-outer"]').should("have.attr", "data-slide", "0");
    cy.get('[data-testid="filmstrip-outer-03"]').click();
    cy.get('[data-testid="preview-outer"]').should("have.attr", "data-slide", "2");
    cy.get('[data-testid="clone-badge-2"]').should("be.visible").click();
    cy.get('[data-testid="preview-inner"]').should("have.attr", "data-slide", "2");
  });

  it("removes an uploaded image from either filmstrip", () => {
    cy.visitFr("/tool");
    cy.dropScreens({
      outer: ["cypress/fixtures/outer.png", "cypress/fixtures/outer.png", "cypress/fixtures/outer.png"],
      inner: ["cypress/fixtures/inner.png", "cypress/fixtures/inner.png", "cypress/fixtures/inner.png"],
    });

    cy.get('[data-testid="filmstrip-outer-remove-02"]')
      .should("have.attr", "aria-label", "Retirer 02")
      .click();

    cy.get('[data-testid="drop-outer"]').should("have.attr", "data-count", "2");
    cy.get('[data-testid="filmstrip-outer-03"]').should("not.exist");
    cy.get('[data-testid="filmstrip-inner-03"]').should("exist");
    cy.get('[data-testid="warn-unpaired"]').should("be.visible");
  });

  it("removes the shared source from both shelves in same-set mode", () => {
    cy.visitFr("/tool");
    cy.dropScreens({
      outer: ["cypress/fixtures/outer.png", "cypress/fixtures/outer.png", "cypress/fixtures/outer.png"],
    });
    cy.get('[data-testid="same-set-details"] .t-acc-head').click();
    cy.get('[data-testid="toggle-same-set"]').click();
    cy.get('[data-testid="filmstrip-inner-remove-02"]').click();

    cy.get('[data-testid="drop-outer"]').should("have.attr", "data-count", "2");
    cy.get('[data-testid="drop-inner"]').should("have.attr", "data-count", "2");
    cy.get('[data-testid="filmstrip-outer-03"]').should("not.exist");
    cy.get('[data-testid="filmstrip-inner-03"]').should("not.exist");
  });
});
