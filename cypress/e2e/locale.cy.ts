describe("locale", () => {
  it("keeps French when the locale cookie is set", () => {
    cy.visitFr("/");
    cy.location("pathname").should("eq", "/");
    cy.contains("h1", "Deux écrans.").should("be.visible");
    cy.getCookie("duoshot_locale_manual").should("have.property", "value", "fr");
  });

  it("switches to English and persists the cookie", () => {
    cy.visitFr("/");
    cy.get("header [data-testid=\"locale-switch\"]").click();
    cy.location("pathname").should("eq", "/en");
    cy.contains("h1", "Two screens.").should("be.visible");
    cy.getCookie("duoshot_locale_manual").should("have.property", "value", "en");
    cy.get("header [data-testid=\"locale-switch\"]").click();
    cy.location("pathname").should("eq", "/");
    cy.getCookie("duoshot_locale_manual").should("have.property", "value", "fr");
  });
});


describe("browser language detection", () => {
  it("follows browser preferences both ways, ignoring the legacy automatic cookie", () => {
    cy.setCookie("duoshot_locale", "en");
    cy.request({ url: "/en?campaign=demo", headers: { "Accept-Language": "fr-FR" }, followRedirect: false }).then((response) => {
      expect(response.status).to.eq(307);
      expect(response.headers.location).to.match(/\/\?campaign=demo$/);
      expect(response.headers["set-cookie"]).to.be.undefined;
    });
    cy.request({ url: "/?campaign=demo", headers: { "Accept-Language": "de-DE" }, followRedirect: false }).then((response) => {
      expect(response.status).to.eq(307);
      expect(response.headers.location).to.match(/\/en\?campaign=demo$/);
    });
  });

  it("does not redirect crawlers or sitemap requests", () => {
    cy.request({ url: "/", headers: { "Accept-Language": "en", "User-Agent": "Googlebot" }, followRedirect: false }).its("status").should("eq", 200);
    cy.request({ url: "/sitemap.xml", headers: { "Accept-Language": "en" }, followRedirect: false }).its("status").should("eq", 200);
  });
});
