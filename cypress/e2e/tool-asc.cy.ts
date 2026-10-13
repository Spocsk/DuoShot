const EXPORT_ID = "11111111-2222-4333-8444-555555555555";
const JOB_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const APP_ID = "1234567890";

type Image = { slot: string; index: number; width: number; height: number; format: string };

const DUO: Image[] = [
  { slot: "duo-outer", index: 1, width: 1398, height: 2034, format: "png" },
  { slot: "duo-inner", index: 1, width: 2007, height: 2853, format: "png" },
];
function connectionStatus(overrides: Partial<{ paid: boolean; connected: boolean; owner: boolean }> = {}) {
  return {
    enabled: true, owner: true, paid: true, connected: true,
    keyId: "2X9R4HXF34", issuerId: "••••••••-••••-••••-••••-••••••••072a", createdAt: null, lastVerifiedAt: null,
    ...overrides,
  };
}

/** Logs in, renders an export (with or without 6.9″) and lands on the Export step. */
function exportReady(connection: { statusCode: number; body: unknown }, images: Image[] = DUO) {
  cy.loginAs("indie");
  cy.intercept("GET", "**/api/asc/connection", connection).as("ascStatus");
  cy.intercept("POST", "**/api/export", {
    statusCode: 200,
    body: { url: "https://storage.example/app.zip", filename: "app.zip", exportId: EXPORT_ID, images },
  }).as("export");
  cy.visitFr("/tool");
  cy.wait("@billing");
  cy.dropScreens({ outer: "cypress/fixtures/outer.png", inner: "cypress/fixtures/inner.png" });
  cy.get('[data-testid="duo-slot-choice"] select').select("mix");
  cy.get('[data-testid="duo-slot-choice"] input[type="checkbox"]').check();
  cy.acknowledgeQuality();
  cy.get('[data-testid="tool-download"]').click();
  cy.wait("@export");
  cy.get('[data-testid="tool-zip-link"]').should("be.visible");
}

function lookups() {
  cy.intercept("GET", "**/api/asc/apps", { apps: [{ id: APP_ID, name: "Harbor", bundleId: "site.duoshot.harbor" }] }).as("apps");
  cy.intercept("GET", `**/api/asc/apps/${APP_ID}/versions`, {
    versions: [
      { id: "ver-1", versionString: "2.1", state: "PREPARE_FOR_SUBMISSION", platform: "IOS" },
      { id: "ver-2", versionString: "2.0.1", state: "DEVELOPER_REJECTED", platform: "IOS" },
    ],
  }).as("versions");
  cy.intercept("GET", "**/api/asc/versions/ver-1/localizations", {
    localizations: [{ id: "loc-fr", locale: "fr-FR" }, { id: "loc-en", locale: "en-US" }],
  }).as("localizations");
}

function fillForm() {
  cy.get('[data-testid="asc-tool-open"]').click();
  cy.get('[data-testid="asc-dialog"]').should("have.attr", "data-view", "form");
  cy.wait("@apps");
  // A lone app is picked for the user; its versions load straight away.
  cy.wait("@versions");
  cy.get('[data-testid="asc-version"]').select("ver-1");
  cy.wait("@localizations");
  cy.get('[data-testid="asc-localization"]').select("loc-fr");
}

describe("tool: send to App Store Connect", () => {
  it("stays hidden while the connector flag is off", () => {
    exportReady({ statusCode: 404, body: { error: "NOT_FOUND" } });
    cy.wait("@ascStatus");
    cy.get('[data-testid="tool-primary-dock"]').within(() => {
      cy.get('[data-testid^="asc-tool"]').should("not.exist");
    });
  });

  it("links to the account connection when no key is connected", () => {
    exportReady({ statusCode: 200, body: connectionStatus({ connected: false }) });
    cy.get('[data-testid="asc-tool-not-connected"]').should("contain", "Connectez d’abord une clé API");
    cy.get('[data-testid="asc-tool-connect"]').should("have.attr", "href", "/account#connexions");
    cy.get('[data-testid="asc-tool-open"]').should("not.exist");
  });

  it("shows the action locked with a link to pricing on a trial", () => {
    exportReady({ statusCode: 200, body: connectionStatus({ paid: false, connected: false }) });
    cy.get('[data-testid="asc-tool-locked"]').within(() => {
      cy.contains("button", "Envoyer vers App Store Connect").should("be.disabled");
      cy.get('[data-testid="asc-tool-pricing"]').should("have.attr", "href", "/pricing");
    });
  });

  it("explains the cap for an old raw export and leads to selection", () => {
    const raw = Array.from({ length: 6 }, (_, i) => DUO.map((image) => ({ ...image, index: i + 1 }))).flat();
    exportReady({ statusCode: 200, body: connectionStatus() }, raw);
    cy.get('[data-testid="asc-tool-open"]').click();
    cy.get('[data-testid="asc-dialog"]').should("have.attr", "data-view", "no69");
    cy.get('[data-testid="asc-skipped-reason"]').should("contain", "emplacement unique").and("contain", "10");
    cy.get('[data-testid="asc-enable-69"]').click();
    cy.focused().should("have.value", "mix");
  });

  it("sends selected outer and inner screenshots with per-file progress", () => {
    exportReady({ statusCode: 200, body: connectionStatus() });
    lookups();
    cy.intercept("POST", "**/api/asc/uploads", (req) => {
      expect(req.headers["idempotency-key"]).to.match(/^[a-f0-9-]{36}$/);
      expect(req.body).to.deep.equal({ exportId: EXPORT_ID, appId: APP_ID, versionId: "ver-1", localizationId: "loc-fr", replaceExisting: true });
      req.reply({ statusCode: 202, body: { jobId: JOB_ID, statusUrl: `/api/render-jobs/${JOB_ID}`, skipped: [] } });
    }).as("upload");
    const files = (state: string) => DUO.map((image) => ({ slot: image.slot, index: image.index, displayType: "APP_IPHONE_DUO", state }));
    const replies = [
      { state: "running", progress: { total: 2, done: 0, files: files("uploading") } },
      { state: "running", progress: { total: 2, done: 0, files: files("processing") } },
      { state: "completed", result: { appId: APP_ID, uploaded: 2, replaced: 2, reordered: true, files: files("complete"), skipped: [] } },
    ];
    let call = 0;
    cy.intercept("GET", `**/api/render-jobs/${JOB_ID}`, (req) => { req.reply(replies[Math.min(call++, replies.length - 1)]!); }).as("job");

    fillForm();
    cy.get('[data-testid="asc-send-files"]').should("contain", "duo-outer-portrait/01.png").and("contain", "duo-inner-portrait/01.png");
    cy.get('[data-testid="asc-skipped-files"]').should("not.exist");
    cy.contains("label", "Remplacer les captures existantes des emplacements sélectionnés").should("contain", "anciennes ne sont supprimées qu’une fois");
    cy.get('[data-testid="asc-replace"]').check();
    cy.get('[data-testid="asc-confirm"]').should("have.text", "Envoyer 2 captures").click();
    cy.wait("@upload");

    cy.get('[data-testid="asc-dialog"]').should("have.attr", "data-view", "progress");
    cy.focused().should("contain", "Envoi en cours");
    cy.get('[data-testid="asc-live"]').should("have.attr", "aria-live", "polite");
    cy.get('[data-testid="asc-progress-files"] li').first().should("have.attr", "data-state").and("match", /uploading|processing/);
    cy.get('[data-testid="asc-dialog"]').should("have.attr", "data-view", "done");
    cy.focused().should("contain", "Captures envoyées");
    cy.get('[data-testid="asc-success"]').should("have.text", "2 captures sont dans App Store Connect.");
    cy.get('[data-testid="asc-dialog"]').should("contain", "2 anciennes captures remplacées.");
    cy.get('[data-testid="asc-open"]').should("have.attr", "href", `https://appstoreconnect.apple.com/apps/${APP_ID}`)
      .and("have.attr", "target", "_blank");
    cy.get('[data-testid="asc-live"]').should("contain", "Captures envoyées");

    cy.get(".ds-dialog-close").click();
    cy.get('[data-testid="asc-dialog"]').should("not.exist");
    cy.get('[data-testid="asc-tool-open"]').should("have.text", "Envoyé vers App Store Connect").and("be.focused");
    // The upload state belongs to the tool, not to the Export step.
    cy.get('[data-testid="tool-tab-review"]').click();
    cy.get('[data-testid="tool-tab-export"]').click();
    cy.get('[data-testid="asc-tool-open"]').should("have.text", "Envoyé vers App Store Connect");
  });

  it("hides replace for members and translates a failed job", () => {
    exportReady({ statusCode: 200, body: connectionStatus({ owner: false }) });
    lookups();
    cy.intercept("POST", "**/api/asc/uploads", (req) => {
      expect(req.body.replaceExisting).to.eq(false);
      req.reply({ statusCode: 202, body: { jobId: JOB_ID } });
    }).as("upload");
    cy.intercept("GET", `**/api/render-jobs/${JOB_ID}`, {
      state: "failed", error: "ASC_SET_FULL",
      progress: { total: 1, done: 1, files: [{ slot: "iphone-69", index: 1, displayType: "APP_IPHONE_67", state: "failed", error: "ASC_ROLLED_BACK" }] },
    }).as("job");

    fillForm();
    cy.get('[data-testid="asc-replace"]').should("not.exist");
    cy.get('[data-testid="asc-dialog"]').should("contain", "Les captures existantes sont conservées");
    cy.get('[data-testid="asc-confirm"]').click();
    cy.wait("@upload");
    cy.get('[data-testid="asc-error"]').should("contain", "L’emplacement ne peut pas contenir les captures existantes et nouvelles ensemble (10 au maximum)");
    cy.get('[data-testid="asc-progress-files"]').should("contain", "Retirée pour laisser la fiche intacte");
    cy.get('[data-testid="asc-retry"]').click();
    cy.get('[data-testid="asc-dialog"]').should("have.attr", "data-view", "form");
  });

  it("translates a refused upload request", () => {
    exportReady({ statusCode: 200, body: connectionStatus() });
    lookups();
    cy.intercept("POST", "**/api/asc/uploads", { statusCode: 410, body: { error: "EXPORT_EXPIRED" } }).as("upload");
    fillForm();
    cy.get('[data-testid="asc-confirm"]').click();
    cy.wait("@upload");
    cy.get('[data-testid="asc-error"]').should("have.text", "Cet export a expiré (24 h). Préparez à nouveau les fichiers.");
    cy.focused().should("contain", "Envoi interrompu");
  });

  it("translates an Apple lookup failure", () => {
    exportReady({ statusCode: 200, body: connectionStatus() });
    cy.intercept("GET", "**/api/asc/apps", { statusCode: 424, body: { error: "ASC_UNAUTHORIZED" } }).as("apps");
    cy.get('[data-testid="asc-tool-open"]').click();
    cy.wait("@apps");
    cy.get('[data-testid="asc-app-error"]').should("contain", "Apple refuse la clé enregistrée");
    cy.get('[data-testid="asc-confirm"]').should("be.disabled");
  });
});
