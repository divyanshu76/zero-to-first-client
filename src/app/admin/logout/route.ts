import { NO_STORE } from "@/lib/commerce/http";

/**
 * HTTP Basic auth has no server session to end. Answering 401 for the admin realm makes most
 * browsers drop the cached credentials; closing the browser window always does.
 */
export function GET() {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Signed out</title></head>
<body style="font:15px/1.6 system-ui,sans-serif;background:#faf9f6;color:#0b0b0f;display:grid;place-items:center;min-height:100vh;margin:0">
<main style="max-width:420px;padding:28px;background:#fff;border:1px solid #e9e6ee;border-radius:16px"><h1 style="margin:0 0 8px;font-size:20px">Signed out</h1>
<p style="margin:0 0 16px;color:#64616b">Your admin credentials were cleared for this browser. For complete safety on a shared computer, close the browser window.</p>
<a href="/admin/orders" style="color:#6d28d9;font-weight:600">Sign in again</a></main></body></html>`,
    { status: 401, headers: { ...NO_STORE, "content-type": "text/html; charset=utf-8", "www-authenticate": 'Basic realm="CRAFT & CODE admin", charset="UTF-8"', "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'" } },
  );
}
