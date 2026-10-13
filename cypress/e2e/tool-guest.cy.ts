describe("tool guest", () => {
  beforeEach(() => {
    // Keep the analytics dialog from covering the sticky action/status dock.
    cy.on("window:before:load", (win) => {
      win.localStorage.setItem("duoshot_analytics_choice_v2", "rejected");
    });
  });

  it("shows an honest empty state before any drop", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="preview-outer"]').should("contain", "1398 × 2034").and("contain", "Importer");
    cy.get('[data-testid="preview-inner"]').should("contain", "2007 × 2853").and("contain", "Importer");
    cy.get('[data-testid="preview-outer"] img').should("not.exist");
    cy.get('.tool-demo-start-title, .tool-demo-start-lead, .tool-pair-empty').should("not.exist");
    cy.get('#tool-panel-captures h2').should("have.text", "Importer");
    cy.contains("RGB : sRGB").should("not.exist");
    cy.contains("conforme Connect").should("not.exist");
    cy.get('[data-testid="drop-outer"]').should("contain", "1398 × 2034");
    cy.get('[data-testid="drop-inner"]').should("contain", "2007 × 2853");
    cy.get('[data-testid="same-set-details"]').should("have.attr", "data-open", "false");
    cy.get('[data-testid="warn-clone"]').should("not.exist");
    cy.get('[data-testid="tool-quota"]').should("contain", "Invité");
    cy.get('[data-testid="tool-quota"]').should("not.contain", "2 essais offerts");
  });

  it("previews uploads and warns on incomplete sets", () => {
    cy.visitFr("/tool");
    cy.dropScreens();
    cy.get('[data-testid="preview-outer"] img').should("exist");
    cy.get('[data-testid="warn-too-few"]').should("be.visible");
    cy.get('[data-testid="warn-clone"]').should("not.exist");
    cy.get('[data-testid="tool-tab-review"]').click();
    cy.get('[data-testid="tool-download"]').should("be.disabled");
  });

  for (const method of ["picker", "drop"] as const) {
    it(`preserves captures imported through the canvas ${method}`, () => {
      cy.visitFr("/tool");
      cy.get('[data-testid="tool-sets"][data-ready="true"]');
      for (const side of ["outer", "inner"] as const) {
        if (method === "picker") {
          cy.get(`[data-testid="preview-${side}"] input[type="file"]`)
            .selectFile(`cypress/fixtures/${side}.png`, { force: true });
        } else {
          cy.get(`[data-testid="preview-${side}-canvas"]`)
            .selectFile(`cypress/fixtures/${side}.png`, { action: "drag-drop" });
        }
        cy.get(`[data-testid="preview-${side}"] img`).should("exist");
      }
      cy.get('[data-testid="tool-tab-captures"]').click();
      cy.get('[data-testid="drop-outer"]').should("have.attr", "data-count", "1");
      cy.get('[data-testid="drop-inner"]').should("have.attr", "data-count", "1");
      cy.reload();
      cy.get('[data-testid="preview-outer"] img').should("exist");
      cy.get('[data-testid="preview-inner"] img').should("exist");
    });
  }

  it("warns on clone only when the same-set toggle is on", () => {
    cy.visitFr("/tool");
    cy.dropScreens();
    cy.get('[data-testid="same-set-details"] .t-acc-head').click();
    cy.get('[data-testid="toggle-same-set"]').click();
    cy.get('[data-testid="tool-tab-adjust"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-testid="tool-tab-captures"]').click();
    cy.get('[data-testid="warn-clone"]').should("be.visible");
    cy.get('[data-testid="same-set-details"]').should("have.attr", "data-open", "true");
    cy.get('[data-testid="tool-tab-review"]').click();
    cy.get('[data-testid="clone-badges"]').should("contain", "Similarité forte").and("contain", "même capture des deux côtés");
    cy.get('[data-testid="tool-download"]').should("be.disabled");
    cy.acknowledgeQuality();
    cy.get('[data-testid="tool-download"]').should("not.be.disabled");
  });

  it("warns when outer and inner counts differ", () => {
    cy.visitFr("/tool");
    cy.dropScreens({
      outer: "cypress/fixtures/outer.png",
      inner: ["cypress/fixtures/inner.png", "cypress/fixtures/outer.png"],
    });
    cy.get('[data-testid="warn-unpaired"]').should("be.visible");
  });

  it("creates another local set", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-sets"][data-ready="true"]').click();
    cy.get('[data-testid="tool-sets-menu"] [role="option"]').should("have.length", 1);
    cy.get('[data-testid="tool-set-new"]').click();
    cy.get('[data-testid="tool-sets"][data-ready="true"]').click();
    cy.get('[data-testid="tool-sets-menu"] [role="option"]').should("have.length", 2);
  });

  it("asks for an account from the quota pill", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-quota"]').click();
    cy.get('[data-testid="auth-form"]').should("be.visible");
  });

  it("asks for an account when downloading a ZIP", () => {
    cy.visitFr("/tool");
    cy.dropScreens({
      outer: "cypress/fixtures/outer.png",
      inner: "cypress/fixtures/inner.png",
    });
    cy.acknowledgeQuality();
    cy.get('[data-testid="tool-download"]').click();
    cy.get('[data-testid="auth-form"]').should("be.visible");
    cy.get('h1').should("have.length", 1);
    cy.get('#auth-modal-title').should("match", "h2");
    cy.get('[data-testid="auth-email"]').type("{esc}");
    cy.get('[data-testid="tool-status"]').should("contain", "Créez un compte ou connectez-vous");
    cy.get('[data-testid="tool-tab-export"]').click();
    cy.get('#tool-panel-export a[href="/signup"]').should("not.exist");
    cy.get('[data-testid="tool-create-account"]').click();
    cy.get('[data-testid="auth-form"]').should("be.visible");
    cy.location("pathname").should("eq", "/tool");
  });

  for (const locale of ["fr", "en"] as const) {
    it(`shows import errors on every step in ${locale}`, () => {
      if (locale === "fr") cy.visitFr("/tool");
      else cy.visitEn("/en/tool");
      cy.get('[data-testid="tool-sets"][data-ready="true"]');
      const message = locale === "fr" ? "Certains fichiers ont été ignorés" : "Some files were skipped";
      cy.get('[data-testid="drop-outer-input"]').selectFile({ contents: Cypress.Buffer.from("invalid image"), fileName: "invalid.png", mimeType: "image/png" }, { force: true });
      // Image decoding is asynchronous; wait for the import failure first.
      cy.get('[data-testid="tool-status"]').should("have.attr", "data-kind", "err").and("contain", message);
      for (const panel of ["captures", "adjust", "review", "export"]) {
        cy.get(`[data-testid="tool-tab-${panel}"]`).click();
        cy.get(`[data-testid="tool-tab-${panel}"]`).should("have.attr", "aria-selected", "true");
        // Keep the alert below the sticky site header when scrolling to it.
        cy.get('[data-testid="tool-status"]').scrollIntoView({ offset: { top: -100, left: 0 } });
        cy.get('[data-testid="tool-status"]').should("be.visible").and("have.attr", "role", "alert").and("contain", message);
      }
    });
  }

  it("confirms deleting a set and preserves it when cancelled", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-sets"][data-ready="true"]');
    cy.get('[data-testid="tool-set-new"]').click();
    cy.dropScreens({ outer: "cypress/fixtures/outer.png", inner: "cypress/fixtures/inner.png" });
    cy.get('[data-testid="tool-set-delete"]').click();
    cy.get('[role="dialog"][aria-labelledby="tool-delete-title"]').should("be.visible").and("contain", "Set 02").and("have.attr", "aria-modal", "true");
    cy.contains('[role="dialog"][aria-labelledby="tool-delete-title"] button', "Annuler").click();
    cy.get('[role="dialog"][aria-labelledby="tool-delete-title"]').should("not.exist");
    cy.get('[data-testid="tool-sets"]').should("contain", "Set 02");
    cy.get('[data-testid="preview-outer"] img').should("exist");
    cy.get('[data-testid="tool-set-delete"]').click();
    cy.get('[data-testid="tool-set-delete-confirm"]').click();
    cy.get('[role="dialog"][aria-labelledby="tool-delete-title"]').should("not.exist");
    cy.get('[data-testid="tool-sets"]').should("contain", "Set 01");
    cy.reload();
    cy.get('[data-testid="tool-sets"][data-ready="true"]').click();
    cy.get('[data-testid="tool-sets-menu"] [role="option"]').should("have.length", 1);
    cy.get('[data-testid="preview-outer"] img').should("not.exist");
  });

  it("keeps rename, confirmation and links large enough to use on mobile", () => {
    cy.viewport(390, 844);
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-set-rename"]').should(($button) => {
      expect($button[0].getBoundingClientRect().height).to.be.at.least(24);
    });
    cy.get('[data-testid="tool-tab-review"]').click();
    cy.get('[data-testid="confirm-app-usage"]').should(($input) => {
      const bounds = $input[0].getBoundingClientRect();
      expect(bounds.height).to.be.at.least(24);
      expect(bounds.width).to.be.at.least(24);
    });
    cy.get('.tool-dock-missing button').each(($button) => {
      expect($button[0].getBoundingClientRect().height).to.be.at.least(24);
    });
    cy.get('footer .ds-link').each(($link) => {
      expect($link[0].getBoundingClientRect().height).to.be.at.least(24);
    });
    cy.get('[data-testid="tool-primary-dock"]').should(($dock) => {
      const background = getComputedStyle($dock[0]).backgroundColor;
      expect(background).not.to.eq("transparent");
      expect(background).to.match(/^rgb\(/);
    });
  });

  it("asks guests for an account before the 6.9 paywall", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-sets"][data-ready="true"]');
    cy.get('[data-testid="tool-tab-adjust"]').click();
    cy.contains("summary", "Réglages avancés").click();
    cy.get("details.tool-advanced").should("have.attr", "open");
    cy.get('[data-testid="toggle-69"]').should("have.attr", "aria-pressed", "false").click({ scrollBehavior: "center" });
    cy.get('[data-testid="auth-form"]').should("be.visible");
    cy.get('#auth-modal-title').should("contain", "paiement");
    cy.get('[data-testid="auth-submit"]').should("not.be.disabled");
    cy.get('[data-testid="paywall"]').should("not.exist");
    cy.contains("Les paiements ne sont pas encore ouverts").should("not.exist");
    cy.location("search").should("include", "upgrade=1").and("include", "reason=69");
    cy.get('[data-testid="dialog"] [aria-label="Fermer"]').click();
    cy.get('[data-testid="auth-form"]').should("not.exist");
    cy.get('[data-testid="paywall"]').should("not.exist");
    cy.get('[data-testid="toggle-69"]').should("have.attr", "aria-pressed", "true").click({ scrollBehavior: "center" });
    cy.get('[data-testid="toggle-69"]').should("have.attr", "aria-pressed", "false").click({ scrollBehavior: "center" });
    cy.get('[data-testid="auth-form"]').should("be.visible");
  });

  for (const [width, height] of [[1000, 500], [390, 600]]) {
    it(`keeps guest signup reachable and dismissible at ${width} × ${height}`, () => {
      cy.viewport(width, height);
      cy.visitFr("/tool?upgrade=1&reason=69");
      cy.get('[data-testid="dialog"]').should("be.visible").and(($dialog) => {
        const bounds = $dialog[0].getBoundingClientRect();
        expect(bounds.top, "dialog top stays in the viewport").to.be.at.least(0);
        expect(bounds.bottom, "dialog bottom stays in the viewport").to.be.at.most(height);
      });
      // Reach the last action, then scroll back to the close button without forcing clicks.
      cy.contains('[data-testid="dialog"] button', "Déjà un compte ? Se connecter").scrollIntoView().should("be.visible");
      cy.get('[data-testid="dialog"]').should(($dialog) => {
        expect($dialog[0].scrollTop, "long signup form scrolls inside the dialog").to.be.greaterThan(0);
      });
      cy.get('[data-testid="dialog"] [aria-label="Fermer"]').scrollIntoView().should("be.visible").click();
      cy.get('[data-testid="dialog"]').should("not.exist");
      cy.get('[data-testid="paywall"]').should("not.exist");
    });
  }

  it("explains the account requirement for 6.9 sizes in English", () => {
    cy.visitEn("/en/tool");
    cy.get('[data-testid="tool-sets"][data-ready="true"]');
    cy.get('[data-testid="tool-tab-adjust"]').click();
    cy.contains("summary", "Advanced settings").click();
    cy.get('[data-testid="toggle-69"]').click();
    cy.get('[data-testid="auth-form"]').should("be.visible");
    cy.get('#auth-modal-title').should("contain", "Create an account to continue to payment");
    cy.get('[data-testid="paywall"]').should("not.exist");
    cy.contains("Payments are not open yet").should("not.exist");
  });

  it("continues from guest 6.9 signup to an active paywall after login", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-sets"][data-ready="true"]');
    cy.get('[data-testid="tool-tab-adjust"]').click();
    cy.contains("summary", "Réglages avancés").click();
    cy.get('[data-testid="toggle-69"]').click();
    cy.get('[data-testid="auth-form"]').should("be.visible");
    cy.get('[data-testid="paywall"]').should("not.exist");

    cy.loginAs("free");
    cy.contains("button", "Déjà un compte ? Se connecter").click();
    cy.get('[data-testid="auth-email"]').type("e2e@duoshot.test");
    cy.get('[data-testid="auth-password"]').type("test-password");
    cy.get('[data-testid="auth-submit"]').click();
    cy.wait("@authToken");

    cy.get('[data-testid="auth-form"]').should("not.exist");
    cy.get('[data-testid="paywall"]').should("be.visible").and("contain", "6,9");
    cy.get('[data-testid="paywall-cta-indie"]').should("not.be.disabled");
    cy.contains("Les paiements ne sont pas encore ouverts").should("not.exist");
    cy.location("search").should("include", "upgrade=1").and("include", "reason=69");
  });

  it("keeps subscription checkout available when the selected pass is unavailable", () => {
    cy.loginAs("free");
    cy.intercept("GET", "**/api/billing/availability", { checkoutAvailable: true, passAvailable: false });
    cy.visitFr("/tool?upgrade=1&plan=pass30");
    cy.get('[data-testid="paywall"]').should("contain", "Pass 30 jours");
    cy.get('[data-testid="paywall-cta-pass30"]').should("be.disabled");
    cy.get('[data-testid="paywall-cta-indie"]').should("not.be.disabled");
    cy.contains("Les paiements ne sont pas encore ouverts").should("not.exist");
  });

  it("opens the auth modal from ?upgrade=1", () => {
    cy.visitFr("/tool?upgrade=1");
    cy.get('[data-testid="auth-form"]').should("be.visible");
    cy.get('#auth-modal-title').should("contain", "paiement");
  });

  it("shows one pair strip for 3+3 drops and switches preview", () => {
    cy.visitFr("/tool");
    cy.dropScreens({
      outer: ["cypress/fixtures/outer.png", "cypress/fixtures/outer.png", "cypress/fixtures/outer.png"],
      inner: ["cypress/fixtures/inner.png", "cypress/fixtures/inner.png", "cypress/fixtures/inner.png"],
    });
    cy.get('.tool-pair-select').should('have.length', 3);
    cy.get('[data-testid="preview-outer"]').should("have.attr", "data-slide", "0");
    cy.get('.tool-pair-select').eq(2).click();
    cy.get('[data-testid="preview-outer"]').should("have.attr", "data-slide", "2");
    cy.get('[data-testid="tool-tab-review"]').click();
    cy.get('[data-testid="clone-badge-2"]').should("be.visible").click();
    cy.get('[data-testid="preview-inner"]').should("have.attr", "data-slide", "2");
  });

  it("removes an uploaded image from the pair strip", () => {
    cy.visitFr("/tool");
    cy.dropScreens({
      outer: ["cypress/fixtures/outer.png", "cypress/fixtures/outer.png", "cypress/fixtures/outer.png"],
      inner: ["cypress/fixtures/inner.png", "cypress/fixtures/inner.png", "cypress/fixtures/inner.png"],
    });

    cy.get('[aria-label="Retirer la vue fermé de la paire 2"]').click();

    cy.get('[data-testid="tool-tab-captures"]').click();
    cy.get('[data-testid="drop-outer"]').should("have.attr", "data-count", "2");
    cy.get('.tool-pair-select').should('have.length', 3);
    cy.get('.tool-pair-select').eq(2).should('contain', '03');
    cy.get('[data-testid="warn-unpaired"]').should("be.visible");
  });

  it("removes the shared source from both shelves in same-set mode", () => {
    cy.visitFr("/tool");
    cy.dropScreens({
      outer: ["cypress/fixtures/outer.png", "cypress/fixtures/outer.png", "cypress/fixtures/outer.png"],
    });
    cy.get('[data-testid="same-set-details"] .t-acc-head').click();
    cy.get('[data-testid="toggle-same-set"]').click();
    cy.get('[data-testid="tool-tab-captures"]').click();
    cy.get('[aria-label="Retirer la vue fermé de la paire 2"]').click();

    cy.get('[data-testid="drop-outer"]').should("have.attr", "data-count", "2");
    cy.get('[data-testid="drop-inner"]').should("have.attr", "data-count", "2");
    cy.get('.tool-pair-select').should('have.length', 2);
  });

  it("keeps ten pairs in one strip and marks missing views", () => {
    cy.visitFr("/tool");
    const tenOuter = Array.from({ length: 10 }, () => "cypress/fixtures/outer.png");
    const nineInner = Array.from({ length: 9 }, () => "cypress/fixtures/inner.png");
    cy.dropScreens({ outer: tenOuter, inner: nineInner });
    cy.get('.tool-pair-select').should('have.length', 10);
    cy.get('.tool-pair-select').eq(9).should('have.attr', 'aria-label').and('contain', 'ouvert manquant');
    cy.get('.tool-pair-select').eq(9).click();
    cy.get('[data-testid="preview-outer"]').should('have.attr', 'data-slide', '9');
  });

  it("shows one state at a time on mobile and offers Compare", () => {
    cy.viewport(390, 844);
    cy.visitFr("/tool", { onBeforeLoad(win) { win.localStorage.setItem("duoshot_analytics_choice_v1", "rejected"); } });
    cy.dropScreens({ outer: "cypress/fixtures/outer.png", inner: "cypress/fixtures/inner.png" });
    cy.get('.tool-canvas').should('have.attr', 'data-mobile-view', 'outer');
    cy.get('[data-testid="preview-outer"]').should('be.visible');
    cy.get('[data-testid="preview-inner"]').should('not.be.visible');
    cy.contains('.tool-mobile-view button', 'Ouvert').click();
    cy.get('[data-testid="preview-inner"]').should('be.visible');
    cy.get('[data-testid="preview-outer"]').should('not.be.visible');
    cy.contains('.tool-mobile-view button', 'Comparer').click();
    cy.get('[data-testid="preview-outer"]').should('be.visible');
    cy.get('[data-testid="preview-inner"]').should('be.visible');
    cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(doc.defaultView!.innerWidth + 1));
    cy.get('.tool-canvas').scrollIntoView();
    cy.screenshot("atelier-mobile-390", { capture: "viewport" });
  });

  it("switches contextual panels with the keyboard", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-tab-captures"]').focus().type('{rightarrow}');
    cy.get('[data-testid="tool-tab-adjust"]').should('have.attr', 'aria-selected', 'true').and('be.focused');
    cy.get('[data-testid="tool-tab-adjust"]').type('{rightarrow}');
    cy.get('[data-testid="tool-tab-review"]').should('have.attr', 'aria-selected', 'true').and('be.focused');
    cy.get('[data-testid="tool-tab-review"]').type('{end}');
    cy.get('[data-testid="tool-tab-export"]').should('have.attr', 'aria-selected', 'true').and('be.focused');
  });

  it("tracks Importer → Ajuster → Vérifier → Exporter with one primary action", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-steps"]').should("have.attr", "role", "tablist");
    cy.get('[data-testid="tool-tab-captures"]').should("have.attr", "data-status", "current");
    cy.get('[data-testid="tool-primary"]').should("contain", "Importer des captures");
    cy.dropScreens({ outer: "cypress/fixtures/outer.png", inner: "cypress/fixtures/inner.png" });
    cy.get('[data-testid="tool-primary"]').should("contain", "Continuer vers Ajuster").click();
    cy.get('[data-testid="tool-tab-captures"]').should("have.attr", "data-status", "done");
    cy.get('[data-testid="tool-tab-adjust"]').should("have.attr", "aria-selected", "true");
    cy.get('[data-testid="tool-primary"]').should("contain", "Continuer vers Vérifier").click();
    cy.get('[data-testid="tool-tab-review"]').should("have.attr", "aria-selected", "true");
    cy.get('[data-testid="tool-tab-adjust"]').should("have.attr", "data-status", "done");
    cy.get('[data-testid="tool-download"]').should("be.disabled").and("contain", "Préparer les fichiers");
    cy.get('[data-testid="tool-missing-steps"]').contains("button", "Confirmer le contenu de l’app").click();
    cy.focused().should("have.attr", "data-testid", "confirm-app-usage");
    cy.get('[data-testid="tool-other-actions"]').should("not.have.attr", "open");
    cy.get('[data-testid="readiness-score"]').should("contain", "/100");
  });

  it("does not flag two clearly different screens as strongly similar", () => {
    cy.visitFr("/tool");
    cy.dropScreens({ outer: "cypress/fixtures/outer.png", inner: "cypress/fixtures/inner.png" });
    cy.get('[data-testid="tool-tab-review"]').click();
    cy.get('[data-testid="clone-badge-0"]').should("have.attr", "data-clone", "ok").and("contain", "vues distinctes");
    cy.get('[data-testid="clone-gate"]').should("not.exist");
  });

  it("loads the Harbor example in one click and lets the user replace it", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-demo"]').should("contain", "Essayer avec l’exemple Harbor").click();
    cy.get('[data-testid="tool-demo-banner"]').should("contain", "app fictive");
    cy.get('[data-testid="tool-sets"]').should("contain", "Harbor (exemple)");
    cy.get('[data-testid="preview-outer"] img').should("exist");
    cy.get('.tool-pair-select').should("have.length", 3);
    cy.get('[data-testid="tool-tab-adjust"]').should("have.attr", "aria-selected", "true");
    cy.get('[data-testid="tool-tab-review"]').click();
    cy.get('[data-testid="confirm-app-usage"]').should("not.exist");
    cy.get('[data-testid="tool-checklist"]').should("not.contain", "Confirmer le contenu de l’app");
    cy.get('[data-testid="tool-demo-zip"]').should("not.be.disabled");
    cy.get('[data-testid="tool-tab-export"]').click();
    cy.get('[data-testid="tool-demo-zip"]').should("not.be.disabled");
    cy.get('[data-testid="tool-export-connect-hint"]').should("contain", "App Store Connect").find("a").should("have.attr", "href", "/specs");
    cy.get('[data-testid="tool-demo-replace"]').click();
    cy.get('[data-testid="tool-demo-banner"]').should("not.exist");
    cy.get('[data-testid="preview-outer"] img').should("not.exist");
    cy.get('[data-testid="tool-sets"]').should("contain", "Set");
    cy.dropScreens({ outer: "cypress/fixtures/outer.png", inner: "cypress/fixtures/inner.png" });
    cy.get('[data-testid="tool-tab-review"]').click();
    cy.get('[data-testid="confirm-app-usage"]').should("not.be.checked");
    cy.get('[data-testid="tool-download"]').should("be.disabled");
  });

  it("opens the Harbor example from /tool?demo=harbor once", () => {
    cy.visitFr("/tool?demo=harbor");
    cy.get('[data-testid="tool-demo-banner"]').should("be.visible");
    cy.location("search").should("not.include", "demo=");
    cy.get('[data-testid="tool-sets"][data-ready="true"]').click();
    cy.get('[data-testid="tool-sets-menu"] [role="option"]').should("have.length", 1);
  });

  it("names new sets Set 01, 02 and keeps the app name separate", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-sets"][data-ready="true"]').should("contain", "Set 01");
    cy.get('[data-testid="tool-set-new"]').click();
    cy.get('[data-testid="tool-sets"]').should("contain", "Set 02");
    cy.get('label[for="tool-input-app"]').should("contain", "Nom de l’app");
  });
  it("offers existing-account login without losing the imported pair", () => {
    cy.visitFr("/tool");
    cy.dropScreens({ outer: "cypress/fixtures/outer.png", inner: "cypress/fixtures/inner.png" });
    cy.acknowledgeQuality();
    cy.get('[data-testid="tool-download"]').click();
    cy.contains("button", "Déjà un compte ? Se connecter").click();
    cy.get('[data-testid="auth-form"]').should("contain", "Connexion");
    cy.get('[data-testid="auth-privacy"]').should("not.exist");
    cy.get('[data-testid="auth-email"]').type("{esc}");
    cy.get('[data-testid="preview-outer"] img').should("exist");
    cy.get('[data-testid="preview-inner"] img').should("exist");
  });
  it("keeps export settings when a local draft is reopened", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-tab-adjust"]').click();
    cy.contains("summary", "Réglages avancés").click();
    cy.get('#tool-input-title').type("Titre conservé");
    cy.get('[data-seg="jpeg"]').click();
    cy.reload();
    cy.get('[data-testid="tool-sets"][data-ready="true"]');
    cy.get('[data-testid="tool-tab-adjust"]').click();
    cy.contains("summary", "Réglages avancés").click();
    cy.get('#tool-input-title').should("have.value", "Titre conservé");
    cy.get('[data-seg="jpeg"]').should("have.attr", "aria-checked", "true");
  });

  it("renames the set without touching the app name", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-sets"][data-ready="true"]');
    cy.get('#tool-input-app').type("Harbor Pro");
    cy.get('[data-testid="tool-set-rename"]').click();
    cy.get('h1').should("have.length", 1).and("contain", "Set 01");
    cy.get('[data-testid="tool-set-name"]').should("be.focused").clear().type("Lancement printemps{enter}");
    cy.contains(".tool-canvas-heading h1", "Lancement printemps");
    cy.get('[data-testid="tool-sets"]').should("contain", "Lancement printemps");
    cy.get('#tool-input-app').should("have.value", "Harbor Pro");
    cy.get('[data-testid="tool-set-rename"]').click();
    cy.get('[data-testid="tool-set-name"]').clear().type("Abandon{esc}");
    cy.contains(".tool-canvas-heading h1", "Lancement printemps");
    cy.reload();
    cy.get('[data-testid="tool-sets"][data-ready="true"]').should("contain", "Lancement printemps");
  });
});
