import type { MetadataRoute } from "next";
import { listSlugs } from "@/server/services/catalog.service";
import { appUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const { stays, tours, packages } = await listSlugs();
  const now = new Date();
  const fixed = ["", "/stays", "/stay-food", "/darshan-tours", "/about", "/contact", "/faq", "/privacy-policy", "/terms", "/cancellation-policy"];
  return [
    ...fixed.map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 })),
    ...stays.map((s) => ({ url: `${base}/stays/${s}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...tours.map((s) => ({ url: `${base}/darshan-tours/${s}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.9 })),
    ...packages.map((s) => ({ url: `${base}/stay-food/${s}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
