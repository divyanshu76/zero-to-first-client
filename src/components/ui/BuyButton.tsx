"use client";

import { useEffect, useId, useState } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { isPurchasable, pricing, type CurrencyCode } from "@/data/product";

type Props = {
  label: string;
  currency?: CurrencyCode;
  variant?: "primary" | "dark" | "light";
  size?: "md" | "lg";
  className?: string;
  /** Where the pre-launch notice appears relative to the button. */
  noticeAlign?: "left" | "center";
};

const base =
  "group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-display font-semibold transition-all duration-200 focus-visible:outline-offset-4 disabled:cursor-not-allowed";
const variants = {
  primary: "bg-violet text-white shadow-[0_10px_30px_-10px_rgb(109_40_217/0.65)] hover:bg-[#5b21b6] hover:shadow-[0_14px_36px_-10px_rgb(109_40_217/0.7)]",
  dark: "bg-ink text-white hover:bg-black",
  light: "bg-white text-ink hover:bg-paper",
};
const sizes = { md: "h-12 px-6 text-[0.95rem]", lg: "h-14 px-8 text-base" };

/**
 * Purchase CTA. Opens the configured hosted checkout when a price and checkout
 * URL exist; otherwise explains that checkout isn't open yet — it never fakes a sale.
 */
export function BuyButton({ label, currency = "INR", variant = "primary", size = "lg", className = "", noticeAlign = "left" }: Props) {
  const config = pricing[currency];
  const live = isPurchasable(config) || isPurchasable(pricing.INR) || isPurchasable(pricing.USD);
  const target = isPurchasable(config) ? config : isPurchasable(pricing.INR) ? pricing.INR : pricing.USD;
  const [open, setOpen] = useState(false);
  const noticeId = useId();

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setOpen(false), 6000);
    return () => window.clearTimeout(t);
  }, [open]);

  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (live && target.checkoutUrl) {
    return (
      <a href={target.checkoutUrl} className={cls} rel="noopener">
        {label}
        <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
      </a>
    );
  }

  return (
    <span className={`relative inline-flex flex-col ${noticeAlign === "center" ? "items-center" : "items-start"}`}>
      <button type="button" className={cls} aria-describedby={open ? noticeId : undefined} onClick={() => setOpen((v) => !v)}>
        {label}
        <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
      </button>
      <span
        id={noticeId}
        role="status"
        aria-live="polite"
        // Collapsed: no padding, border or margin, so the empty live region takes no space and the CTA rows line up.
        className={`flex max-w-xs items-start gap-2 rounded-xl bg-white text-left text-[0.8rem] leading-snug text-ink-2 transition-opacity ${
          open ? "mt-3 border border-line px-3.5 py-2.5 opacity-100 shadow-sm" : "pointer-events-none h-0 overflow-hidden opacity-0"
        }`}
      >
        {open ? (
          <>
            <Clock aria-hidden className="mt-0.5 size-3.5 shrink-0 text-violet" />
            Checkout isn&apos;t open yet. Pricing and payment will appear here at launch.
          </>
        ) : null}
      </span>
    </span>
  );
}
