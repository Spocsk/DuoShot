describe("first-touch attribution", () => {
  for (const kind of ["pass30", "indie_monthly", "indie_yearly", "studio_monthly", "studio_yearly"]) {
    const test = kind === "pass30" && !Cypress.expose("passPriceConfigured") ? it.skip : it;
    test(`keeps the pricing landing through guest signup for ${kind}`, () => {
      // Exercise the browser fallback: no Set-Cookie from the landing response.
      cy.intercept("GET", "**/en/pricing?utm_source=x*", (req) => {
        req.continue((res) => { delete res.headers["set-cookie"]; });
      });
      cy.intercept("GET", "**/api/billing/availability", { checkoutAvailable: true, passAvailable: true });
      cy.intercept("POST", "**/auth/v1/signup*", {
        statusCode: 200,
        body: { id: "00000000-0000-4000-8000-000000000001", email: "e2e@duoshot.test", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
      }).as("signup");
      cy.intercept("POST", "**/rest/v1/consent_events*", { statusCode: 201, body: [] });
      cy.visitEn("/en/pricing?utm_source=x&utm_medium=y&utm_campaign=z", {
        onBeforeLoad(win) {
          Object.defineProperty(win.document, "referrer", { value: "https://news.example/private?email=private@example.com" });
        },
      });
      cy.getCookie("ds_attr").should("exist").then((cookie) => {
        expect(JSON.parse(decodeURIComponent(cookie!.value))).to.deep.eq({
          utm_source: "x", utm_medium: "y", utm_campaign: "z", referrer: "news.example",
        });
        expect(cookie!.path).to.eq("/");
        expect(cookie!.httpOnly).to.eq(false);
      });
      if (kind.endsWith("_yearly")) cy.get('[data-testid="billing-yearly"]').click();
      cy.get(`[data-testid="pricing-cta-${kind}"]`).should("not.be.disabled").click();
      const next = `/en/tool?upgrade=1&reason=trial&plan=${kind}`;
      cy.location("pathname").should("eq", "/en/tool");
      cy.location("search").should("include", `plan=${kind}`).and("not.include", "utm_");
      cy.get('[data-testid="auth-form"]').should("be.visible");
      cy.get('[data-testid="auth-email"]').type("e2e@duoshot.test");
      cy.get('[data-testid="auth-password"]').type("password12");
      cy.get('[data-testid="auth-privacy"]').check({ force: true });
      cy.get('[data-testid="auth-submit"]').click();
      cy.wait("@signup").then(({ request }) => {
        const redirect = new URL(new URL(request.url).searchParams.get("redirect_to")!);
        expect(redirect.pathname).to.eq("/auth/callback");
        expect(redirect.searchParams.get("next")).to.eq(next);
      });
      cy.get('[data-testid="auth-message"]').should("contain", "Check your email");
      // A new document, as after opening an email link, keeps the first touch.
      cy.visitEn(`/en/tool?upgrade=1&plan=${kind}&utm_source=second`);
      cy.getCookie("ds_attr").then((cookie) => {
        expect(JSON.parse(decodeURIComponent(cookie!.value))).to.deep.eq({
          utm_source: "x", utm_medium: "y", utm_campaign: "z", referrer: "news.example",
        });
      });
    });
  }
});
