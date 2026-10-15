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
      // Cypress 15's getCookie() reads once, even with should("exist").
      // Retry the browser read until the hydration effect has captured the landing.
      cy.document().should((doc) => {
        expect(doc.cookie).to.match(/(?:^|;\s*)ds_attr=/);
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
      // Simulate the confirmed session after following the signup email, then
      // check the actual browser request that the checkout route reads.
      cy.loginAs("free");
      cy.intercept("POST", "**/api/stripe/checkout", (req) => {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        expect(body).to.deep.eq({ kind, next: "/en/tool" });
        const cookie = String(req.headers.cookie).split(";").map((part) => part.trim())
          .find((part) => part.startsWith("ds_attr="));
        expect(cookie).to.exist;
        expect(JSON.parse(decodeURIComponent(cookie!.slice("ds_attr=".length)))).to.deep.eq({
          utm_source: "x", utm_medium: "y", utm_campaign: "z", referrer: "news.example",
        });
        req.reply({ url: "/en/tool?checkout=cancel" });
      }).as("checkout");
      cy.visitEn(next);
      const plan = kind.split("_")[0];
      cy.get(`[data-testid="paywall-cta-${plan}"]`).should("not.be.disabled").click();
      cy.wait("@checkout");
      cy.location("search").should("include", "checkout=cancel");
    });
  }

  it("sets a host-only first-touch cookie on the landing response and preserves it on later visits", () => {
    cy.request({
      url: "/en/pricing?utm_source=first&utm_content=hero",
      headers: {
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://news.example/private?email=private@example.com",
      },
    }).then((response) => {
      expect(response.headers["set-cookie"]).to.exist;
      expect(response.headers["cache-control"]).to.contain("no-store");
    });
    cy.getCookie("ds_attr").should("exist").then((cookie) => {
      expect(JSON.parse(decodeURIComponent(cookie!.value))).to.deep.eq({
        utm_source: "first", utm_content: "hero", referrer: "news.example",
      });
      expect(cookie!.path).to.eq("/");
      expect(cookie!.httpOnly).to.eq(true);
      expect(cookie!.hostOnly).to.eq(true);
      const original = cookie!;
      cy.visitEn("/en/pricing?utm_source=second");
      cy.getCookie("ds_attr").should((current) => {
        expect(current!.value).to.eq(original.value);
        expect(current!.expiry).to.eq(original.expiry);
      });
    });
  });
});
