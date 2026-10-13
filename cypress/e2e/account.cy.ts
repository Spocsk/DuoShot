describe("account", () => {
  it("redirects guests to login", () => {
    cy.visitFr("/account");
    cy.location("pathname").should("eq", "/login");
    cy.location("search").should("eq", "?next=%2Faccount");
  });

  it("keeps the English account destination when guests sign in", () => {
    cy.visitEn("/en/account");
    cy.location("pathname").should("eq", "/en/login");
    cy.location("search").should("eq", "?next=%2Fen%2Faccount");
  });

  it("shows the plan and intercepts DSAR export and delete", () => {
    cy.loginAs("free");
    cy.intercept("GET", "**/api/account/export", {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { exportedAt: "2026-09-14" },
    }).as("dsar");
    cy.intercept("POST", "**/api/account/delete", { ok: true }).as("erase");
    cy.visitFr("/account");
    cy.get('[data-testid="account-plan"]').should("contain", "Essai gratuit");
    cy.get('[data-testid="account-email"]').should("contain", "e2e@duoshot.test");
    cy.get('[data-testid="account-export"]').click();
    cy.wait("@dsar");
    cy.get('[data-testid="account-delete"]').click();
    cy.get('[role="dialog"]').should("have.attr", "aria-modal", "true");
    cy.get("h1").should("have.length", 1);
    cy.get('[data-testid="account-delete-confirm"]').click();
    cy.wait("@erase");
  });

  it("can cancel deletion and keeps failed deletion feedback inside the dialog", () => {
    cy.loginAs();
    cy.intercept("POST", "**/api/account/delete", { forceNetworkError: true }).as("erase");
    cy.visitFr("/account");
    cy.get('[data-testid="account-delete"]').click();
    cy.contains('[role="dialog"] button', "Conserver mon compte").click();
    cy.get('[role="dialog"]').should("not.exist");
    cy.get("@erase.all").should("have.length", 0);
    cy.get('[data-testid="account-delete"]').click();
    cy.get('[data-testid="account-delete-confirm"]').click();
    cy.wait("@erase");
    cy.get('[role="dialog"] [role="alert"]').should("contain", "Suppression incomplète");
    cy.get('[data-testid="account-delete-confirm"]').should("not.be.disabled");
  });

  for (const locale of ["fr", "en"] as const) {
    it(`shows JSON export loading and errors in ${locale}`, () => {
      cy.loginAs("indie");
      cy.intercept("GET", "**/api/account/export", { statusCode: 503, delay: 400, body: { error: "EXPORT_FAILED" } }).as("dsar");
      if (locale === "fr") cy.visitFr("/account");
      else cy.visitEn("/en/account");
      cy.get('[data-testid="account-open-tool"]').should("have.attr", "href", locale === "fr" ? "/tool" : "/en/tool");
      cy.get('[data-testid="account-export"]').click().should("be.disabled").and("have.attr", "aria-busy", "true");
      cy.wait("@dsar");
      cy.get('[data-testid="account-message"]').should("contain", locale === "fr" ? "Impossible d’exporter vos données" : "Could not export your data");
      cy.get('[data-testid="account-export"]').should("not.be.disabled");
    });

    it(`translates Studio roles and review statuses in ${locale}`, () => {
      cy.loginAs("studio");
      cy.intercept("GET", "**/api/reviews", { reviews: [{ public_id: "review-1", set_name: "Harbor", status: "changes_requested", expiresAt: null }] });
      cy.intercept("GET", "**/api/workspace/invitations", { invitations: [{ id: "invite-1", email: "guest@example.com", accepted_at: "2026-10-13T00:00:00Z" }] });
      cy.intercept("GET", "**/api/workspace/members", { members: [{ id: "owner-1", email: "owner@example.com", role: "owner" }, { id: "member-1", email: "member@example.com", role: "member" }] });
      if (locale === "fr") cy.visitFr("/account");
      else cy.visitEn("/en/account");
      cy.get('[data-testid="studio-members"]').should("contain", locale === "fr" ? "Propriétaire" : "Owner").and("contain", locale === "fr" ? "Membre" : "Member");
      cy.get('[data-testid="studio-workspace"]').should("contain", locale === "fr" ? "Modifications demandées" : "Changes requested").and("contain", locale === "fr" ? "Acceptée" : "Accepted");
      cy.contains('[data-testid="studio-workspace"] label span', locale === "fr" ? "E-mail du membre" : "Member email").should("be.visible").and("not.have.class", "sr-only");
    });
  }

  it("surfaces Studio network failures and can retry loading", () => {
    cy.loginAs("studio");
    cy.intercept("GET", "**/api/reviews", { forceNetworkError: true }).as("reviews");
    cy.intercept("GET", "**/api/workspace/invitations", { invitations: [] });
    cy.intercept("GET", "**/api/workspace/members", { members: [{ id: "member-1", email: "member@example.com", role: "member" }] });
    cy.visitFr("/account");
    cy.get('[data-testid="studio-workspace"] [role="alert"]').should("contain", "Impossible de charger");
    cy.intercept("GET", "**/api/reviews", { reviews: [] });
    cy.contains('[data-testid="studio-workspace"] button', "Réessayer").click();
    cy.get('[data-testid="studio-members"]').should("contain", "Membre");
    cy.intercept("POST", "**/api/workspace/invitations", { forceNetworkError: true }).as("invite");
    cy.get('[data-testid="studio-workspace"] input[type="email"]').type("invite@example.com");
    cy.contains('[data-testid="studio-workspace"] button', "Inviter").click();
    cy.wait("@invite");
    cy.get('[data-testid="studio-workspace"] [role="alert"]').should("contain", "Invitation impossible");
    cy.intercept("DELETE", "**/api/workspace/members/member-1", { statusCode: 500, body: { error: "MEMBER_DELETE_FAILED" } }).as("removeMember");
    cy.contains('[data-testid="studio-members"] button', "Retirer").click();
    cy.wait("@removeMember");
    cy.get('[data-testid="studio-workspace"] [role="alert"]').should("contain", "La modification n’a pas pu être enregistrée");
  });

  it("translates billing service errors", () => {
    cy.loginAs("indie");
    cy.intercept("GET", "**/api/billing/status", { plan: "indie", hasBillingCustomer: true });
    cy.intercept("POST", "**/api/stripe/portal", { statusCode: 403, body: { error: "BILLING_OWNER_REQUIRED" } }).as("portal");
    cy.visitFr("/account");
    cy.get('[data-testid="account-manage-billing"]').click();
    cy.wait("@portal");
    cy.get('[data-testid="account-message"]').should("contain", "Le propriétaire de l’espace doit gérer l’abonnement").and("not.contain", "BILLING_OWNER_REQUIRED");
  });
});
