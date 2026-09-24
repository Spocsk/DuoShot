describe("locale", () => {
  it("keeps French when the locale cookie is set", () => {
    cy.visitFr("/");
    cy.location("pathname").should("eq", "/");
    cy.contains("h1", "Deux écrans.").should("be.visible");
    cy.getCookie("duoshot_locale").should("have.property", "value", "fr");
  });

  it("switches to English and persists the cookie", () => {
    cy.visitFr("/");
    cy.get("header [data-testid=\"locale-switch\"]").click();
    cy.location("pathname").should("eq", "/en");
    cy.contains("h1", "Two screens.").should("be.visible");
    cy.getCookie("duoshot_locale").should("have.property", "value", "en");
    cy.get("header [data-testid=\"locale-switch\"]").click();
    cy.location("pathname").should("eq", "/");
    cy.getCookie("duoshot_locale").should("have.property", "value", "fr");
  });
});
