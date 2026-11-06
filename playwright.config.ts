import { defineConfig, devices } from "@playwright/test";
import { COMMERCE_PORT, MOCK_PORT, commerceEnv } from "./tests/commerce/env";

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
    : [
        // The public site as visitors see it today: on-site checkout switched off.
        { command: `npm run start -- -p ${PORT}`, url: baseURL, reuseExistingServer: true, timeout: 120_000, env: { CHECKOUT_ENABLED: "false", COMMERCE_STORE: "memory", COMMERCE_STORAGE: "local", COMMERCE_EMAIL: "outbox", OWNER_EMAIL: "" } },
        // Mock Razorpay + Resend APIs, and a second server with Test Mode checkout wired to them.
        { command: `node tests/commerce/mock-server.mjs`, url: `http://127.0.0.1:${MOCK_PORT}/__health`, reuseExistingServer: false, timeout: 30_000, env: { MOCK_PORT: String(MOCK_PORT) } },
        { command: `npm run start -- -p ${COMMERCE_PORT}`, url: `http://localhost:${COMMERCE_PORT}`, reuseExistingServer: false, timeout: 120_000, env: commerceEnv },
      ],
});
