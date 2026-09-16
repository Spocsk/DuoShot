describe("checkout", () => {
  it("sends guests from pricing to the tool upgrade modal", () => {
    cy.visitFr("/");
    cy.get('[data-testid="pricing-cta-indie_monthly"]').click();
    cy.location("pathname").should("eq", "/tool");
    cy.location("search").should("include", "upgrade=1");
    cy.get('[data-testid="auth-form"]').should("be.visible");
  });

  it("shows mock, success, and cancel return messages", () => {
    cy.visitFr("/tool?checkout=mock");
    cy.get('[data-testid="tool-status"]').should("contain", "Checkout mock");
    cy.visitFr("/tool?checkout=success");
    cy.get('[data-testid="tool-status"]').should("contain", "Abonnement actif");
    cy.visitFr("/tool?checkout=cancel");
    cy.get('[data-testid="tool-status"]').should("contain", "Paiement annulé");
  });

  it("opens the paywall for a signed-in upgrade query", () => {
    cy.loginAs("free");
    cy.visitFr("/tool?upgrade=1");
    cy.get('[data-testid="paywall"]').should("be.visible");
  });

  it("starts a mock checkout from the 6.9 paywall", () => {
    cy.loginAs("free");
    cy.intercept("POST", "**/api/stripe/checkout", { url: "/tool?checkout=mock" }).as("checkout");
    cy.visitFr("/tool");
    cy.contains("summary", "Réglages avancés").click();
    cy.get('[data-testid="toggle-69"]').click();
    cy.get('[data-testid="paywall-cta-indie"]').click();
    cy.wait("@checkout");
    cy.location("search").should("include", "checkout=mock");
    cy.get('[data-testid="tool-status"]').should("contain", "Checkout mock");
  });
});
