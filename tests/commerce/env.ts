/**
 * Environment for the commerce test server. These are throwaway values that exist only for
 * the local mock (tests/commerce/mock-server.mjs); they are NOT Razorpay credentials and are
 * never sent to Razorpay. The real Test Mode keys live only in the git-ignored .env.local.
 */
export const MOCK_PORT = 3399;
export const COMMERCE_PORT = 3301;
export const TEST_KEY_SECRET = "mock-key-secret-not-a-real-credential";
export const TEST_WEBHOOK_SECRET = "mock-webhook-secret-not-a-real-credential";
export const TEST_STORAGE_SECRET = "mock-storage-secret-not-a-real-credential";
export const ADMIN = { user: "admin", pass: "Mock-Pw-91" }; // 10 characters: within the 9–10 rule
export const MOCK = `http://127.0.0.1:${MOCK_PORT}`;
export const COMMERCE_URL = `http://localhost:${COMMERCE_PORT}`;

export const commerceEnv: Record<string, string> = {
  CHECKOUT_ENABLED: "true",
  CHECKOUT_TEST_EMAILS: "@buyers.test",
  RAZORPAY_KEY_ID: "rzp_test_mockkey000000",
  RAZORPAY_KEY_SECRET: TEST_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
  RAZORPAY_API_BASE: MOCK,
  COMMERCE_STORE: "memory",
  COMMERCE_STORAGE: "local",
  COMMERCE_EMAIL: "resend",
  RESEND_API_KEY: "re_mock_not_real",
  RESEND_API_BASE: MOCK,
  EMAIL_FROM: "CRAFT & CODE <orders@buyers.test>",
  SUPPORT_EMAIL: "support@buyers.test",
  OWNER_EMAIL: "owner@buyers.test",
  LOCAL_EBOOK_FILE: "tests/.fixtures/sample-ebook.pdf",
  LOCAL_STORAGE_SECRET: TEST_STORAGE_SECRET,
  COMMERCE_FAST_RETRY: "true",
  ADMIN_USER: ADMIN.user,
  ADMIN_PASSWORD: ADMIN.pass,
  APP_ORIGIN: COMMERCE_URL,
};
