import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { site } from "@/lib/config";
import { slugify } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stays, cities, blogs] = await Promise.all([
    db.stay.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    db.stay.findMany({ where: { published: true }, distinct: ["city"], select: { city: true } }),
    db.blog.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const now = new Date();
  return [
    ...["", "/stays", "/blog", "/about", "/contact", "/terms", "/privacy", "/cancellation-policy"].map((p) => ({ url: `${site.url}${p}`, lastModified: now })),
    ...cities.map((c) => ({ url: `${site.url}/destinations/${slugify(c.city)}`, lastModified: now })),
    ...stays.map((s) => ({ url: `${site.url}/stays/${s.slug}`, lastModified: s.updatedAt })),
    ...blogs.map((b) => ({ url: `${site.url}/blog/${b.slug}`, lastModified: b.updatedAt })),
  ];
}
