import { resetE2eSession } from "./commands";

beforeEach(() => {
  cy.clearAllCookies();
  resetE2eSession();
});

beforeEach(() => { cy.intercept("GET", "**/api/billing/availability", { checkoutAvailable: true }); });
