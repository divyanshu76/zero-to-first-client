import type { MetadataRoute } from "next";
import { product } from "@/data/product";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin/", "/purchase/", "/hi/purchase/"] },
    sitemap: `${product.siteUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
