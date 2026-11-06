import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { safeEqualHex } from "./razorpay";
import { SIGNED_URL_TTL_SECONDS, appOrigin, ebookBucket, ebookStoragePath, localStorageSecret, storageDriver, supabaseConfig } from "./config";

/** File name the buyer's browser saves. */
export const DOWNLOAD_FILENAME = "ZERO_TO_FIRST_CLIENT_2026.pdf";

export class StorageError extends Error {}

/**
 * Returns a short-lived (15 min) URL for the private ebook. Call ONLY after the
 * server has checked that the order is paid. Nothing permanent is ever exposed.
 */
export async function signedEbookUrl(orderId: string, requestOrigin?: string): Promise<{ url: string; expiresAt: string }> {
  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();
  return storageDriver() === "supabase" ? { url: await supabaseSignedUrl(), expiresAt } : { url: localSignedUrl(orderId, requestOrigin), expiresAt };
}

/**
 * Resend allows 40 MB per email after Base64 encoding (+33%). Attach the ebook only if it
 * leaves room for the receipt and the message: 28 MB raw ≈ 37.3 MB encoded.
 */
export const MAX_EBOOK_ATTACHMENT_BYTES = 28 * 1024 * 1024;

/**
 * The private ebook's bytes, for attaching to the verified buyer's email. Returns null (and the
 * email falls back to the secure link) if storage is unavailable, the file isn't a PDF, or it's
 * too large to attach. Never a placeholder.
 */
export async function ebookForAttachment(): Promise<{ bytes: Buffer } | { bytes: null; reason: "unavailable" | "too_large" | "not_pdf" }> {
  let bytes: Buffer | null = null;
  try {
    if (storageDriver() === "supabase") {
      const cfg = supabaseConfig();
      if (!cfg) return { bytes: null, reason: "unavailable" };
      const objectPath = ebookStoragePath().split("/").map(encodeURIComponent).join("/");
      const res = await fetch(`${cfg.url}/storage/v1/object/authenticated/${encodeURIComponent(ebookBucket())}/${objectPath}`, {
        headers: { apikey: cfg.key, authorization: `Bearer ${cfg.key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) return { bytes: null, reason: "unavailable" };
      const len = Number(res.headers.get("content-length") ?? 0);
      if (len > MAX_EBOOK_ATTACHMENT_BYTES) return { bytes: null, reason: "too_large" };
      bytes = Buffer.from(await res.arrayBuffer());
    } else {
      if (!localStorageSecret()) return { bytes: null, reason: "unavailable" };
      const s = await stat(localEbookFile());
      if (s.size > MAX_EBOOK_ATTACHMENT_BYTES) return { bytes: null, reason: "too_large" };
      bytes = await readFile(localEbookFile());
    }
  } catch {
    return { bytes: null, reason: "unavailable" };
  }
  if (bytes.length > MAX_EBOOK_ATTACHMENT_BYTES) return { bytes: null, reason: "too_large" };
  if (bytes.length < 8 || bytes.subarray(0, 5).toString("latin1") !== "%PDF-") return { bytes: null, reason: "not_pdf" };
  return { bytes };
}

/**
 * Admin-only storage health check: bucket privacy and the ebook object's size/type. Never returns a URL.
 */
export async function ebookStorageStatus(): Promise<{ driver: "supabase" | "local"; ok: boolean; bucket: string; path: string; bucketPrivate: boolean | null; allowedMime: string | null; sizeLimit: number | null; size: number | null; mime: string | null; publicAccessBlocked: boolean | null; error?: string }> {
  const path = ebookStoragePath();
  if (storageDriver() !== "supabase") {
    let size: number | null = null;
    try { size = (await stat(localEbookFile())).size; } catch {}
    return { driver: "local", ok: size !== null, bucket: "(local file)", path, bucketPrivate: null, allowedMime: null, sizeLimit: null, size, mime: size !== null ? "application/pdf" : null, publicAccessBlocked: null, ...(size === null ? { error: "local file missing" } : {}) };
  }
  const cfg = supabaseConfig();
  const bucket = ebookBucket();
  const base = { driver: "supabase" as const, bucket, path, bucketPrivate: null, allowedMime: null, sizeLimit: null, size: null, mime: null, publicAccessBlocked: null };
  if (!cfg) return { ...base, ok: false, error: "Supabase is not configured" };
  const h = { apikey: cfg.key, authorization: `Bearer ${cfg.key}` };
  const objectPath = path.split("/").map(encodeURIComponent).join("/");
  try {
    const [b, info, pub] = await Promise.all([
      fetch(`${cfg.url}/storage/v1/bucket/${encodeURIComponent(bucket)}`, { headers: h, cache: "no-store", signal: AbortSignal.timeout(10_000) }),
      fetch(`${cfg.url}/storage/v1/object/info/authenticated/${encodeURIComponent(bucket)}/${objectPath}`, { headers: h, cache: "no-store", signal: AbortSignal.timeout(10_000) }),
      fetch(`${cfg.url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath}`, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(10_000) }),
    ]);
    const bj = b.ok ? ((await b.json()) as { public?: boolean; allowed_mime_types?: string[] | null; file_size_limit?: number | null }) : null;
    const ij = info.ok ? ((await info.json()) as { size?: number; content_type?: string; contentType?: string; metadata?: { size?: number; mimetype?: string } }) : null;
    const size = ij ? Number(ij.size ?? ij.metadata?.size ?? 0) || null : null;
    const mime = ij ? (ij.content_type ?? ij.contentType ?? ij.metadata?.mimetype ?? null) : null;
    const res = { ...base, bucketPrivate: bj ? !bj.public : null, allowedMime: bj?.allowed_mime_types?.join(", ") ?? (bj ? "any" : null), sizeLimit: bj?.file_size_limit ?? null, size, mime, publicAccessBlocked: !pub.ok };
    return { ...res, ok: !!bj && !bj.public && !!ij && !pub.ok, ...(!bj ? { error: `bucket not readable (${b.status})` } : !ij ? { error: `ebook object not found (${info.status})` } : {}) };
  } catch (e) {
    return { ...base, ok: false, error: `storage request failed (${(e as Error).name})` };
  }
}

/* ── Supabase Storage: private bucket, signed URL ─────────────────────── */

async function supabaseSignedUrl() {
  const cfg = supabaseConfig();
  if (!cfg) throw new StorageError("Storage is not configured");
  const objectPath = ebookStoragePath().split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`${cfg.url}/storage/v1/object/sign/${encodeURIComponent(ebookBucket())}/${objectPath}`, {
    method: "POST",
    headers: { apikey: cfg.key, authorization: `Bearer ${cfg.key}`, "content-type": "application/json" },
    body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res?.ok) throw new StorageError(`Could not sign the download (${res?.status ?? "network"})`);
  const { signedURL } = (await res.json()) as { signedURL?: string };
  if (!signedURL) throw new StorageError("Storage returned no signed URL");
  return `${cfg.url}/storage/v1${signedURL}&download=${encodeURIComponent(DOWNLOAD_FILENAME)}`;
}

/* ── Local driver: development and automated tests only (refused on Vercel) ── */

/** The local file lives outside public/ and is git-ignored (reference/ by default). */
export function localEbookFile() {
  const p = process.env.LOCAL_EBOOK_FILE?.trim() || path.join("reference", ebookStoragePath());
  // Runtime-only path (dev/tests): excluded from build tracing so no local file is ever bundled.
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), p);
}

const sign = (secret: string, orderId: string, exp: number, nonce: string) => createHmac("sha256", secret).update(`ebook|${orderId}|${exp}|${nonce}`).digest("hex");

function localSignedUrl(orderId: string, requestOrigin?: string) {
  const secret = localStorageSecret();
  if (!secret) throw new StorageError("Local storage is disabled in this environment");
  const exp = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
  const n = randomBytes(8).toString("hex"); // every URL is unique
  const q = new URLSearchParams({ o: orderId, exp: String(exp), n, sig: sign(secret, orderId, exp, n) });
  return `${requestOrigin ?? appOrigin()}/api/download/file?${q}`;
}

/** Validates a local signed URL. Returns the order id, or a reason it's refused. */
export function checkLocalSignature(o: string | null, exp: string | null, n: string | null, sig: string | null): { ok: true; orderId: string } | { ok: false; reason: "disabled" | "invalid" | "expired" } {
  const secret = localStorageSecret();
  if (!secret || storageDriver() !== "local") return { ok: false, reason: "disabled" };
  const e = Number(exp);
  if (!o || !n || !Number.isInteger(e) || !safeEqualHex(sign(secret, o, e, n), sig)) return { ok: false, reason: "invalid" };
  if (e < Math.floor(Date.now() / 1000)) return { ok: false, reason: "expired" };
  return { ok: true, orderId: o };
}

export async function localFileExists() {
  try {
    return (await stat(localEbookFile())).isFile();
  } catch {
    return false;
  }
}
