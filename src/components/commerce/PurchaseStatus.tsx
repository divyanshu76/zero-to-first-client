"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Download, FileText, Loader2, Mail, XCircle } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/en";
import { ApiError, postJson, recallToken, rememberToken } from "./checkout-client";

type T = Dictionary["purchase"];
type View =
  | { kind: "loading" }
  | { kind: "paid"; orderId: string; email: string; emailStatus: string; amount: number; currency: string; paidAt: string | null }
  | { kind: "processing"; orderId: string; slow: boolean }
  | { kind: "failed" | "cancelled" | "refunded"; orderId: string }
  | { kind: "invalid" | "expired" | "none" | "unavailable" };

const fill = (s: string, email: string) => s.replace("{email}", email);

/**
 * The success page body. It shows a purchase only after the backend confirms it; the token
 * (from the email link or checkout) is read from the URL fragment, which is never sent to
 * servers or analytics, then kept in sessionStorage and removed from the address bar.
 */
export function PurchaseStatus({ t, locale, supportHref }: { t: T; locale: "en" | "hi"; supportHref: string }) {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [token, setToken] = useState<string | null>(null);
  const [dl, setDl] = useState<{ busy: boolean; msg: string | null; error: boolean }>({ busy: false, msg: null, error: false });
  const polls = useRef(0);
  const home = locale === "hi" ? "/hi" : "/";

  const check = useCallback((tok: string) => {
    const run = async (): Promise<void> => {
      try {
        const r = await postJson<{ status: string; orderId: string; email?: string; emailStatus?: string; amount?: number; currency?: string; paidAt?: string | null }>("/api/purchase/status", { token: tok }, 2);
        if (r.status === "paid") return setView({ kind: "paid", orderId: r.orderId, email: r.email ?? "", emailStatus: r.emailStatus ?? "pending", amount: r.amount ?? 0, currency: r.currency ?? "INR", paidAt: r.paidAt ?? null });
        if (r.status === "failed" || r.status === "cancelled" || r.status === "refunded") return setView({ kind: r.status, orderId: r.orderId });
        polls.current += 1;
        setView({ kind: "processing", orderId: r.orderId, slow: polls.current > 20 });
        if (polls.current <= 60) window.setTimeout(() => void run(), polls.current < 10 ? 3000 : 6000);
      } catch (e) {
        const code = e instanceof ApiError ? e.code : "";
        setView({ kind: code === "invalid_link" ? "invalid" : code === "link_expired" ? "expired" : "unavailable" });
      }
    };
    return run();
  }, []);

  useEffect(() => {
    const load = () => {
      const m = /(?:^|[#&])t=([A-Za-z0-9_-]+)/.exec(window.location.hash);
      const tok = m?.[1] ?? recallToken();
      if (m) {
        rememberToken(m[1]);
        history.replaceState(history.state, "", window.location.pathname + window.location.search); // keep the token out of the address bar
      }
      if (!tok) return setView({ kind: "none" });
      polls.current = 0;
      setToken(tok);
      setView({ kind: "loading" });
      void check(tok);
    };
    load();
    // Opening another emailed link in this tab only changes the fragment.
    window.addEventListener("hashchange", load);
    return () => window.removeEventListener("hashchange", load);
  }, [check]);

  async function download() {
    if (!token || dl.busy) return;
    setDl({ busy: true, msg: null, error: false });
    try {
      const r = await postJson<{ url: string }>("/api/download", { token }, 1);
      setDl({ busy: false, msg: t.downloadStarted, error: false });
      window.location.assign(r.url);
    } catch (e) {
      const code = (e instanceof ApiError ? e.code : "generic") as keyof T["downloadErrors"];
      setDl({ busy: false, msg: t.downloadErrors[code] ?? t.downloadErrors.generic, error: true });
    }
  }

  const [rc, setRc] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  async function receipt() {
    if (!token || rc.busy) return;
    setRc({ busy: true, error: null });
    try {
      const res = await fetch("/api/purchase/receipt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }), cache: "no-store" });
      if (!res.ok) {
        const code = ((await res.json().catch(() => ({}))) as { error?: string }).error as keyof T["downloadErrors"];
        return setRc({ busy: false, error: t.downloadErrors[code] ?? t.downloadErrors.generic });
      }
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "Payment-Receipt.pdf";
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setRc({ busy: false, error: null });
    } catch {
      setRc({ busy: false, error: t.downloadErrors.generic });
    }
  }

  const head = (icon: React.ReactNode, title: string, body: string) => (
    <div className="flex gap-4">
      <div className="mt-1 shrink-0">{icon}</div>
      <div className="min-w-0">
        <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
        <p className="mt-2 leading-relaxed text-ink-2">{body}</p>
      </div>
    </div>
  );

  return (
    <div data-testid="purchase-status" data-state={view.kind} className="space-y-6">
      <section aria-live="polite" className="rounded-3xl border border-line bg-white p-6 shadow-sm sm:p-8">
        {view.kind === "loading" ? (
          <p className="flex items-center gap-3 text-ink-2"><Loader2 aria-hidden className="size-5 animate-spin text-violet" /> {t.loading}</p>
        ) : view.kind === "paid" ? (
          <>
            {head(<CheckCircle2 aria-hidden className="size-8 text-emerald-600" />, t.paidTitle, t.paidBody)}
            <dl className="mt-5 grid gap-x-6 gap-y-3 rounded-2xl bg-paper px-4 py-4 text-sm sm:grid-cols-2" data-testid="order-summary">
              <div className="sm:col-span-2"><dt className="text-ink-2">{t.product}</dt><dd className="font-semibold text-ink">ZERO TO FIRST CLIENT · 2026 Edition</dd></div>
              <div><dt className="text-ink-2">{t.orderId}</dt><dd className="font-mono text-[0.82rem] break-all text-ink">{view.orderId}</dd></div>
              <div><dt className="text-ink-2">{t.amountPaid}</dt><dd className="font-semibold text-ink">₹{(view.amount / 100).toLocaleString("en-IN")} {view.currency}</dd></div>
              {view.paidAt ? <div className="sm:col-span-2"><dt className="text-ink-2">{t.paidOn}</dt><dd className="text-ink">{new Date(view.paidAt).toLocaleString(locale === "hi" ? "hi-IN" : "en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST</dd></div> : null}
            </dl>
            <p className="mt-4 flex items-start gap-2 text-sm text-ink-2">
              <Mail aria-hidden className="mt-0.5 size-4 shrink-0 text-violet" />
              {fill(view.emailStatus === "sent" ? t.emailSent : view.emailStatus === "failed" ? t.emailFailed : t.emailPending, view.email)}
            </p>
            <button type="button" onClick={download} disabled={dl.busy} aria-busy={dl.busy} className="press mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-violet px-8 font-display font-semibold text-white hover:bg-violet-press disabled:opacity-80 sm:w-auto" data-testid="download-button">
              {dl.busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Download aria-hidden className="size-4" />}
              {dl.busy ? t.preparing : t.download}
            </button>
            <button type="button" onClick={receipt} disabled={rc.busy} aria-busy={rc.busy} className="press mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-line-strong bg-white px-6 font-display font-semibold text-ink hover:bg-paper disabled:opacity-70 sm:mt-0 sm:ml-3 sm:w-auto" data-testid="receipt-button">
              {rc.busy ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <FileText aria-hidden className="size-4" />}
              {t.receipt}
            </button>
            {rc.error ? <p role="alert" className="mt-3 text-sm font-medium text-red-700">{rc.error}</p> : null}
            {dl.msg ? <p role={dl.error ? "alert" : "status"} className={`mt-3 text-sm ${dl.error ? "font-medium text-red-700" : "text-ink-2"}`} data-testid="download-message">{dl.msg}</p> : null}
          </>
        ) : view.kind === "processing" ? (
          <>
            {head(<Clock aria-hidden className="size-8 text-amber-600" />, t.processingTitle, view.slow ? t.processingSlow : t.processingBody)}
            <p className="mt-4 text-sm text-ink-2">{t.orderId}: <code className="font-mono text-ink">{view.orderId}</code></p>
          </>
        ) : view.kind === "failed" || view.kind === "cancelled" || view.kind === "refunded" ? (
          <>
            {head(<XCircle aria-hidden className="size-8 text-red-600" />, t[`${view.kind}Title`], t[`${view.kind}Body`])}
            <a href={`${home === "/" ? "" : home}/#pricing`} className="press mt-6 inline-flex h-12 items-center rounded-full bg-ink px-6 font-display font-semibold text-white">{t.tryAgain}</a>
          </>
        ) : view.kind === "unavailable" ? (
          <>
            {head(<AlertCircle aria-hidden className="size-8 text-amber-600" />, t.title, t.unavailable)}
            <button type="button" onClick={() => token && (setView({ kind: "loading" }), void check(token))} className="press mt-6 inline-flex h-12 items-center rounded-full bg-ink px-6 font-display font-semibold text-white">{t.retry}</button>
          </>
        ) : (
          head(<AlertCircle aria-hidden className="size-8 text-ink-2" />, t[`${view.kind === "none" ? "noToken" : view.kind}Title`], t[`${view.kind === "none" ? "noToken" : view.kind}Body`])
        )}
      </section>

      {view.kind !== "loading" ? <ResendForm t={t} locale={locale} /> : null}

      <p className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <a href={supportHref} className="link-underline font-semibold text-ink">{t.support}</a>
        <a href={home} className="link-underline font-semibold text-ink-2">{t.backHome}</a>
      </p>
    </div>
  );
}

function ResendForm({ t, locale }: { t: T; locale: "en" | "hi" }) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  return (
    <section className="rounded-3xl border border-line bg-paper-2/60 p-6 sm:p-8">
      <h2 className="font-display text-lg font-bold text-ink">{t.resendTitle}</h2>
      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          if (state === "busy") return;
          const email = String(new FormData(e.currentTarget).get("email") ?? "");
          setState("busy");
          try {
            await postJson("/api/purchase/resend", { email, locale });
            setState("sent");
          } catch {
            setState("error");
          }
        }}
      >
        <label className="min-w-0 flex-1 text-sm font-semibold text-ink">
          {t.resendLabel}
          <input name="email" type="email" required autoComplete="email" inputMode="email" className="mt-1.5 block h-12 w-full rounded-xl border border-line-strong bg-white px-3.5 text-base font-normal outline-none focus:border-violet focus:ring-2 focus:ring-violet/25" />
        </label>
        <button type="submit" disabled={state === "busy"} className="press inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 font-display font-semibold text-white disabled:opacity-70">
          {state === "busy" ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          {t.resendButton}
        </button>
      </form>
      {state === "sent" ? <p role="status" className="mt-3 text-sm text-ink-2" data-testid="resend-message">{t.resendSent}</p> : null}
      {state === "error" ? <p role="alert" className="mt-3 text-sm font-medium text-red-700">{t.unavailable}</p> : null}
    </section>
  );
}
