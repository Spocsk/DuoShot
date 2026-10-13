const ACCOUNT_ID = "00000000-0000-4000-8000-000000000001";
const ACCOUNT_DRAFTS = `duoshot.sets.v1:${ACCOUNT_ID}`;
const AUTH_COOKIE = `sb-${new URL(String(Cypress.expose("supabaseUrl"))).hostname.split(".")[0]}-auth-token`;

describe("guest drafts at authentication", () => {
  it("waits for an upload still being validated before opening the account workspace", () => {
    let finishValidation: (() => void) | undefined;
    cy.visitFr("/tool");
    cy.get('[data-testid="tool-sets"][data-ready="true"]');
    cy.window().then((win) => {
      const createBitmap = win.createImageBitmap.bind(win);
      cy.stub(win, "createImageBitmap").callsFake((...args: Parameters<typeof createImageBitmap>) => {
        const bitmap = createBitmap(...args);
        if (finishValidation) return bitmap;
        return new Promise<ImageBitmap>((resolve, reject) => {
          finishValidation = () => { void bitmap.then(resolve, reject); };
        });
      });
    });
    cy.get('[data-testid="drop-outer-input"]').selectFile("cypress/fixtures/outer.png", { force: true });
    cy.wrap(null).should(() => expect(finishValidation).to.be.a("function"));
    cy.get('[data-testid="tool-quota"]').click();
    cy.loginAs("free");
    cy.contains("button", "Déjà un compte ? Se connecter").click();
    cy.get('[data-testid="auth-email"]').type("e2e@duoshot.test");
    cy.get('[data-testid="auth-password"]').type("password12");
    cy.get('[data-testid="auth-submit"]').click();
    cy.wait("@authToken");
    cy.get('[data-testid="auth-form"]').should("not.exist");
    cy.get('[data-testid="tool-set-new"]').should("not.exist");
    cy.then(() => finishValidation!());
    cy.get('[data-testid="tool-drafts-recovered"]').should("be.visible");
    cy.get('[data-testid="tool-sets"][data-ready="true"]');
    cy.get('[data-testid="drop-outer"]').should("have.attr", "data-count", "1");
    cy.get('[data-testid="preview-outer"] img').should("exist");
  });

  for (const flow of ["login", "signup", "redirect"] as const) {
    it(`recovers every draft, the active pair and its settings after ${flow}, once`, () => {
      const english = flow === "signup";
      if (english) cy.visitEn("/en/tool");
      else cy.visitFr("/tool");
      cy.get('[data-testid="tool-sets"][data-ready="true"]');
      cy.get('[data-testid="tool-set-new"]').click();
      cy.dropScreens({ outer: "cypress/fixtures/outer.png", inner: "cypress/fixtures/inner.png" });
      cy.get('#tool-input-app').type("Guest app");
      cy.get('[data-testid="tool-set-rename"]').click();
      cy.get('[data-testid="tool-set-name"]').clear().type("Guest draft{enter}");
      cy.get('[data-testid="tool-tab-adjust"]').click();
      cy.get("details.tool-advanced > summary").click();
      cy.get('#tool-input-title').type("Saved title");
      cy.get('[data-seg="jpeg"]').click();
      cy.acknowledgeQuality();
      cy.get('[data-testid="tool-download"]').click();
      cy.get('[data-testid="auth-form"]').should("be.visible");

      // Existing account work must survive the guest handoff too.
      cy.window().then((win) => {
        win.localStorage.setItem(ACCOUNT_DRAFTS, JSON.stringify([{
          id: "existing-account-draft", name: "Account draft", appName: "Existing app",
          clientName: "", orientation: "portrait", sameSet: false,
        }]));
        win.localStorage.setItem(`duoshot.sets.active:${ACCOUNT_ID}`, "existing-account-draft");
      });
      cy.loginAs("free");

      if (flow === "redirect") {
        // Simulate returning authenticated from OAuth or an email link, preserving device storage.
        cy.reload();
      } else {
        if (flow === "signup") {
          cy.getCookie(AUTH_COOKIE).then((cookie) => {
            const encoded = cookie!.value.slice("base64-".length).replace(/-/g, "+").replace(/_/g, "/");
            const session = JSON.parse(atob(encoded));
            cy.intercept("POST", "**/auth/v1/signup*", { statusCode: 200, body: session }).as("signup");
          });
          cy.intercept("POST", "**/rest/v1/consent_events*", { statusCode: 201, body: [] });
          cy.get('[data-testid="auth-privacy"]').check({ force: true });
        } else {
          cy.contains("button", "Déjà un compte ? Se connecter").click();
        }
        cy.get('[data-testid="auth-email"]').type("e2e@duoshot.test");
        cy.get('[data-testid="auth-password"]').type("password12");
        cy.get('[data-testid="auth-submit"]').click();
        cy.wait(flow === "signup" ? "@signup" : "@authToken");
      }

      cy.get('[data-testid="tool-drafts-recovered"]').should("be.visible").and("contain", english ? "recovered in your account" : "retrouvés dans votre compte");
      cy.get('[data-testid="tool-sets"][data-ready="true"]').should("contain", "Guest draft");
      cy.get('[data-testid="preview-outer"] img').should("exist");
      cy.get('[data-testid="preview-inner"] img').should("exist");
      cy.get('[data-testid="tool-tab-adjust"]').click();
      cy.get("details.tool-advanced > summary").click();
      cy.get('#tool-input-title').should("have.value", "Saved title");
      cy.get('[data-seg="jpeg"]').should("have.attr", "aria-checked", "true");
      cy.get('[data-testid="tool-tab-captures"]').click();
      cy.get('#tool-input-app').should("have.value", "Guest app");
      cy.get('[data-testid="tool-sets"]').click();
      cy.get('[data-testid="tool-sets-menu"] [role="option"]').should("have.length", 3);
      cy.get('[data-testid="tool-sets-menu"]').should("contain", "Account draft");
      cy.window().then((win) => {
        expect(JSON.parse(win.localStorage.getItem("duoshot.sets.v1:guest")!)).to.deep.equal([]);
        const migrated = win.localStorage.getItem(ACCOUNT_DRAFTS);
        cy.reload();
        cy.get('[data-testid="tool-sets"][data-ready="true"]').should("contain", "Guest draft");
        cy.get('[data-testid="preview-outer"] img').should("exist");
        cy.get('[data-testid="preview-inner"] img').should("exist");
        cy.window().then((reloaded) => expect(reloaded.localStorage.getItem(ACCOUNT_DRAFTS)).to.equal(migrated));
        cy.get('[data-testid="tool-drafts-recovered"]').should("not.exist");
      });
    });
  }
});
