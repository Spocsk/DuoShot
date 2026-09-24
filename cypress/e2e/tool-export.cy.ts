describe("tool export", () => {
  it("keeps the English canvas and contextual panels readable on a phone", () => {
    cy.viewport(390, 844);
    cy.visitEn("/en/tool");
    cy.contains("Your composition").should("be.visible");
    cy.contains("Compare").should("be.visible");
    cy.get('[data-testid="tool-tab-review"]').click();
    cy.get('[data-testid="readiness-report"]').scrollIntoView().should("be.visible");
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.defaultView!.innerWidth + 1);
    });
  });

  it("uploads and exposes the ZIP once the API succeeds", () => {
    cy.loginAs("free");
    cy.interceptZip("export");
    cy.visitFr("/tool");
    cy.wait("@billing");
    cy.dropScreens({
      outer: "cypress/fixtures/outer.png",
      inner: "cypress/fixtures/inner.png",
    });
    cy.acknowledgeQuality();
    cy.get('[data-testid="tool-download"]').click();
    cy.wait("@export");
    cy.get('[data-testid="tool-status"]').should("contain", "ZIP prêt");
    cy.get('[data-testid="tool-zip-link"]').should("have.attr", "href", "https://storage.example/app.zip");
    cy.get('[data-testid="tool-export-delivery"]').should("contain", "1398 × 2034");
    cy.get('[data-testid="tool-export-delivery"]').should("contain", "duo-outer-portrait/01.png");
    cy.get('[data-testid="tool-export-delivery"]').should("contain", "duo-inner-portrait/01.png");
  });

  it("opens the trial paywall when free exports are exhausted", () => {
    cy.loginAs("free", 0);
    cy.intercept("POST", "**/api/export", { statusCode: 402, body: { error: "TRIAL_EXHAUSTED" } }).as("trial");
    cy.visitFr("/tool");
    cy.wait("@billing");
    cy.dropScreens({
      outer: "cypress/fixtures/outer.png",
      inner: "cypress/fixtures/inner.png",
    });
    cy.get('[data-testid="tool-tab-review"]').click();
    cy.get('[data-testid="tool-download"]').click();
    cy.get('[data-testid="paywall"]').should("contain", "2 sets gratuits");
  });

  it("blocks clone risk then allows export after assume", () => {
    cy.loginAs("free");
    cy.intercept("POST", "**/api/export", { statusCode: 403, body: { error: "CLONE_RISK" } }).as("cloneRisk");
    cy.visitFr("/tool");
    cy.wait("@billing");
    cy.dropScreens();
    cy.get('[data-testid="same-set-details"] .t-acc-head').click();
    cy.get('[data-testid="toggle-same-set"]').click();
    cy.get('[data-testid="tool-tab-adjust"]').click();
    cy.contains("summary", "Réglages avancés").click();
    cy.get('[data-testid="toggle-assume-clone"]').click();
    cy.acknowledgeQuality();
    cy.get('[data-testid="tool-download"]').click();
    cy.wait("@cloneRisk");
    cy.get('[data-testid="tool-status"]').should("contain", "Risque 2.3.3");
    cy.interceptZip("exportOk");
    cy.get('[data-testid="tool-download"]').click();
    cy.wait("@exportOk");
    cy.get('[data-testid="tool-zip-link"]').should("be.visible");
  });

  it("sends the set orientation to export", () => {
    cy.loginAs("free");
    cy.intercept("POST", "**/api/export", (req) => {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      expect(body.options.orientation).to.eq("landscape");
      req.reply({ statusCode: 200, body: { url: "https://storage.example/app.zip", filename: "app.zip", images: [] } });
    }).as("export");
    cy.visitFr("/tool");
    cy.wait("@billing");
    cy.get('[data-seg="landscape"]').click();
    cy.get('[data-testid="preview-outer"]').should("contain", "2034 × 1398");
    cy.get('[data-testid="preview-inner"]').should("contain", "2853 × 2007");
    cy.get('[data-testid="preview-outer-canvas"]').should("have.attr", "data-aspect", "117.8/84.1");
    cy.get('[data-testid="preview-inner-canvas"]').should("have.attr", "data-aspect", "164.6/117.8");
    cy.get('[data-testid="tool-tab-adjust"]').click();
    cy.get('[data-testid="tool-pixel-view"]').click();
    cy.get('[data-testid="preview-outer-canvas"]').should("have.attr", "data-aspect", "2034/1398");
    cy.get('[data-testid="preview-inner-canvas"]').should("have.attr", "data-aspect", "2853/2007");
    cy.dropScreens({
      outer: "cypress/fixtures/outer.png",
      inner: "cypress/fixtures/inner.png",
    });
    cy.acknowledgeQuality();
    cy.get('[data-testid="tool-download"]').click();
    cy.wait("@export");
    cy.get('[data-testid="tool-status"]').should("contain", "ZIP prêt");
  });

  it("persists and sends the per-slide crop chosen in the preview", () => {
    cy.loginAs("free");
    cy.intercept("POST", "**/api/export", (req) => {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      expect(body.transforms.outer[0]).to.deep.equal({ fit: "cover", x: 0.82, y: 0.5 });
      expect(body.transforms.inner[0].fit).to.eq("contain");
      req.reply({ statusCode: 200, body: { url: "https://storage.example/app.zip", filename: "app.zip", images: [] } });
    }).as("cropExport");
    cy.visitFr("/tool");
    cy.wait("@billing");
    cy.dropScreens({ outer: "cypress/fixtures/outer.png", inner: "cypress/fixtures/inner.png" });
    cy.get('[data-testid="tool-tab-adjust"]').click();
    cy.get('[data-testid="tool-device-view"]').should("have.attr", "aria-pressed", "true");
    cy.get('[data-testid="preview-outer-canvas"]').should("have.attr", "data-aspect", "84.1/117.8");
    cy.get('[data-testid="preview-inner-canvas"]').should("have.attr", "data-aspect", "164.6/117.8");
    cy.get('[data-testid="preview-outer-crop-controls"]').should("contain", "164,6");
    cy.get('[data-testid="tool-pixel-view"]').click();
    cy.get('[data-testid="preview-outer-canvas"]').should("have.attr", "data-aspect", "1398/2034");
    cy.get('[data-testid="preview-inner-canvas"]').should("have.attr", "data-aspect", "2007/2853");
    cy.get('[data-testid="preview-outer-crop-controls"]').should("contain", "Ce cadre est le PNG exporté");
    cy.get('[data-testid="preview-outer-crop-controls"] input[type="range"]').first().then(($input) => {
      const el = $input[0] as HTMLInputElement;
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
      descriptor?.set?.call(el, "82");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    cy.get('.tool-adjust-side').contains("button", "Ouvert").click();
    cy.get('[data-testid="preview-inner-crop-controls"]').contains("button", "Tout afficher").click();
    cy.get('[data-testid="preview-inner-metrics"]').should("contain", "Rognage 0.0%");
    cy.window().then((win) => {
      const sets = JSON.parse(win.localStorage.getItem("duoshot.sets.v1") || "[]");
      expect(sets[0].transforms.outer[0].x).to.eq(0.82);
      expect(sets[0].transforms.inner[0].fit).to.eq("contain");
    });
    cy.acknowledgeQuality();
    cy.get('[data-testid="tool-download"]').click();
    cy.wait("@cropExport");
  });

  it("adjusts framing with the keyboard", () => {
    cy.visitFr("/tool");
    cy.dropScreens({ outer: "cypress/fixtures/outer.png", inner: "cypress/fixtures/inner.png" });
    cy.get('[data-testid="tool-tab-adjust"]').click();
    cy.get('[data-testid="preview-outer-crop-controls"] input[type="range"]').first().focus().type('{rightarrow}');
    cy.get('[data-testid="preview-outer-crop-controls"] input[type="range"]').first().should('have.value', '51');
    cy.window().then((win) => {
      const sets = JSON.parse(win.localStorage.getItem('duoshot.sets.v1') || '[]');
      expect(sets[0].transforms.outer[0].x).to.eq(0.51);
    });
  });
});
