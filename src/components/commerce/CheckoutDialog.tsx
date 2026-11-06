"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, Lock, X } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { ApiError, loadRazorpay, postJson, rememberToken, type CheckoutConfig, type RazorpayResponse } from "./checkout-client";

type Strings = Dictionary["checkout"];
type Phase = "form" | "starting" | "paying" | "verifying";
type ErrorKey = keyof Strings["errors"];

/** Same rule as the server: optional +91 / 91 / 0, then 10 digits starting 6–9. */
const PHONE = /^(?:\+?91|0)?([6-9]\d{9})$/;
const normalisePhone = (v: string) => PHONE.exec(v.replace(/[\s\-().]/g, ""))?.[1] ?? null;

const EMAIL = /^[^\s@"<>()[\],;:]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

/**
 * Collects name + email, creates the order on the server, then opens Razorpay Standard
 * Checkout. Success is decided only by /api/checkout/verify, never by this component.
 */
export function CheckoutDialog({ t, config, open, onClose }: { t: Strings; config: Extract<CheckoutConfig, { enabled: true }>; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [fieldError, setFieldError] = useState<"name" | "email" | "phone" | null>(null);
  const [errorCode, setErrorCode] = useState("");
  const busy = useRef(false);
  const ids = { title: useId(), name: useId(), email: useId(), phone: useId(), phoneHint: useId(), hint: useId(), err: useId() };

  const locale = typeof document !== "undefined" && document.documentElement.lang === "hi" ? "hi" : "en";
  const href = (p: string) => (locale === "hi" ? `/hi${p}` : p);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && phase !== "paying" && !d.open) d.showModal();
    if ((!open || phase === "paying") && d.open) d.close();
  }, [open, phase]);

  const fail = (key: ErrorKey, code = "") => {
    busy.current = false;
    setErrorCode(code);
    setError(key);
    setPhase("form");
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current) return; // duplicate submit guard
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const email = String(f.get("email") ?? "").trim();
    setError(null);
    if (name.length < 2 || name.length > 100) return setFieldError("name");
    if (!EMAIL.test(email)) return setFieldError("email");
    const mobile = normalisePhone(String(f.get("phone") ?? ""));
    if (!mobile) return setFieldError("phone");
    setFieldError(null);
    busy.current = true;
    setPhase("starting");

    let order: { orderId: string; razorpayOrderId: string; amount: number; currency: string };
    let Razorpay: Awaited<ReturnType<typeof loadRazorpay>>;
    try {
      [order, Razorpay] = await Promise.all([
        postJson<typeof order>("/api/checkout/create-order", { name, email, phone: mobile, locale, website: f.get("website") }),
        loadRazorpay(),
      ]);
    } catch (err) {
      // Known codes get their own message; anything else names the code so support can trace it.
      const code = err instanceof ApiError ? err.code : (err as Error).message || "unknown";
      const status = err instanceof ApiError ? err.status : 0;
      if (Object.hasOwn(t.errors, code) && code !== "generic") return fail(code as ErrorKey);
      console.warn(`[checkout] create-order failed: ${code} (${status})`);
      return fail("generic", `${code}${status ? `/${status}` : ""}`);
    }

    let failed = false;
    let settled = false;
    const rzp = new Razorpay({
      key: config.keyId,
      order_id: order.razorpayOrderId,
      amount: order.amount,
      currency: order.currency,
      name: config.name,
      description: config.description,
      // Prefilled contact: Razorpay's window then doesn't ask for (and re-validate) a mobile number.
      prefill: { name, email, contact: `+91${mobile}` },
      notes: { internal_order_id: order.orderId },
      theme: { color: "#6d28d9" },
      retry: { enabled: true },
      modal: {
        confirm_close: true,
        ondismiss: () => {
          if (settled) return;
          busy.current = false;
          if (!failed) void postJson("/api/checkout/cancel", { orderId: order.orderId, razorpayOrderId: order.razorpayOrderId }).catch(() => {});
          setError(failed ? "payment_failed" : "cancelled");
          setPhase("form");
        },
      },
      handler: async (resp: RazorpayResponse) => {
        settled = true;
        setPhase("verifying");
        try {
          const r = await postJson<{ status: string; token: string }>("/api/checkout/verify", resp, 3);
          rememberToken(r.token);
          ref.current?.close();
          // A full page load, not router.push: a client navigation keeps the previous page mounted
          // (hidden), and Safari/WebKit then keeps the page inert from the closed modal.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign(`${href("/purchase/success")}#t=${r.token}`);
        } catch (err) {
          const code = err instanceof ApiError ? err.code : "network";
          console.warn(`[checkout] verify failed: ${code}`);
          fail(code === "payment_failed" ? "payment_failed" : code === "invalid_signature" || code === "payment_mismatch" ? "invalid_signature" : "verify_pending");
        }
      },
    });
    rzp.on("payment.failed", () => {
      failed = true; // Razorpay keeps its window open so the buyer can retry
    });
    setPhase("paying");
    rzp.open();
  }

  const working = phase === "starting" || phase === "verifying";

  return (
    <dialog
      ref={ref}
      aria-labelledby={ids.title}
      data-testid="checkout-dialog"
      onCancel={(e) => {
        if (working) e.preventDefault();
        else onClose();
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/50 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={onSubmit} noValidate className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={ids.title} className="font-display text-xl font-bold">{t.title}</h2>
            {config.mode === "test" ? (
              <span className="mt-1.5 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[0.7rem] font-bold tracking-wide text-amber-900 uppercase" data-testid="test-mode-badge">{t.testBadge}</span>
            ) : null}
          </div>
          <button type="button" onClick={onClose} disabled={working} aria-label={t.close} className="press -mt-1 -mr-1 grid size-9 place-items-center rounded-full text-ink-2 hover:bg-paper hover:text-ink disabled:opacity-40">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">{t.intro}</p>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3 text-sm">
          <span className="min-w-0 text-ink-2">{t.product}</span>
          <span className="shrink-0 text-right"><span className="block text-[0.7rem] text-ink-2">{t.total}</span><b className="font-display text-lg">₹{(config.amount / 100).toLocaleString("en-IN")}</b></span>
        </div>

        <label htmlFor={ids.name} className="mt-5 block text-sm font-semibold">{t.nameLabel}</label>
        <input
          id={ids.name} name="name" autoComplete="name" required minLength={2} maxLength={100} disabled={working}
          aria-invalid={fieldError === "name"} aria-describedby={fieldError === "name" ? ids.err : undefined}
          className="mt-1.5 h-12 w-full rounded-xl border border-line-strong bg-white px-3.5 text-base outline-none focus:border-violet focus:ring-2 focus:ring-violet/25 aria-[invalid=true]:border-red-500"
        />
        <label htmlFor={ids.email} className="mt-4 block text-sm font-semibold">{t.emailLabel}</label>
        <input
          id={ids.email} name="email" type="email" inputMode="email" autoComplete="email" required maxLength={254} disabled={working}
          aria-invalid={fieldError === "email"} aria-describedby={`${ids.hint}${fieldError === "email" ? ` ${ids.err}` : ""}`}
          className="mt-1.5 h-12 w-full rounded-xl border border-line-strong bg-white px-3.5 text-base outline-none focus:border-violet focus:ring-2 focus:ring-violet/25 aria-[invalid=true]:border-red-500"
        />
        <p id={ids.hint} className="mt-1.5 text-xs text-ink-2">{t.emailHint}</p>
        <label htmlFor={ids.phone} className="mt-4 block text-sm font-semibold">{t.phoneLabel}</label>
        <div className="mt-1.5 flex h-12 w-full items-stretch overflow-hidden rounded-xl border border-line-strong bg-white focus-within:border-violet focus-within:ring-2 focus-within:ring-violet/25 has-[[aria-invalid=true]]:border-red-500">
          <span aria-hidden className="grid place-items-center border-r border-line bg-paper px-3 text-base text-ink-2">+91</span>
          <input
            id={ids.phone} name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" required maxLength={16} disabled={working}
            aria-invalid={fieldError === "phone"} aria-describedby={`${ids.phoneHint}${fieldError === "phone" ? ` ${ids.err}` : ""}`}
            className="min-w-0 flex-1 bg-transparent px-3.5 text-base outline-none"
          />
        </div>
        <p id={ids.phoneHint} className="mt-1.5 text-xs text-ink-2">{t.phoneHint}</p>
        {/* Honeypot for bots; hidden from people and assistive tech. */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />

        <p id={ids.err} role="alert" className="mt-3 min-h-0 text-sm font-medium text-red-700 empty:hidden" data-testid="checkout-error">
          {fieldError ? t.errors[fieldError === "name" ? "invalid_name" : fieldError === "email" ? "invalid_email" : "invalid_phone"] : error ? t.errors[error].replace("{code}", errorCode || "unknown") : ""}
        </p>

        <button type="submit" disabled={working} aria-busy={working} className="press mt-5 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-violet px-6 font-display font-semibold text-white shadow-[0_10px_28px_-12px_rgb(109_40_217/0.7)] hover:bg-violet-press disabled:cursor-progress disabled:opacity-80">
          {working ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Lock aria-hidden className="size-4" />}
          {phase === "starting" ? t.starting : phase === "verifying" ? t.verifying : t.pay}
        </button>

        {config.mode === "test" ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">{t.testNote}</p> : null}
        <p className="mt-3 text-xs leading-relaxed text-ink-2">{t.secure}</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-2">
          {t.policiesBefore}
          {(["/terms", "/refund", "/delivery", "/privacy"] as const).map((p, i) => (
            <span key={p}>
              {i > 0 ? ", " : ""}
              <a className="font-semibold text-ink underline-offset-4 hover:underline" href={href(p)}>{t.policyLinks[i]}</a>
            </span>
          ))}
          {t.policiesAfter}
        </p>
      </form>
    </dialog>
  );
}
