import { defineConfig, devices } from "@playwright/test";

/**
 * Responsive / reflow regression tests. They run against the production build:
 *   npm run build && npm run test:responsive
 * PLAYWRIGHT_BASE_URL points the suite at another deployment instead (e.g. a preview URL).
 */
const PORT = 3300;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // WebKit is the engine family behind Safari. It isn't a substitute for testing on a real iPhone.
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: `npm run start -- -p ${PORT}`, url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
