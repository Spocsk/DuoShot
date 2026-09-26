describe("durable render recovery", () => {
  it("recovers a queued export after reload without another POST", () => {
    const jobId = "10000000-0000-4000-8000-000000000001";
    let ready = false;
    let submissions = 0;
    cy.loginAs("free");
    cy.interceptZip("unusedSyncExport");
    cy.intercept("POST", "**/api/export", (req) => {
      submissions += 1;
      expect(req.headers["idempotency-key"]).to.match(/^[a-f0-9-]{36}$/);
      req.reply({ statusCode: 202, body: { jobId } });
    }).as("queuedExport");
    cy.intercept("GET", `**/api/render-jobs/${jobId}`, (req) => {
      req.reply({ statusCode: 200, body: ready
        ? { state: "completed", result: { url: "https://storage.example/recovered.zip", filename: "recovered.zip", exportId: jobId, images: [] } }
        : { state: "queued" } });
    }).as("jobStatus");
    cy.visitFr("/tool");
    cy.wait("@billing");
    cy.dropScreens({ outer: "cypress/fixtures/outer.png", inner: "cypress/fixtures/inner.png" });
    cy.acknowledgeQuality();
    cy.get('[data-testid="tool-download"]').click();
    cy.wait("@queuedExport");
    cy.wait("@jobStatus");
    cy.window().then(win => expect(win.localStorage.getItem("duoshot:render:00000000-0000-4000-8000-000000000001:export")).to.contain(jobId));
    cy.reload();
    cy.then(() => { ready = true; });
    cy.get('[data-testid="tool-zip-link"]').should("have.attr", "href", `/api/exports/${jobId}/download`);
    cy.then(() => expect(submissions).to.eq(1));
  });

});
