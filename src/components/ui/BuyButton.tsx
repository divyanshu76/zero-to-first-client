"use client";

import { useEffect, useId, useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import { isPurchasable, pricing, type CurrencyCode } from "@/data/product";
import type { Dictionary } from "@/i18n/dictionaries/en";
import dynamic from "next/dynamic";
import { loadCheckoutConfig, postJson, type CheckoutConfig } from "@/components/commerce/checkout-client";
import type { ResumePrefill } from "@/components/commerce/CheckoutDialog";

// Loaded only when checkout is enabled, so the landing page's JavaScript doesn't grow.
const CheckoutDialog = dynamic(() => import("@/components/commerce/CheckoutDialog").then((m) => m.CheckoutDialog), { ssr: false });

/** The `buy` strings plus the checkout dialog's strings, passed down from the page. */
export type BuyStrings = Dictionary["buy"] & { checkout?: Dictionary["checkout"] };

type Props = {
  label: string;
  /** Pre-launch explanation shown when no checkout is configured. */
  notice: string;
  /** Button text while navigating to checkout. */
  redirecting: string;
  currency?: CurrencyCode;
  variant?: "primary" | "dark" | "light";
  size?: "md" | "lg";
  className?: string;
  noticeAlign?: "left" | "center";
  /** Strings for the on-site Razorpay checkout. Used only when the server reports checkout as enabled. */
  checkout?: Dictionary["checkout"];
  /** This button opens the checkout for a "Continue checkout" reminder link (#resume=…). Set on one button per page. */
  resumeHost?: boolean;
};

const base =
  "press group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-display font-semibold focus-visible:outline-offset-4 disabled:cursor-progress disabled:opacity-80";
const variants = {
  primary: "bg-violet text-white shadow-[0_10px_28px_-12px_rgb(109_40_217/0.7)] hover:bg-violet-press",
  dark: "bg-ink text-white hover:bg-black",
  light: "bg-white text-ink hover:bg-paper",
};
const sizes = { md: "h-12 px-6 text-[0.95rem]", lg: "h-14 px-8 text-base" };

/**
 * Purchase CTA. With a configured hosted checkout it navigates there once (no double
 * submission) and shows a loading state. Without one it explains that checkout isn't
 * open. It never simulates a purchase; payment is confirmed server-side by the provider.
 */
export function BuyButton({ label, notice, redirecting: redirectingLabel, currency = "INR", variant = "primary", size = "lg", className = "", noticeAlign = "left", checkout, resumeHost = false }: Props) {
  const preferred = pricing[currency];
  const target = isPurchasable(preferred) ? preferred : isPurchasable(pricing.INR) ? pricing.INR : isPurchasable(pricing.USD) ? pricing.USD : null;
  const [open, setOpen] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const noticeId = useId();
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resume, setResume] = useState<ResumePrefill | null>(null);

  // Checkout availability is decided by the server at request time (no rebuild to switch it on or off).
  useEffect(() => {
    if (!checkout) return;
    let live = true;
    loadCheckoutConfig().then((c) => live && setConfig(c));
    return () => {
      live = false;
    };
  }, [checkout]);

  // "Continue checkout" from a reminder email: /#resume=<token>. The token stays in the fragment, so it
  // never reaches server logs; it is read once, removed from the address bar, and checked by the server.
  const configEnabled = config?.enabled === true;
  useEffect(() => {
    if (!resumeHost || !configEnabled) return;
    const m = /^#resume=([A-Za-z0-9_-]{43})$/.exec(window.location.hash);
    if (!m) return;
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}#pricing`);
    document.getElementById("pricing")?.scrollIntoView({ block: "start" });
    let live = true;
    postJson<{ name: string; email: string; phone: string }>("/api/recovery/resume", { token: m[1] })
      .then((d) => live && setResume({ ...d, token: m[1] }))
      .catch(() => live && setResume({ expired: true }))
      .finally(() => live && setDialogOpen(true));
    return () => {
      live = false;
    };
  }, [resumeHost, configEnabled]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setOpen(false), 6000);
    return () => window.clearTimeout(t);
  }, [open]);

  // Returning with the back button (bfcache) must not leave the button stuck in "redirecting".
  useEffect(() => {
    const reset = () => setRedirecting(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (checkout && config?.enabled) {
    return (
      <>
        <button type="button" className={cls} aria-haspopup="dialog" onClick={() => setDialogOpen(true)} data-checkout="razorpay">
          {label}
        </button>
        {dialogOpen ? (
          <CheckoutDialog
            t={checkout}
            config={config}
            open={dialogOpen}
            resume={resume}
            onClose={() => {
              setDialogOpen(false);
              setResume(null);
            }}
          />
        ) : null}
      </>
    );
  }

  if (target?.checkoutUrl) {
    const url = target.checkoutUrl;
    return (
      <button
        type="button"
        className={cls}
        disabled={redirecting}
        aria-busy={redirecting}
        onClick={() => {
          if (redirecting) return;
          setRedirecting(true);
          window.location.assign(url);
        }}
      >
        {redirecting ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
        {redirecting ? redirectingLabel : label}
      </button>
    );
  }

  return (
    <span className={`relative inline-flex flex-col ${noticeAlign === "center" ? "items-center" : "items-start"} ${className.includes("w-full") ? "w-full sm:w-auto" : ""}`}>
      <button type="button" className={cls} aria-describedby={open ? noticeId : undefined} onClick={() => setOpen((v) => !v)}>
        {label}
      </button>
      {/* Collapsed: no padding, border or margin, so the empty live region takes no space. */}
      <span
        id={noticeId}
        role="status"
        aria-live="polite"
        className={`flex max-w-xs items-start gap-2 rounded-xl bg-white text-left text-[0.8rem] leading-snug text-ink-2 transition-opacity ${
          open ? "mt-3 border border-line px-3.5 py-2.5 opacity-100 shadow-sm" : "pointer-events-none h-0 overflow-hidden opacity-0"
        }`}
      >
        {open ? (
          <>
            <Clock aria-hidden className="mt-0.5 size-3.5 shrink-0 text-violet" />
            {notice}
          </>
        ) : null}
      </span>
    </span>
  );
}
