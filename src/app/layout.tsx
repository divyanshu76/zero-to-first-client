import type { Metadata, Viewport } from "next";
import { Inter, Manrope, Instrument_Serif } from "next/font/google";
import { brand, product } from "@/data/product";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["500", "600", "700", "800"], display: "swap" });
const serif = Instrument_Serif({ variable: "--font-serif-accent", subsets: ["latin"], weight: "400", style: ["normal", "italic"], display: "swap" });

const title = "Zero to First Client — The AI-Powered Business Starter Kit (2026 Edition)";
const description =
  "A practical, step-by-step handbook for starting an AI-assisted service business: choose a service, build an offer, price it, reach out and work towards your first paying client. 10 chapters, 141 prompts, 20 templates, 7 calculators.";

export const metadata: Metadata = {
  metadataBase: new URL(product.siteUrl),
  title: { default: title, template: `%s — ${product.displayName}` },
  description,
  applicationName: product.displayName,
  authors: [{ name: brand.publisher, url: brand.publisherUrl }],
  publisher: brand.seller,
  creator: brand.publisher,
  keywords: [
    "AI business starter kit",
    "how to start freelancing with AI",
    "first freelance client guide",
    "AI-powered services",
    "beginner freelancing guide",
    "start a service business",
    "freelancing with AI in India",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: `${product.displayName} by ${brand.seller}`,
    title,
    description,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#FAF9F6",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${manrope.variable} ${serif.variable} antialiased`}>
      <head>
        {/* Opt in to scroll-reveal styles only when JS runs, so content is never hidden without it. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
