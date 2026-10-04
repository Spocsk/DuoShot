describe("checkout", () => {
  it("sends guests from pricing to the tool upgrade modal", () => {
    cy.visitFr("/");
    cy.get('[data-testid="pricing-cta-indie_monthly"]').click();
    cy.location("pathname").should("eq", "/tool");
    cy.location("search").should("include", "upgrade=1");
    cy.get('[data-testid="auth-form"]').should("be.visible");
  });

  it("keeps the annual choice through guest signup", () => {
    cy.visitFr("/pricing");
    cy.get('[data-testid="billing-yearly"]').click();
    cy.get('[data-testid="pricing-cta-indie_yearly"]').click();
    cy.location("pathname").should("eq", "/tool");
    cy.location("search").should("include", "plan=indie_yearly");
    cy.get('[data-testid="auth-form"]').should("be.visible");
  });

  it("waits for a confirmed subscription before showing success", () => {
    cy.visitFr("/tool?checkout=success");
    cy.get('[data-testid="tool-tab-review"]').click();
    cy.get('[data-testid="tool-status"]').should("contain", "Vérification de l’activation en cours");
    cy.visitFr("/tool?checkout=cancel");
    cy.get('[data-testid="tool-tab-review"]').click();
    cy.get('[data-testid="tool-status"]').should("contain", "Paiement annulé");
  });

  it("opens the paywall for a signed-in upgrade query", () => {
    cy.loginAs("free");
    cy.visitFr("/tool?upgrade=1");
    cy.get('[data-testid="paywall"]').should("be.visible");
  });

  it("starts Checkout from the 6.9 paywall", () => {
    cy.loginAs("free");
    cy.intercept("POST", "**/api/stripe/checkout", { url: "/tool?checkout=cancel" }).as("checkout");
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-tab-adjust"]').click();
    cy.contains("summary", "Réglages avancés").click();
    cy.get('[data-testid="toggle-69"]').click();
    cy.get('[data-testid="paywall-cta-indie"]').click();
    cy.wait("@checkout");
    cy.location("search").should("include", "checkout=cancel");
    cy.get('[data-testid="tool-tab-review"]').click();
    cy.get('[data-testid="tool-status"]').should("contain", "Paiement annulé");
  });

  it("offers the 30-day pass in the tool paywall and starts its checkout", () => {
    cy.loginAs("free");
    cy.intercept("GET", "**/api/billing/availability", { checkoutAvailable: true, passAvailable: true }).as("availability");
    cy.intercept("POST", "**/api/stripe/checkout", (req) => {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      expect(body.kind).to.eq("pass30");
      req.reply({ url: "/tool?checkout=cancel" });
    }).as("passCheckout");
    cy.visitFr("/tool?upgrade=1&plan=pass30");
    cy.wait("@availability");
    cy.get('[data-testid="paywall"]').should("contain", "Pass 30 jours");
    cy.get('[data-testid="paywall-cta-pass30"]').should("not.be.disabled").click();
    cy.wait("@passCheckout");
    cy.location("search").should("include", "checkout=cancel");
  });

  it("brings a guest choosing the pass back to the same paywall after signing in", () => {
    cy.visitFr("/tool?upgrade=1&plan=pass30");
    cy.get('[data-testid="auth-form"]').should("be.visible");
    cy.visitFr(`/signup?next=${encodeURIComponent("/tool?upgrade=1&plan=pass30")}`);
    cy.get('main a[href*="/login?next="]').should("have.attr", "href", `/login?next=${encodeURIComponent("/tool?upgrade=1&plan=pass30")}`);
    cy.visitFr(`/login?next=${encodeURIComponent("https://evil.example/tool")}`);
    cy.get('main a[href^="/signup"]').should("have.attr", "href", "/signup");
  });
});
