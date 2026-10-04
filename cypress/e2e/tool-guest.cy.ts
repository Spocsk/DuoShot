describe("tool guest", () => {
  it("shows an honest empty state before any drop", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="preview-outer"]').should("contain", "1398 × 2034").and("contain", "Importer");
    cy.get('[data-testid="preview-inner"]').should("contain", "2007 × 2853").and("contain", "Importer");
    cy.get('[data-testid="preview-outer"] img').should("not.exist");
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
  });

  it("opens the 6.9 paywall for guests", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-sets"][data-ready="true"]');
    cy.get('[data-testid="tool-tab-adjust"]').click();
    cy.contains("summary", "Réglages avancés").click();
    cy.get('[data-testid="toggle-69"]').click();
    cy.get('[data-testid="paywall"]').should("contain", "6,9");
  });

  it("opens the auth modal from ?upgrade=1", () => {
    cy.visitFr("/tool?upgrade=1");
    cy.get('[data-testid="auth-form"]').should("be.visible");
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
    cy.get('[data-testid="tool-demo-zip"]').should("be.disabled");
    cy.acknowledgeQuality();
    cy.get('[data-testid="tool-demo-zip"]').should("not.be.disabled");
    cy.get('[data-testid="tool-demo-replace"]').click();
    cy.get('[data-testid="tool-demo-banner"]').should("not.exist");
    cy.get('[data-testid="preview-outer"] img').should("not.exist");
    cy.get('[data-testid="tool-sets"]').should("contain", "Composition");
  });

  it("opens the Harbor example from /tool?demo=harbor once", () => {
    cy.visitFr("/tool?demo=harbor");
    cy.get('[data-testid="tool-demo-banner"]').should("be.visible");
    cy.location("search").should("not.include", "demo=");
    cy.get('[data-testid="tool-sets"][data-ready="true"]').click();
    cy.get('[data-testid="tool-sets-menu"] [role="option"]').should("have.length", 1);
  });

  it("names new sets Composition 01, 02 and keeps the app name separate", () => {
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-sets"][data-ready="true"]').should("contain", "Composition 01");
    cy.get('[data-testid="tool-set-new"]').click();
    cy.get('[data-testid="tool-sets"]').should("contain", "Composition 02");
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

});
