describe("account", () => {
  it("redirects guests to login", () => {
    cy.visitFr("/account");
    cy.location("pathname").should("eq", "/login");
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
    cy.get('[data-testid="account-plan"]').should("contain", "Essai");
    cy.get('[data-testid="account-email"]').should("contain", "e2e@duoshot.test");
    cy.get('[data-testid="account-export"]').click();
    cy.wait("@dsar");
    cy.on("window:confirm", () => true);
    cy.get('[data-testid="account-delete"]').click();
    cy.wait("@erase");
  });
});
