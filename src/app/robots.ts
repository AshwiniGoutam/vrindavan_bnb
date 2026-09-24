import type { MetadataRoute } from "next";
import { site } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/account", "/booking/", "/login", "/register", "/reset-password"] }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
