import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  const production = process.env.APP_ENV === "production";
  return {
    rules: production ? [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/checkout", "/booking"] }] : [{ userAgent: "*", disallow: "/" }],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
