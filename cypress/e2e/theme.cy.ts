function emulateTheme(value: "light" | "dark") {
  return cy.then(() => Cypress.automation("remote:debugger:protocol", {
    command: "Emulation.setEmulatedMedia",
    params: { features: [{ name: "prefers-color-scheme", value }] },
  }));
}

describe("theme", () => {
  beforeEach(() => {
    const uncaughtException = cy.spy().as("uncaughtException");
    cy.on("uncaught:exception", (error) => {
      uncaughtException(error);
    });
    cy.viewport(1280, 800);
    cy.clearAllLocalStorage();
    emulateTheme("light");
  });
  afterEach(() => {
    cy.get("@uncaughtException").should("not.have.been.called");
    emulateTheme("light");
  });

  it("hydrates a stored dark preference in both locale layouts without uncaught exceptions", () => {
    for (const locale of ["fr", "en"]) {
      cy.visit(`/${locale}`, { onBeforeLoad(win) { win.localStorage.setItem("duoshot_theme", "dark"); } });
      cy.get("html").should("have.attr", "data-theme", "dark").and("have.css", "color-scheme", "dark");
      cy.get('header [data-testid="theme-toggle"] summary').click();
      cy.get('header [data-testid="theme-dark"]').should("have.attr", "aria-pressed", "true");
      cy.get('header [data-testid="theme-system"]').should("have.attr", "aria-pressed", "false");
      cy.get("@uncaughtException").should("not.have.been.called");
    }
  });

  it("toggles, persists across reload and restores light", () => {
    cy.visitFr("/");
    cy.get('header [data-testid="theme-toggle"] summary').click();
    cy.get('header [data-testid="theme-dark"]').click().should("have.attr", "aria-pressed", "true");
    cy.get("html").should("have.attr", "data-theme", "dark").and("have.css", "color-scheme", "dark");
    cy.window().its("localStorage").invoke("getItem", "duoshot_theme").should("eq", "dark");
    cy.reload();
    cy.get("html").should("have.attr", "data-theme", "dark");
    cy.get('header [data-testid="theme-toggle"] summary').click();
    cy.get('header [data-testid="theme-dark"]').should("have.attr", "aria-pressed", "true");
    cy.get('header [data-testid="theme-light"]').click();
    cy.get("html").should("have.attr", "data-theme", "light").and("have.css", "color-scheme", "light");
  });

  it("defaults to system and follows live OS changes, while explicit choices override them", () => {
    cy.visitFr("/");
    cy.get("html").should("have.attr", "data-theme", "system").and("have.css", "color-scheme", "light");
    emulateTheme("dark");
    cy.get("html").should("have.css", "color-scheme", "dark");
    cy.get("body").should("have.css", "background-color", "rgb(15, 22, 25)");
    cy.get('header [data-testid="theme-toggle"] summary').click();
    cy.get('header [data-testid="theme-light"]').click();
    cy.get("html").should("have.css", "color-scheme", "light");
    cy.get('header [data-testid="theme-system"]').click();
    cy.get("html").should("have.attr", "data-theme", "system").and("have.css", "color-scheme", "dark");
    emulateTheme("light");
    cy.get("html").should("have.css", "color-scheme", "light");
  });

  it("sets stored dark before hydration", () => {
    cy.request<string>("/en").then(({ body }) => {
      expect(body).to.include('id="duoshot-theme"');
      const htmlTag = body.match(/<html\b[^>]*>/i);
      expect(htmlTag).to.not.equal(null);
      expect(htmlTag![0]).to.not.match(/\bdata-theme\b/i);
    });
    cy.visit("/en", {
      onBeforeLoad(win: Cypress.AUTWindow & { __themeAtHeader?: string | null }) {
        win.localStorage.setItem("duoshot_theme", "dark");
        const observer = new win.MutationObserver(() => {
          if (win.document.querySelector("header")) {
            win.__themeAtHeader = win.document.documentElement.getAttribute("data-theme");
            observer.disconnect();
          }
        });
        observer.observe(win.document, { childList: true, subtree: true });
      },
    });
    // The parser inserts the header before hydration can apply the theme.
    cy.window().its("__themeAtHeader").should("eq", "dark");
    cy.get("html").should("have.attr", "data-theme", "dark").and("have.css", "color-scheme", "dark");
    cy.get("body > #duoshot-theme").should("exist").and(($script) => {
      const script = $script[0];
      const header = script.ownerDocument.querySelector("header")!;
      expect(script.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING).to.not.equal(0);
    });
  });

  it("offers localized, accessible controls in the mobile menu", () => {
    cy.viewport(390, 844);
    cy.visitFr("/");
    cy.get('header button[aria-controls="site-menu"]').click();
    cy.get('[data-testid="theme-toggle-menu"]').within(() => {
      cy.contains("span", "Thème").should("be.visible");
      cy.contains("button", "Sombre").click().should("have.attr", "aria-pressed", "true");
      cy.get('[role="group"]').should("have.attr", "aria-labelledby");
    });
    cy.get("html").should("have.attr", "data-theme", "dark");
    cy.get("#site-menu").should("have.class", "is-open");
  });
});
