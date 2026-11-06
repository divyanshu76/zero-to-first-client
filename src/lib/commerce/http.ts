import "server-only";

export const NO_STORE = { "cache-control": "no-store, max-age=0", "x-robots-tag": "noindex" } as const;

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export const fail = (status: number, error: string, message: string) => json({ error, message }, status);

/** Parses a small JSON body (max 4 KB). Returns null on anything malformed. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.headers.get("content-type")?.includes("application/json")) return null;
  const text = await request.text().catch(() => "");
  if (!text || text.length > 4096) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Browser-facing POSTs must come from this site (blocks cross-site form/fetch abuse). */
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return new URL(origin).host === (request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  } catch {
    return false;
  }
}

export const crossSite = () => fail(403, "forbidden", "Request blocked.");
export const badRequest = (message = "The request was not valid.") => fail(400, "invalid_request", message);

export const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max + 1) : "");

export function cleanName(v: unknown) {
  // Collapse whitespace; drop control and markup characters.
  const s = str(v, 100).replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim();
  return s.length >= 2 && s.length <= 100 ? s : null;
}

export function cleanEmail(v: unknown) {
  const s = str(v, 254).toLowerCase();
  return s.length <= 254 && /^[^\s@"<>()\[\],;:]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(s) ? s : null;
}

/**
 * Indian mobile number → "+91XXXXXXXXXX". Accepts spaces, dashes, brackets and a leading
 * +91 / 91 / 0. A valid number has 10 digits starting with 6–9. Anything else is rejected.
 */
export function cleanPhone(v: unknown) {
  const digits = str(v, 24).replace(/[\s\-().]/g, "");
  const m = /^(?:\+?91|0)?([6-9]\d{9})$/.exec(digits);
  return m ? `+91${m[1]}` : null;
}

export const cleanLocale = (v: unknown): "en" | "hi" => (v === "hi" ? "hi" : "en");

export function maskEmail(email: string) {
  const [u, d] = email.split("@");
  return `${u.slice(0, 2)}${"•".repeat(Math.max(1, Math.min(6, u.length - 2)))}@${d}`;
}
