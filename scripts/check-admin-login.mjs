#!/usr/bin/env node
// Checks /admin/orders authentication against a running server using the credentials in .env.local.
// Prints HTTP statuses only, never the credentials.
// Usage: node scripts/check-admin-login.mjs [base-url]   (default http://localhost:3000)
import { readFileSync } from "node:fs";

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const basic = (u, p) => ({ authorization: `Basic ${Buffer.from(`${u}:${p}`).toString("base64")}` });
const status = async (headers = {}) => (await fetch(`${base}/admin/orders`, { headers, redirect: "manual" })).status;

const noAuth = await status();
const wrong = await status(basic(env.ADMIN_USER ?? "", "definitely-wrong"));
const right = await status(basic(env.ADMIN_USER ?? "", env.ADMIN_PASSWORD ?? ""));
console.log(`no credentials: ${noAuth} (expect 401) | wrong password: ${wrong} (expect 401) | correct credentials: ${right} (expect 200)`);
process.exitCode = noAuth === 401 && wrong === 401 && right === 200 ? 0 : 1;
