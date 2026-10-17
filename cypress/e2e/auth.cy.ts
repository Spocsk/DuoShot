describe("auth", () => {
  for (const locale of ["fr", "en"] as const) {
    for (const route of ["/login", "/signup", "/tool?upgrade=1"]) {
      it(`renders translated auth labels in ${locale} on ${route}`, () => {
        if (locale === "fr") cy.visitFr(route);
        else cy.visitEn(`/en${route}`);
        cy.get('[data-testid="auth-form"]').should("be.visible");
        cy.get('[data-testid="auth-google"]').should("have.text", locale === "fr" ? "Continuer avec Google" : "Continue with Google");
        cy.get('label[for="auth-email"]').should("have.text", locale === "fr" ? "E-mail" : "Email");
        cy.get('label[for="auth-password"]').should("have.text", locale === "fr" ? "Mot de passe" : "Password");
        cy.get('[data-testid="auth-magic"]').should("have.text", locale === "fr" ? "Lien magique" : "Magic link");
        cy.get("h1").should("have.length", 1);
        if (route.startsWith("/tool")) cy.get('h2[data-testid="auth-form"]').should("exist");
      });
    }
  }

  it("requires accepting the policies on signup", () => {
    cy.visitFr("/signup");
    cy.get('[data-testid="auth-form"]').should("be.visible");
    cy.get('[data-testid="auth-privacy"]').should("have.length", 1);
    cy.get('[data-testid="auth-email"]').type("e2e@duoshot.test");
    cy.get('[data-testid="auth-password"]').type("password12");
    cy.get('[data-testid="auth-submit"]').click();
    cy.get('[data-testid="auth-message"]').should("contain", "Acceptez les conditions");
  });

  it("requires the same single consent before Google or magic-link signup", () => {
    cy.intercept("POST", "**/api/auth/oauth-check", { ok: false }).as("oauthCheck");
    cy.intercept("POST", "**/auth/v1/otp*", { statusCode: 200, body: {} }).as("otp");
    cy.visitEn("/en/signup");
    cy.get('[data-testid="auth-privacy"]').should("have.length", 1);
    cy.get('[data-testid="auth-google"]').click();
    cy.get('[role="alert"]').should("contain", "Please accept the terms and privacy policy");
    cy.get("@oauthCheck.all").should("have.length", 0);
    cy.get('[data-testid="auth-email"]').type("e2e@duoshot.test");
    cy.get('[data-testid="auth-magic"]').click();
    cy.get("@otp.all").should("have.length", 0);
    cy.get('[data-testid="auth-privacy"]').check({ force: true });
    cy.get('[data-testid="auth-magic"]').click();
    cy.wait("@otp").its("request.body.create_user").should("eq", true);
    cy.get('[data-testid="auth-message"]').should("contain", "Magic link sent");
  });

  for (const locale of ["fr", "en"] as const) {
    it(`allows existing short passwords and translates Supabase errors in ${locale}`, () => {
      cy.intercept("POST", "**/auth/v1/token*", { statusCode: 400, body: { code: "invalid_credentials", msg: "Invalid login credentials" } }).as("login");
      if (locale === "fr") cy.visitFr("/login");
      else cy.visitEn("/en/login");
      cy.get('[data-testid="auth-password"]').should("not.have.attr", "minlength");
      cy.get('[data-testid="auth-email"]').type("e2e@duoshot.test");
      cy.get('[data-testid="auth-password"]').type("short");
      cy.get('[data-testid="auth-submit"]').click();
      cy.wait("@login");
      cy.get('[role="alert"]').should("contain", locale === "fr" ? "L’adresse e-mail ou le mot de passe est incorrect" : "The email address or password is incorrect").and("not.contain", "Invalid login credentials");
    });
  }

  it("shows a localized error when a magic-link request fails", () => {
    cy.intercept("POST", "**/auth/v1/otp*", { statusCode: 400, body: { code: "over_email_send_rate_limit", msg: "Email rate limit exceeded" } }).as("otp");
    cy.visitFr("/login");
    cy.get('[data-testid="auth-email"]').type("e2e@duoshot.test");
    cy.get('[data-testid="auth-magic"]').click();
    cy.wait("@otp");
    cy.get('[role="alert"]').should("contain", "Trop de tentatives");
    cy.get('[data-testid="auth-magic"]').should("not.be.disabled");
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
