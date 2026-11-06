#!/usr/bin/env node
// Uploads the ebook to a PRIVATE Supabase Storage bucket (creating the bucket if needed).
// Usage (reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from the environment or .env.local):
//   node scripts/upload-ebook.mjs reference/ZERO_TO_FIRST_CLIENT_FINAL_PRODUCTION.pdf
// Prints no secrets. The bucket is created with public: false and is checked afterwards.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_BUCKET || "ebooks";
const file = process.argv[2];
const objectPath = process.env.EBOOK_STORAGE_PATH || path.basename(file ?? "");
const missing = [!url && "SUPABASE_URL", !key && "SUPABASE_SERVICE_ROLE_KEY", !file && "<file argument>"].filter(Boolean);
if (missing.length) {
  console.error(`Missing: ${missing.join(", ")}`);
  process.exit(1);
}
const h = { apikey: key, authorization: `Bearer ${key}` };

const b = await fetch(`${url}/storage/v1/bucket/${bucket}`, { headers: h });
if (b.status === 404 || b.status === 400) {
  const c = await fetch(`${url}/storage/v1/bucket`, { method: "POST", headers: { ...h, "content-type": "application/json" }, body: JSON.stringify({ id: bucket, name: bucket, public: false, file_size_limit: 52428800, allowed_mime_types: ["application/pdf"] }) });
  if (!c.ok) throw new Error(`Could not create bucket (${c.status})`);
  console.log(`Created private bucket "${bucket}".`);
} else if (b.ok) {
  if ((await b.json()).public) throw new Error(`Bucket "${bucket}" is PUBLIC. Make it private in Supabase before uploading.`);
} else throw new Error(`Could not read bucket (${b.status})`);

const bytes = readFileSync(file);
if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("That file isn't a PDF.");
const up = await fetch(`${url}/storage/v1/object/${bucket}/${objectPath.split("/").map(encodeURIComponent).join("/")}`, {
  method: "POST",
  headers: { ...h, "content-type": "application/pdf", "x-upsert": "true" },
  body: bytes,
});
if (!up.ok) throw new Error(`Upload failed (${up.status})`);
const pub = await fetch(`${url}/storage/v1/object/public/${bucket}/${objectPath}`);
const head = await fetch(`${url}/storage/v1/object/info/authenticated/${bucket}/${objectPath}`, { headers: h }).catch(() => null);
console.log(`Uploaded ${(bytes.length / 1048576).toFixed(2)} MB to ${bucket}/${objectPath}. Private read check: ${head?.status ?? "n/a"}. Public URL check: ${pub.status} (400/404 = not public).`);
if (pub.ok) throw new Error("The file is publicly readable! Make the bucket private in Supabase now.");
