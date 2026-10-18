describe("analytics consent in the browser", () => {
  it("saves the Umami choice and sends nothing before consent or after refusal", () => {
    const sends: string[] = [];
    const scripts: string[] = [];
    const mixpanel: string[] = [];
    // Local fake tracker: production Umami filters data-domains, and CI is offline.
    cy.intercept("GET", "/u/script.js", (req) => {
      scripts.push(req.url);
      req.reply({ statusCode: 200, headers: { "content-type": "application/javascript" }, body: `
        (() => {
          const script = document.currentScript;
          const send = (type, payload) => fetch(script.dataset.hostUrl + '/api/send', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: script.dataset.fetchCredentials || 'omit',
            body: JSON.stringify({ type, payload })
          });
          const defaults = () => ({ website: script.dataset.websiteId, hostname: 'duoshot.site',
            url: location.pathname, referrer: document.referrer, title: document.title,
            screen: '1920x1080', language: navigator.language });
          window.umami = {
            track: callback => send('event', callback(defaults())),
            identify: data => send('identify', { ...defaults(), data })
          };
        })();
      ` });
    });
    cy.intercept("POST", "/api/umami/api/send", (req) => {
      sends.push(req.url);
      req.reply({ statusCode: 200, body: { ok: true } });
    }).as("umamiSend");
    cy.intercept(/mixpanel/i, (req) => { mixpanel.push(req.url); req.reply({ statusCode: 204 }); });
    cy.visitFr("/tool", { onBeforeLoad(win) {
      win.localStorage.removeItem("duoshot_analytics_choice_v1");
      win.localStorage.removeItem("duoshot_analytics_choice_v2");
    } });
    cy.get('[data-testid="tool-sets"][data-ready="true"]');
    cy.then(() => { expect(sends).to.have.length(0); expect(scripts).to.have.length(0); });
    cy.get('[role="dialog"][aria-label="Préférences statistiques"]').should("contain.text", "Umami").and("not.contain.text", "Mixpanel");
    cy.get("body").invoke("text").should("not.match", /data[f]ast/i);
    cy.contains("button", "Accepter").click();
    cy.wait("@umamiSend").its("request.body.type").should("eq", "identify");
    cy.wait("@umamiSend").its("request.body.payload.url").should("eq", "/tool");
    cy.window().its("localStorage").invoke("getItem", "duoshot_analytics_choice_v2").should("eq", "accepted");
    cy.getCookie("duoshot_analytics_choice_v2").its("value").should("eq", "accepted");
    cy.then(() => { expect(scripts).to.have.length(1); expect(sends.length).to.be.greaterThan(0); });
    cy.contains("button", "Préférences statistiques").click();
    cy.contains("button", "Refuser").click();
    cy.contains("Mesure des parcours").should("not.exist");
    cy.window().its("localStorage").invoke("getItem", "duoshot_analytics_choice_v2").should("eq", "rejected");
    cy.window().its("localStorage").invoke("getItem", "umami.disabled").should("eq", "1");
    cy.getCookie("duoshot_analytics_choice_v2").its("value").should("eq", "rejected");
    cy.then(() => { sends.length = 0; });
    cy.get('header [data-testid="nav-specs"]').click();
    cy.location("pathname").should("eq", "/specs");
    cy.then(() => { expect(sends).to.have.length(0); expect(mixpanel).to.have.length(0); });
  });
});
