import "server-only";

/**
 * Fixed-window rate limiter kept in memory. On serverless hosts each instance has its own
 * window, so this is a first line of defence; the database-backed per-order download
 * counter (store.recordDownload) is the hard limit.
 */
const g = globalThis as unknown as { __ztfcRate?: Map<string, { count: number; reset: number }> };
const buckets = () => (g.__ztfcRate ??= new Map());

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const map = buckets();
  if (map.size > 10_000) for (const [k, v] of map) if (v.reset <= now) map.delete(k);
  const b = map.get(key);
  if (!b || b.reset <= now) {
    map.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  b.count += 1;
  return b.count > limit ? { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) } : { ok: true, retryAfter: 0 };
}

/** Is `key` currently over `limit` (without counting this request)? */
export function isLimited(key: string, limit: number): { limited: boolean; retryAfter: number } {
  const b = buckets().get(key);
  const now = Date.now();
  return b && b.reset > now && b.count >= limit ? { limited: true, retryAfter: Math.ceil((b.reset - now) / 1000) } : { limited: false, retryAfter: 0 };
}

/** Counts one event (e.g. a failed login) against `key`. */
export function recordHit(key: string, windowMs: number) {
  rateLimit(key, Number.MAX_SAFE_INTEGER, windowMs);
}

/**
 * The client's IP. On Vercel, x-vercel-forwarded-for / x-real-ip are set by the platform and can't be
 * forged by the client; the first x-forwarded-for entry is only a fallback for other hosts and local runs.
 */
export function clientIp(request: Request) {
  const h = request.headers;
  return h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function tooMany(retryAfter: number) {
  return Response.json({ error: "rate_limited", message: "Too many requests. Please wait a moment and try again." }, { status: 429, headers: { "retry-after": String(retryAfter) } });
}
