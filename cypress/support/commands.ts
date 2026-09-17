const PROJECT_REF = "jvhqcmqwrihbtwrggwuq";
const AUTH_COOKIE = `sb-${PROJECT_REF}-auth-token`;
const USER_ID = "00000000-0000-4000-8000-000000000001";
const USER_EMAIL = "e2e@duoshot.test";

type Plan = "free" | "indie" | "studio";

let e2eSession: ReturnType<typeof session> | null = null;

function toBase64Url(value: string) {
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fakeJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = toBase64Url(
    JSON.stringify({
      aud: "authenticated",
      exp: now + 3600,
      iat: now,
      iss: `https://${PROJECT_REF}.supabase.co/auth/v1`,
      sub: USER_ID,
      email: USER_EMAIL,
      role: "authenticated",
    }),
  );
  return `${header}.${payload}.e2e`;
}

function session() {
  const access_token = fakeJwt();
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token,
    refresh_token: "e2e-refresh",
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: "bearer",
    user: {
      id: USER_ID,
      aud: "authenticated",
      role: "authenticated",
      email: USER_EMAIL,
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
}

function cookieValue(next: ReturnType<typeof session>) {
  return `base64-${toBase64Url(JSON.stringify(next))}`;
}

function billing(plan: Plan, remaining: number | null) {
  return {
    plan,
    source: "mock",
    remainingFreeExports: plan === "free" ? remaining : null,
    canUse69: plan !== "free",
    launchExpiresAt: null,
  };
}

function visitLocalized(path: string, locale: "fr" | "en", options?: Partial<Cypress.VisitOptions>) {
  cy.setCookie("duoshot_locale", locale, { path: "/" });
  const stored = e2eSession;
  cy.visit(path, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      "Accept-Language": locale === "fr" ? "fr-FR,fr;q=0.9" : "en-US,en;q=0.9",
    },
    onBeforeLoad(win) {
      const nativeMatch = win.matchMedia.bind(win);
      options?.onBeforeLoad?.(win);
      win.confirm = () => true;
      Object.defineProperty(win, "matchMedia", {
        writable: true,
        configurable: true,
        value: (query: string) => {
          if (query.includes("prefers-reduced-motion")) {
            return {
              matches: true,
              media: query,
              onchange: null,
              addListener() {},
              removeListener() {},
              addEventListener() {},
              removeEventListener() {},
              dispatchEvent() {
                return false;
              },
            };
          }
          return nativeMatch(query);
        },
      });
      if (stored) {
        win.localStorage.setItem(AUTH_COOKIE, JSON.stringify(stored));
      } else {
        win.localStorage.removeItem(AUTH_COOKIE);
      }
      win.localStorage.removeItem("duoshot.sets.v1");
      win.localStorage.removeItem("duoshot.sets.active");
    },
  });
}

export function resetE2eSession() {
  e2eSession = null;
}

Cypress.Commands.add("visitFr", (path: string, options?: Partial<Cypress.VisitOptions>) => {
  visitLocalized(path, "fr", options);
});

Cypress.Commands.add("visitEn", (path: string, options?: Partial<Cypress.VisitOptions>) => {
  visitLocalized(path, "en", options);
});

Cypress.Commands.add("loginAs", (plan: Plan = "free", remaining: number | null = 2) => {
  const next = session();
  e2eSession = next;
  cy.setCookie(AUTH_COOKIE, cookieValue(next), { path: "/" });
  cy.intercept("GET", "**/auth/v1/user*", { statusCode: 200, body: next.user }).as("authUser");
  cy.intercept("POST", "**/auth/v1/token*", { statusCode: 200, body: next }).as("authToken");
  cy.intercept("GET", "**/api/billing/status", billing(plan, remaining)).as("billing");
  cy.intercept({ url: /\/storage\/v1\/object\// }, { statusCode: 200, body: { Key: `${USER_ID}/shot.png` } }).as(
    "storage",
  );
});

function zipReply(headers: Record<string, string> = {}) {
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/zip",
      "x-duoshot-filename": "app.zip",
      "x-duoshot-warning": "",
      ...headers,
    },
    body: Uint8Array.from([0x50, 0x4b, 0x03, 0x04]),
  };
}

Cypress.Commands.add("interceptZip", (alias = "export") => {
  cy.intercept("POST", "**/api/export", zipReply()).as(alias);
});

Cypress.Commands.add("dropScreens", (sides?: { outer?: string | string[]; inner?: string | string[] }) => {
  const outer = sides?.outer ?? "cypress/fixtures/outer.png";
  const inner = sides?.inner;
  const outerCount = Array.isArray(outer) ? outer.length : 1;
  cy.get('[data-testid="tool-sets"][data-ready="true"]');
  cy.get('[data-testid="drop-outer-input"]').selectFile(outer, { force: true });
  cy.get('[data-testid="drop-outer"]').should("have.attr", "data-count", String(outerCount));
  if (inner) {
    const innerCount = Array.isArray(inner) ? inner.length : 1;
    cy.get('[data-testid="drop-inner-input"]').selectFile(inner, { force: true });
    cy.get('[data-testid="drop-inner"]').should("have.attr", "data-count", String(innerCount));
  }
});

Cypress.Commands.add("acknowledgeQuality", () => {
  cy.get('[data-testid="preview-outer-metrics"]').should("be.visible");
  cy.get("body").then(($body) => {
    const button = $body.find('[data-testid="quality-acknowledge"]');
    if (button.length && button.attr("aria-pressed") !== "true") cy.wrap(button).click();
  });
});

Cypress.Commands.add("unlockExport", () => {
  cy.acknowledgeQuality();
  cy.get('[data-testid="preview-outer-clone"]').should("be.visible").and("not.contain", "dépose les deux");
  cy.get("body").then(($body) => {
    const toggle = $body.find('[data-testid="toggle-assume-clone"]');
    if (toggle.length && toggle.attr("aria-pressed") !== "true") cy.wrap(toggle).click();
  });
  cy.get('[data-testid="tool-download"]').should("not.be.disabled");
});

declare global {
  namespace Cypress {
    interface Chainable {
      visitFr(path: string, options?: Partial<Cypress.VisitOptions>): Chainable<AUTWindow>;
      visitEn(path: string, options?: Partial<Cypress.VisitOptions>): Chainable<AUTWindow>;
      loginAs(plan?: Plan, remaining?: number | null): Chainable<void>;
      interceptZip(alias?: string): Chainable<null>;
      dropScreens(sides?: { outer?: string | string[]; inner?: string | string[] }): Chainable<void>;
      acknowledgeQuality(): Chainable<void>;
      unlockExport(): Chainable<void>;
    }
  }
}
