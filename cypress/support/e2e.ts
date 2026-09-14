import { resetE2eSession } from "./commands";

beforeEach(() => {
  cy.clearAllCookies();
  resetE2eSession();
});
