import type { MetadataRoute } from "next";
import { product } from "@/data/product";

const POLICY_PATHS = ["/privacy", "/terms", "/refund", "/delivery", "/disclaimer", "/copyright", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = product.siteUrl.replace(/\/$/, "");
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    ...POLICY_PATHS.map((p) => ({ url: `${base}${p}`, changeFrequency: "yearly" as const, priority: 0.3 })),
  ];
}
