const SUPABASE_URL = String(Cypress.expose("supabaseUrl"));
const AUTH_COOKIE = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
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
      iss: `${SUPABASE_URL}/auth/v1`,
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
    checkoutAvailable: true,
  };
}

function visitLocalized(path: string, locale: "fr" | "en", options?: Partial<Cypress.VisitOptions>) {
  cy.setCookie("duoshot_locale_manual", locale, { path: "/" });
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
      for (const key of Object.keys(win.localStorage)) if (key.startsWith("duoshot.sets.")) win.localStorage.removeItem(key);
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

function zipReply() {
  return {
    statusCode: 200,
    body: {
      url: "https://storage.example/app.zip",
      filename: "app.zip",
      warning: "",
      images: [
        { slot: "duo-outer", index: 1, width: 1398, height: 2034, format: "png" },
        { slot: "duo-inner", index: 1, width: 2007, height: 2853, format: "png" },
      ],
    },
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
  cy.get('[data-testid="tool-tab-captures"]').click();
  cy.get('[data-testid="drop-outer-input"]').selectFile(outer, { force: true });
  cy.get('[data-testid="drop-outer"]').should("have.attr", "data-count", String(outerCount));
  if (inner) {
    const innerCount = Array.isArray(inner) ? inner.length : 1;
    cy.get('[data-testid="drop-inner-input"]').selectFile(inner, { force: true });
    cy.get('[data-testid="tool-tab-captures"]').click();
    cy.get('[data-testid="drop-inner"]').should("have.attr", "data-count", String(innerCount));
  }
});

Cypress.Commands.add("acknowledgeQuality", () => {
  cy.get('[data-testid="tool-tab-review"]').click();
  cy.get("body").then(($body) => {
    const button = $body.find('[data-testid="quality-acknowledge"]');
    if (button.length && button.attr("aria-pressed") !== "true") cy.wrap(button).click();
  });
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
    }
  }
}
