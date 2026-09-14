describe("auth", () => {
  it("requires accepting the policies on signup", () => {
    cy.visitFr("/signup");
    cy.get('[data-testid="auth-form"]').should("be.visible");
    cy.get('[data-testid="auth-email"]').type("e2e@duoshot.test");
    cy.get('[data-testid="auth-password"]').type("password12");
    cy.get('[data-testid="auth-submit"]').click();
    cy.get('[data-testid="auth-message"]').should("contain", "Accepte les conditions");
  });

  it("sends a magic link through GoTrue", () => {
    cy.intercept("POST", "**/auth/v1/otp*", { statusCode: 200, body: {} }).as("otp");
    cy.visitFr("/login");
    cy.get('[data-testid="auth-email"]').type("e2e@duoshot.test");
    cy.get('[data-testid="auth-magic"]').click();
    cy.wait("@otp");
    cy.get('[data-testid="auth-message"]').should("contain", "Lien magique envoyé");
  });

  it("shows a Google error when the provider check fails", () => {
    cy.intercept("POST", "**/api/auth/oauth-check", { ok: false }).as("oauthCheck");
    cy.intercept("POST", "**/auth/v1/authorize*", {
      statusCode: 400,
      body: { error: "unsupported_provider", error_description: "provider is not enabled" },
    });
    cy.visitFr("/login");
    cy.get('[data-testid="auth-google"]').click();
    cy.get('[data-testid="auth-message"]').should("be.visible");
  });
});
