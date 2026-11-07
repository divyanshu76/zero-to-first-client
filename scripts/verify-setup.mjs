#!/usr/bin/env node
// Verifies live connectivity for Supabase, Resend, and Admin auth once credentials are set in .env.local.
// Never prints secret values.
import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const env = (k) => process.env[k]?.trim() || null;

console.log("==================================================");
console.log("CRAFT & CODE — INTEGRATION & ENVIRONMENT AUDIT");
console.log("==================================================\n");

// 1. Env audit
const categories = {
  Razorpay: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"],
  Supabase: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_BUCKET", "EBOOK_STORAGE_PATH"],
  Resend: ["RESEND_API_KEY", "EMAIL_FROM", "SUPPORT_EMAIL", "OWNER_EMAIL"],
  Admin: ["ADMIN_USER", "ADMIN_PASSWORD"],
  Controls: ["CHECKOUT_ENABLED", "COMMERCE_STORE", "COMMERCE_STORAGE", "COMMERCE_EMAIL"],
};

for (const [cat, vars] of Object.entries(categories)) {
  console.log(`[${cat}]`);
  for (const v of vars) {
    const val = env(v);
    const status = val ? "CONFIGURED" : "MISSING (empty)";
    console.log(`  - ${v.padEnd(26)}: ${status}`);
  }
}
// Value checks (never printed): settings that silently disable a feature.
const warn = [];
const pwLen = (env("ADMIN_PASSWORD") ?? "").length;
if (pwLen > 0 && (pwLen < 9 || pwLen > 10)) warn.push("ADMIN_PASSWORD must be 9–10 characters, so /admin/orders stays disabled (404).");
for (const [k, want] of [["COMMERCE_STORE", "supabase"], ["COMMERCE_STORAGE", "supabase"], ["COMMERCE_EMAIL", "resend"]]) if (env(k) !== want) warn.push(`${k} is "${env(k) ?? "unset"}", not "${want}": the app will not use the real service.`);
if (env("CHECKOUT_ENABLED") === "true" && !env("CHECKOUT_TEST_EMAILS")) warn.push("CHECKOUT_ENABLED=true but CHECKOUT_TEST_EMAILS is empty: Test Mode checkout stays closed.");
if (env("CHECKOUT_LIVE_APPROVED") === "true") warn.push("CHECKOUT_LIVE_APPROVED=true: live payments are allowed. Do not set this before merchant activation.");
if (env("RAZORPAY_KEY_ID")?.startsWith("rzp_live_")) warn.push("RAZORPAY_KEY_ID is a LIVE key.");
if ((env("RECOVERY_CRON_SECRET") ?? "").length > 0 && env("RECOVERY_CRON_SECRET").length < 32) warn.push("RECOVERY_CRON_SECRET is shorter than 32 characters, so the recovery scheduler refuses every call.");
if (!env("RECOVERY_CRON_SECRET")) warn.push("RECOVERY_CRON_SECRET is not set: checkout-recovery scheduling is disabled (manual reminders still work).");
if (env("EMAIL_ATTACH_EBOOK") === "true") warn.push("EMAIL_ATTACH_EBOOK=true: the ebook PDF is attached to customer emails.");
console.log(warn.length ? ["[Warnings]", ...warn.map((w) => `  ! ${w}`)].join("\n") : "[Warnings] none");
console.log("");

// 2. Supabase Check
const supaUrl = env("SUPABASE_URL")?.replace(/\/$/, "");
const supaKey = env("SUPABASE_SERVICE_ROLE_KEY");
const bucket = env("SUPABASE_BUCKET") || "ebooks";
const ebookPath = env("EBOOK_STORAGE_PATH") || "ZERO_TO_FIRST_CLIENT_FINAL_PRODUCTION.pdf";

if (supaUrl && supaKey) {
  console.log("[Testing Supabase Connection...]");
  const h = { apikey: supaKey, authorization: `Bearer ${supaKey}` };
  try {
    // Check tables
    const dbRes = await fetch(`${supaUrl}/rest/v1/orders_with_delivery?limit=1`, { headers: h });
    if (dbRes.ok) {
      console.log("  ✓ Database: orders table & orders_with_delivery view reachable.");
    } else {
      console.log(`  ✗ Database: HTTP ${dbRes.status} on /orders_with_delivery (Did you run supabase/migrations/001_commerce.sql?)`);
    }
    const m2 = await fetch(`${supaUrl}/rest/v1/orders?select=owner_email_status&limit=1`, { headers: h });
    console.log(m2.ok ? "  ✓ Database: owner-notification columns present (002 applied or included in 001)." : `  ✗ Database: owner-notification columns missing (HTTP ${m2.status}) — run supabase/migrations/002_owner_notifications.sql.`);
    const rpc = await fetch(`${supaUrl}/rest/v1/rpc/claim_owner_email_delivery`, { method: "POST", headers: { ...h, "content-type": "application/json" }, body: JSON.stringify({ p_order_id: "ord_000000000000000000000000" }) });
    console.log(rpc.ok ? "  ✓ Database: RPC functions callable by the service role." : `  ✗ Database: RPC claim_owner_email_delivery returned HTTP ${rpc.status}.`);

    // Check bucket
    const bRes = await fetch(`${supaUrl}/storage/v1/bucket/${bucket}`, { headers: h });
    if (bRes.ok) {
      const bInfo = await bRes.json();
      if (bInfo.public) {
        console.log(`  ✗ Storage: Bucket "${bucket}" is PUBLIC. Please edit it in Supabase to make it PRIVATE.`);
      } else {
        console.log(`  ✓ Storage: Bucket "${bucket}" is PRIVATE (public: false).`);
      }
      const mimes = bInfo.allowed_mime_types;
      console.log(`  ${!mimes || mimes.includes("application/pdf") ? "✓" : "✗"} Storage: allowed MIME types = ${mimes ? mimes.join(", ") : "any"}`);
      console.log(`  ${!bInfo.file_size_limit || bInfo.file_size_limit >= 10 * 1048576 ? "✓" : "✗"} Storage: file size limit = ${bInfo.file_size_limit ? `${(bInfo.file_size_limit / 1048576).toFixed(0)} MB` : "project default"}`);
      const info = await fetch(`${supaUrl}/storage/v1/object/info/authenticated/${bucket}/${ebookPath}`, { headers: h });
      console.log(info.ok ? `  ✓ Storage: ebook object "${ebookPath}" exists.` : `  ✗ Storage: ebook object "${ebookPath}" not found (HTTP ${info.status}) — run node scripts/upload-ebook.mjs reference/ZERO_TO_FIRST_CLIENT_FINAL_PRODUCTION.pdf`);
    } else if (bRes.status === 404) {
      console.log(`  ! Storage: Bucket "${bucket}" not found yet (will be created automatically on upload).`);
    } else {
      console.log(`  ✗ Storage: HTTP ${bRes.status} querying bucket "${bucket}".`);
    }

    // Check ebook object
    const pubCheck = await fetch(`${supaUrl}/storage/v1/object/public/${bucket}/${ebookPath}`);
    if (pubCheck.status === 400 || pubCheck.status === 404) {
      console.log(`  ✓ Storage Security: Public URL check returned ${pubCheck.status} (Confirmed NOT publicly accessible).`);
    } else {
      console.log(`  ✗ Storage Security Alert: Public URL check returned ${pubCheck.status}! File may be publicly accessible.`);
    }
  } catch (err) {
    console.log(`  ✗ Supabase Network Error: ${err.message}`);
  }
  console.log("");
} else {
  console.log("[Supabase]: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set yet in .env.local.\n");
}

// 3. Resend Check
const resendKey = env("RESEND_API_KEY");
if (resendKey) {
  console.log("[Testing Resend API & Domains...]");
  try {
    const dRes = await fetch("https://api.resend.com/domains", {
      headers: { authorization: `Bearer ${resendKey}` },
    });
    if (dRes.ok) {
      const { data: domains } = await dRes.json();
      console.log(`  ✓ Resend API Key is valid.`);
      const fromDomain = /@([^>\s]+)/.exec(env("EMAIL_FROM") ?? "")?.[1]?.toLowerCase();
      const match = (domains ?? []).find((d) => d.name.toLowerCase() === fromDomain);
      console.log(fromDomain ? `  ${match?.status === "verified" ? "✓" : "✗"} EMAIL_FROM domain "${fromDomain}": ${match ? match.status : "not added in Resend"}` : "  ✗ EMAIL_FROM is not set or has no domain.");
      if (!domains || domains.length === 0) {
        console.log("  ! No sending domains configured in Resend yet.");
      } else {
        console.log(`  Configured domains in Resend:`);
        for (const d of domains) {
          console.log(`    - Domain: ${d.name} | Status: ${d.status}`);
          if (d.status !== "verified") {
            console.log(`      DNS records needed for ${d.name}:`);
            const dDetail = await (await fetch(`https://api.resend.com/domains/${d.id}`, { headers: { authorization: `Bearer ${resendKey}` } })).json();
            if (dDetail.records) {
              for (const r of dDetail.records) {
                console.log(`        [${r.record}] ${r.name} -> ${r.value} (status: ${r.status})`);
              }
            }
          }
        }
      }
    } else {
      console.log(`  ✗ Resend API returned HTTP ${dRes.status} (Check RESEND_API_KEY).`);
    }
  } catch (err) {
    console.log(`  ✗ Resend Network Error: ${err.message}`);
  }
  console.log("");
} else {
  console.log("[Resend]: RESEND_API_KEY not set yet in .env.local.\n");
}

console.log("Audit complete.");

