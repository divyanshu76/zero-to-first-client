"use client";

/**
 * Browser side of checkout. It only ever sees the public Razorpay Key ID (from
 * /api/checkout/config at runtime); the amount comes from the server's order.
 */
export type CheckoutConfig =
  | { enabled: false; mode: "test" | "live" | null; reason?: string }
  | { enabled: true; mode: "test" | "live"; keyId: string; amount: number; currency: string; name: string; description: string };

let configPromise: Promise<CheckoutConfig> | null = null;

export function loadCheckoutConfig(): Promise<CheckoutConfig> {
  configPromise ??= fetch("/api/checkout/config", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<CheckoutConfig>) : { enabled: false as const, mode: null }))
    .catch(() => {
      configPromise = null; // try again next time
      return { enabled: false as const, mode: null, reason: "network" };
    });
  return configPromise;
}

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open(): void; on(event: "payment.failed", cb: (r: { error?: { code?: string; description?: string } }) => void): void };
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;
declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
let scriptPromise: Promise<RazorpayCtor> | null = null;

export function loadRazorpay(): Promise<RazorpayCtor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  scriptPromise ??= new Promise<RazorpayCtor>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("script_failed")));
    s.onerror = () => {
      scriptPromise = null;
      s.remove();
      reject(new Error("script_failed"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export class ApiError extends Error {
  constructor(readonly code: string, readonly status: number, message?: string) {
    super(message ?? code);
  }
}

export async function postJson<T>(url: string, body: unknown, retries = 0): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    } catch {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
      throw new ApiError("network", 0);
    }
    const data = (await res.json().catch(() => ({}))) as T & { error?: string; message?: string };
    if (res.ok) return data;
    if (res.status >= 500 && attempt < retries) {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      continue;
    }
    throw new ApiError(data.error ?? "generic", res.status, data.message);
  }
}

export type { RazorpayResponse };

export const TOKEN_KEY = "ztfc-purchase-token";
export function rememberToken(token: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {}
}
export function recallToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
