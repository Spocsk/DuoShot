describe("analytics consent in the browser", () => {
  it("sends to EU only after consent and stops after refusal", () => {
    const tracking: string[] = [];
    cy.intercept("POST", "https://api-eu.mixpanel.com/**", (req) => {
      tracking.push(req.url);
      req.reply({ statusCode: 200, body: { status: 1, error: null } });
    });
    cy.visitFr("/tool", { onBeforeLoad(win) { win.localStorage.removeItem("duoshot_analytics_choice_v1"); } });
    cy.get('[data-testid="tool-sets"][data-ready="true"]');
    cy.get("body").then(($body) => {
      // A build without the public token intentionally has no analytics controls or SDK.
      if (!$body.text().includes("Préférences statistiques")) {
        expect(tracking).to.have.length(0);
        return;
      }
      expect(tracking).to.have.length(0);
      cy.contains("button", "Accepter").click();
      cy.wrap(null).should(() => expect(tracking.some((url) => url.includes("/track"))).to.eq(true));
      cy.contains("button", "Préférences statistiques").click();
      cy.contains("button", "Refuser").click();
      cy.contains("Mesure des parcours").should("not.exist");
      cy.then(() => { tracking.length = 0; });
      cy.get('header [data-testid="nav-specs"]').click();
      cy.location("pathname").should("eq", "/specs");
      cy.then(() => expect(tracking).to.have.length(0));
    });
  });
});
