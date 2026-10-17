const INVITE_TOKEN = "abcdefghijklmnopqrstuvwxyz012345";

describe("workspace invitation", () => {
  it("shows the site frame and explains malformed links in both languages", () => {
    cy.visitFr("/invite/invalid");
    cy.get("header").should("be.visible");
    cy.get("footer").should("exist");
    cy.get("h1").should("have.length", 1).and("contain", "Rejoindre l’équipe");
    cy.get('[data-testid="invite-error"]').should("have.attr", "role", "alert").and("contain", "lien d’invitation est invalide");
    cy.get('[data-testid="invite-accept"]').should("not.exist");

    cy.visitEn("/en/invite/invalid");
    cy.get("h1").should("have.length", 1).and("contain", "Join the team");
    cy.get('[data-testid="invite-error"]').should("have.attr", "role", "alert").and("contain", "invitation link is invalid");
  });

  it("preserves the invitation after signing in and explains expired links", () => {
    cy.intercept("POST", "**/api/workspace/invitations/accept", { statusCode: 410, body: { error: "INVITE_EXPIRED" } }).as("acceptInvite");
    cy.visitFr(`/invite/${INVITE_TOKEN}`);
    cy.get('[data-testid="invite-login"]').should("have.attr", "href", `/login?next=${encodeURIComponent(`/invite/${INVITE_TOKEN}`)}`);
    cy.get('[data-testid="invite-accept"]').click();
    cy.wait("@acceptInvite");
    cy.get('[data-testid="invite-error"]').should("have.attr", "role", "alert").and("contain", "Demandez un nouveau lien");
  });

  it("shows network errors and allows retrying", () => {
    cy.intercept("POST", "**/api/workspace/invitations/accept", { forceNetworkError: true }).as("acceptInvite");
    cy.visitEn(`/en/invite/${INVITE_TOKEN}`);
    cy.get('[data-testid="invite-accept"]').click();
    cy.wait("@acceptInvite");
    cy.get('[data-testid="invite-error"]').should("have.attr", "role", "alert").and("contain", "Check your connection");
    cy.get('[data-testid="invite-accept"]').should("not.be.disabled");

    cy.intercept("POST", "**/api/workspace/invitations/accept", { statusCode: 200, body: { accepted: true } }).as("retryInvite");
    cy.get('[data-testid="invite-accept"]').click();
    cy.wait("@retryInvite");
    cy.get('[data-testid="invite-error"]').should("not.exist");
    cy.get('[data-testid="invite-success"]').should("have.attr", "role", "status").and("contain", "Invitation accepted");
    cy.get('main a[href="/en/account"]').should("contain", "Open Studio");
  });

  it("translates authentication and email mismatch responses", () => {
    cy.intercept("POST", "**/api/workspace/invitations/accept", { statusCode: 401, body: { error: "AUTH_REQUIRED" } }).as("acceptInvite");
    cy.visitFr(`/invite/${INVITE_TOKEN}`);
    cy.get('[data-testid="invite-accept"]').click();
    cy.wait("@acceptInvite");
    cy.get('[data-testid="invite-error"]').should("contain", "Connectez-vous avec l’adresse invitée").and("not.contain", "AUTH_REQUIRED");

    cy.intercept("POST", "**/api/workspace/invitations/accept", { statusCode: 403, body: { error: "EMAIL_MISMATCH" } }).as("mismatch");
    cy.get('[data-testid="invite-accept"]').click();
    cy.wait("@mismatch");
    cy.get('[data-testid="invite-error"]').should("contain", "destinée à une autre adresse e-mail");
  });
});
