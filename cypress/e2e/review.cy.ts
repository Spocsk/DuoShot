describe("review", () => {
  it("asks guests to sign in before sharing", () => {
    cy.visitFr("/tool");
    cy.dropScreens({
      outer: "cypress/fixtures/outer.png",
      inner: "cypress/fixtures/inner.png",
    });
    cy.get('[data-testid="tool-tab-review"]').click();
    cy.get('[data-testid="tool-review"]').click();
    cy.get('[data-testid="auth-form"]').should("be.visible");
  });

  it("blocks Indie from creating a review link", () => {
    cy.loginAs("indie");
    cy.intercept("POST", "**/api/reviews", { statusCode: 403, body: { error: "STUDIO_REQUIRED" } }).as("reviews");
    cy.visitFr("/tool");
    cy.wait("@billing");
    cy.dropScreens({
      outer: "cypress/fixtures/outer.png",
      inner: "cypress/fixtures/inner.png",
    });
    cy.get('[data-testid="tool-tab-review"]').click();
    cy.get('[data-testid="tool-review"]').click();
    cy.get('[data-testid="tool-status"]').should("contain", "réservé à Studio");
    cy.get('[data-testid="tool-review-upgrade"]').should("contain", "Studio");
    cy.get("@reviews.all").should("have.length", 0);
  });

  it("creates a Studio review link and records a decision", () => {
    cy.loginAs("studio");
    cy.intercept("POST", "**/api/reviews", { id: "revtest12ab", url: "/r/revtest12ab" }).as("createReview");
    cy.visitFr("/tool");
    cy.wait("@billing");
    cy.dropScreens({
      outer: "cypress/fixtures/outer.png",
      inner: "cypress/fixtures/inner.png",
    });
    cy.intercept("GET", "**/api/reviews/revtest12ab", {
      set_name: "Harbor",
      client_name: "Acme",
      orientation: "portrait",
      status: "pending",
      comment: null,
      slides: [],
    }).as("reviewStatus");
    cy.acknowledgeQuality();
    cy.get('[data-testid="tool-review"]').click();
    cy.wait("@createReview");
    cy.get('[data-testid="review-url"]').should("contain", "/r/revtest12ab");
    cy.get('[data-testid="tool-review-set-status"]').should("contain", "pending");

    cy.intercept("GET", "**/api/reviews/revtest12ab", {
      set_name: "Harbor",
      client_name: "Acme",
      orientation: "portrait",
      status: "pending",
      comment: null,
      slides: [
        {
          index: 0,
          clone: "ok",
          outer: "/api/reviews/revtest12ab/media?slide=0&side=outer",
          inner: "/api/reviews/revtest12ab/media?slide=0&side=inner",
        },
      ],
    }).as("reviewGet");
    cy.intercept("GET", "**/api/reviews/revtest12ab/media*", { statusCode: 204, body: "" });
    cy.intercept("POST", "**/api/reviews/revtest12ab/decision", {
      public_id: "revtest12ab",
      status: "approved",
      comment: "ok",
    }).as("decide");
    cy.visitFr("/r/revtest12ab");
    cy.wait("@reviewGet");
    cy.get('[data-testid="review-title"]').should("contain", "Harbor");
    cy.get(".studio-review-label-outer").should("contain", "Écran fermé");
    cy.get(".studio-review-label-inner").should("contain", "Écran ouvert");
    cy.get('[data-testid="review-device-view"]').should("have.attr", "aria-pressed", "true");
    cy.get('[data-testid="review-pixel-view"]').click();
    cy.get(".review-pair").should("have.class", "is-pixels");
    cy.get(".review-pair .preview-outer").should("have.attr", "data-aspect", "1398/2034");
    cy.get(".review-pair .preview-inner").should("have.attr", "data-aspect", "2007/2853");
    cy.get('[data-testid="review-comment"]').type("ok");
    cy.get('[data-testid="review-approve"]').click();
    cy.wait("@decide");
    cy.get('[data-testid="review-status"]').should("contain", "Approuvé");
    cy.get('[data-testid="review-decision-feedback"]').should("contain", "Décision enregistrée");
  });

  it("explains when a client decision fails", () => {
    cy.intercept("GET", "**/api/reviews/revfail12ab", {
      set_name: "Harbor",
      client_name: "Acme",
      orientation: "portrait",
      status: "pending",
      comment: null,
      slides: [],
    }).as("reviewGet");
    cy.intercept("POST", "**/api/reviews/revfail12ab/decision", { statusCode: 500, body: { error: "FAILED" } }).as("decide");
    cy.visitFr("/r/revfail12ab");
    cy.wait("@reviewGet");
    cy.get('[data-testid="review-approve"]').click();
    cy.wait("@decide");
    cy.get('[data-testid="review-decision-feedback"]').should("have.attr", "role", "alert").and("contain", "Réessayez");
    cy.get('[data-testid="review-status"]').should("contain", "En attente");
  });

  it("shows the review URL even if the clipboard is denied", () => {
    cy.loginAs("studio");
    cy.intercept("POST", "**/api/reviews", { id: "revclip12ab", url: "/r/revclip12ab" }).as("createReview");
    cy.visitFr("/tool", {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, "clipboard", {
          configurable: true,
          value: { writeText: () => Promise.reject(new Error("denied")) },
        });
      },
    });
    cy.wait("@billing");
    cy.dropScreens({
      outer: "cypress/fixtures/outer.png",
      inner: "cypress/fixtures/inner.png",
    });
    cy.intercept("GET", "**/api/reviews/revclip12ab", {
      set_name: "Harbor",
      status: "pending",
      slides: [],
    });
    cy.acknowledgeQuality();
    cy.get('[data-testid="tool-review"]').click();
    cy.wait("@createReview");
    cy.get('[data-testid="review-url"]').should("contain", "/r/revclip12ab");
    cy.get('[data-testid="review-copied"]').should("contain", "Lien prêt");
    cy.get('[data-testid="tool-status"]').should("not.contain", "Export impossible");
  });

  it("shows the Harbor demo review without Studio", () => {
    cy.visitFr("/r/harbor");
    cy.get('[data-testid="review-title"]').should("contain", "Harbor");
    cy.get('[data-testid="review-demo"]').should("be.visible").and("contain", "application fictive");
    cy.visitEn("/en/r/harbor");
    cy.get('[data-testid="review-title"]').should("contain", "Harbor");
    cy.get('[data-testid="review-demo"]').should("contain", "fictional app");
    cy.get('[data-testid="review-approve"]').should("not.exist");
  });

  it("shows a missing state for unknown review ids", () => {
    cy.intercept("GET", "**/api/reviews/missingid", { statusCode: 404, body: { error: "NOT_FOUND" } }).as("missing");
    cy.visitFr("/r/missingid");
    cy.wait("@missing");
    cy.get('[data-testid="review-missing"]').should("be.visible");
  });
});
