describe("tool guest", () => {
  it("previews uploads and warns on incomplete sets", () => {
    cy.visitFr("/tool");
    cy.dropScreens();
    cy.get('[data-testid="preview-outer"] img').should("exist");
    cy.get('[data-testid="warn-too-few"]').should("be.visible");
    cy.get('[data-testid="warn-clone"]').should("be.visible");
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

  it("asks for an account when downloading a ZIP", () => {
    cy.visitFr("/tool");
    cy.dropScreens();
    cy.get('[data-testid="tool-download"]').click();
    cy.get('[data-testid="auth-form"]').should("be.visible");
  });

  it("opens the 6.9 paywall for guests", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-sets"][data-ready="true"]');
    cy.get('[data-testid="toggle-69"]').click();
    cy.get('[data-testid="paywall"]').should("contain", "6,9");
  });

  it("opens the auth modal from ?upgrade=1", () => {
    cy.visitFr("/tool?upgrade=1");
    cy.get('[data-testid="auth-form"]').should("be.visible");
  });
});
