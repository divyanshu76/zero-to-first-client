#!/usr/bin/env node
// Copies the commerce settings from .env.local to the linked Vercel project's PRODUCTION environment.
// - Only the names below are sent; nothing else from .env.local.
// - Variables that already exist in Production are left untouched (never overwritten).
// - Secrets are added as "sensitive" (write-only in Vercel). Values are never printed.
// - Refuses unsafe production values (live payments on, live key without approval, short admin password).
// Usage: node scripts/push-vercel-env.mjs            (dry run: shows what would be added)
//        node scripts/push-vercel-env.mjs --apply    (adds the missing variables)
//        add --with-admin-password to include ADMIN_PASSWORD (only after setting a new one)
// Requires: Vercel CLI logged in and this folder linked (vercel link).
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SECRET = ["RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "ADMIN_PASSWORD"];
const PLAIN = ["RAZORPAY_KEY_ID", "SUPABASE_URL", "SUPABASE_BUCKET", "EBOOK_STORAGE_PATH", "EMAIL_FROM", "SUPPORT_EMAIL", "OWNER_EMAIL", "ADMIN_USER", "APP_ORIGIN", "COMMERCE_STORE", "COMMERCE_STORAGE", "COMMERCE_EMAIL", "CHECKOUT_ENABLED", "CHECKOUT_LIVE_APPROVED", "CHECKOUT_TEST_EMAILS", "EMAIL_ATTACH_EBOOK"];
const apply = process.argv.includes("--apply");
const isWin = process.platform === "win32";
const vercel = (args, input) => spawnSync(isWin ? "vercel.cmd" : "vercel", args, { input, encoding: "utf8", shell: isWin });

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

// Production safety rules.
const problems = [];
if (env.CHECKOUT_LIVE_APPROVED === "true") problems.push("CHECKOUT_LIVE_APPROVED must stay false.");
if (env.RAZORPAY_KEY_ID?.startsWith("rzp_live_") && env.CHECKOUT_LIVE_APPROVED !== "true") problems.push("RAZORPAY_KEY_ID is a LIVE key without approval.");
if (env.APP_ORIGIN !== "https://craftandcode.tech") problems.push("APP_ORIGIN must be https://craftandcode.tech for production.");
if (env.EMAIL_ATTACH_EBOOK === "true") problems.push("EMAIL_ATTACH_EBOOK should be false.");
const pwLen = (env.ADMIN_PASSWORD ?? "").length;
// Sent only on request (--with-admin-password), so an old or shared value is never uploaded by accident.
const withAdminPassword = process.argv.includes("--with-admin-password");
const skipAdminPassword = !withAdminPassword || pwLen < 9 || pwLen > 10;
if (problems.length) {
  console.error(`Refusing:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

const ls = vercel(["env", "ls", "production"]);
if (ls.status !== 0) {
  console.error("Could not list Vercel env vars. Run `vercel login` and `vercel link` first.");
  process.exit(1);
}
const existing = new Set([...ls.stdout.matchAll(/^\s*([A-Z0-9_]+)\s+Encrypted/gm)].map((m) => m[1]));

console.log(`${apply ? "Applying" : "Dry run"} — Vercel Production`);
let added = 0;
for (const name of [...PLAIN, ...SECRET]) {
  const v = env[name];
  const tag = name === "RAZORPAY_KEY_ID" ? (v?.startsWith("rzp_test_") ? " [TEST key]" : "") : "";
  if (existing.has(name)) { console.log(`  = ${name}: already in Production, left unchanged`); continue; }
  if (name === "ADMIN_PASSWORD" && skipAdminPassword) { console.log(`  ! ${name}: skipped (${withAdminPassword ? "local value is not 9–10 characters" : "add --with-admin-password after setting the new password"})`); continue; }
  if (!v && name !== "CHECKOUT_TEST_EMAILS") { console.log(`  ! ${name}: empty in .env.local, skipped`); continue; }
  if (!apply) { console.log(`  + ${name}${SECRET.includes(name) ? " (sensitive)" : ""}${tag}: would be added`); continue; }
  const args = ["env", "add", name, "production", ...(SECRET.includes(name) ? ["--sensitive"] : [])];
  const r = vercel(args, v);
  console.log(r.status === 0 ? `  + ${name}${tag}: added` : `  x ${name}: failed (${(r.stderr || r.stdout).split("\n").find((l) => /error/i.test(l))?.trim() ?? "see Vercel"})`);
  if (r.status === 0) added++;
}
console.log(apply ? `Done: ${added} variable(s) added. Redeploy Production for them to take effect.` : "Nothing was changed. Re-run with --apply to add them.");
