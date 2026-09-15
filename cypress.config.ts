import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    fixturesFolder: "cypress/fixtures",
    screenshotsFolder: "cypress/screenshots",
    videosFolder: "cypress/videos",
    video: true,
    chromeWebSecurity: false,
    defaultCommandTimeout: 12_000,
    requestTimeout: 30_000,
    responseTimeout: 60_000,
    retries: { runMode: 2, openMode: 0 },
    allowCypressEnv: false,
  },
});
