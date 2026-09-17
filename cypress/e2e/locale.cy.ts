describe("locale", () => {
  it("keeps French when the locale cookie is set", () => {
    cy.visitFr("/");
    cy.location("pathname").should("eq", "/");
    cy.contains("h1", "ZIP anti-rejet.").should("be.visible");
    cy.getCookie("duoshot_locale").should("have.property", "value", "fr");
  });

  it("switches to English and persists the cookie", () => {
    cy.visitFr("/");
    cy.get("header [data-testid=\"locale-switch\"]").should("have.attr", "href", "/en").click();
    cy.location("pathname").should("eq", "/en");
    cy.contains("h1", "Anti-rejection ZIP.").should("be.visible");
    cy.getCookie("duoshot_locale").should("have.property", "value", "en");
  });

  it("switches back to French from English", () => {
    cy.visitEn("/en");
    cy.get("header [data-testid=\"locale-switch\"]").should("have.attr", "href", "/");
    cy.setCookie("duoshot_locale", "fr", { path: "/" });
    cy.get("header [data-testid=\"locale-switch\"]").click();
    cy.location("pathname").should("eq", "/");
    cy.contains("h1", "ZIP anti-rejet.").should("be.visible");
    cy.getCookie("duoshot_locale").should("have.property", "value", "fr");
  });
});
