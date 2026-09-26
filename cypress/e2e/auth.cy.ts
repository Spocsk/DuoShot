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

describe("auth recovery", () => {
  it("shows an explicit error after an invalid callback", () => {
    cy.visitFr("/login?auth_error=invalid_link");
    cy.get('[data-testid="auth-message"]').should("contain", "invalide ou a expiré");
  });

  it("sends recovery with the localized callback destination", () => {
    cy.intercept("POST", "**/auth/v1/recover*", { statusCode: 200, body: {} }).as("recover");
    cy.visitEn("/en/forgot-password");
    cy.get("#recovery-email").type("e2e@duoshot.test");
    cy.contains("button", "Send recovery link").click();
    cy.wait("@recover").then(({ request }) => {
      const redirect = new URL(request.url).searchParams.get("redirect_to");
      expect(redirect).to.eq(`${Cypress.config("baseUrl")}/auth/callback?next=%2Fen%2Freset-password`);
    });
    cy.get('[role="status"]').should("contain", "If an account matches");
  });

  it("validates confirmation and updates the authenticated user's password", () => {
    cy.loginAs();
    cy.intercept("PUT", "**/auth/v1/user*", { statusCode: 200, body: { id: "00000000-0000-4000-8000-000000000001", email: "e2e@duoshot.test", user_metadata: {}, app_metadata: {} } }).as("updatePassword");
    cy.visitFr("/reset-password");
    cy.get("#new-password").type("New-password-123");
    cy.get("#confirm-password").type("Different-password");
    cy.contains("button", "Enregistrer").click();
    cy.get('[role="alert"]').should("contain", "ne correspondent pas");
    cy.get("#confirm-password").clear().type("New-password-123");
    cy.contains("button", "Enregistrer").click();
    cy.wait("@updatePassword").its("request.body.password").should("eq", "New-password-123");
    cy.get('[role="status"]').should("contain", "a été modifié");
  });
});
