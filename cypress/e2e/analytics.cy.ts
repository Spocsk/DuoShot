describe("analytics consent in the browser", () => {
  it("records the DataFast choice, sends nothing after refusal and never contacts Mixpanel", () => {
    // The DataFast SDK disables itself on localhost, so delivery is checked in its dashboard,
    // not here. This test covers the consent state and the absence of any other provider.
    const datafast: string[] = [];
    const mixpanel: string[] = [];
    cy.intercept("POST", "/api/datafast/events", (req) => {
      datafast.push(req.url);
      req.reply({ statusCode: 200, body: { ok: true } });
    });
    cy.intercept(/mixpanel/i, (req) => {
      mixpanel.push(req.url);
      req.reply({ statusCode: 204 });
    });
    cy.visitFr("/tool", { onBeforeLoad(win) {
      win.localStorage.removeItem("duoshot_analytics_choice_v1");
      win.localStorage.removeItem("duoshot_analytics_choice_v2");
    } });
    cy.get('[data-testid="tool-sets"][data-ready="true"]');
    cy.then(() => expect(datafast).to.have.length(0));
    cy.get('[role="dialog"][aria-label="Préférences statistiques"]').should("contain.text", "Datafast").and("not.contain.text", "Mixpanel");
    cy.contains("button", "Accepter").click();
    cy.window().its("localStorage").invoke("getItem", "duoshot_analytics_choice_v2").should("eq", "accepted");
    cy.getCookie("duoshot_analytics_choice_v2").its("value").should("eq", "accepted");
    cy.contains("button", "Préférences statistiques").click();
    cy.contains("button", "Refuser").click();
    cy.contains("Mesure des parcours").should("not.exist");
    cy.window().its("localStorage").invoke("getItem", "duoshot_analytics_choice_v2").should("eq", "rejected");
    cy.getCookie("duoshot_analytics_choice_v2").its("value").should("eq", "rejected");
    cy.then(() => { datafast.length = 0; });
    cy.get('header [data-testid="nav-specs"]').click();
    cy.location("pathname").should("eq", "/specs");
    cy.then(() => {
      expect(datafast).to.have.length(0);
      expect(mixpanel).to.have.length(0);
    });
  });
});
