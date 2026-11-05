import type { MetadataRoute } from "next";
import { product } from "@/data/product";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = product.siteUrl.replace(/\/$/, "");
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/refund`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
