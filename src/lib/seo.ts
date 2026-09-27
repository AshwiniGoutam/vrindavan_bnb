import type { Metadata } from "next";
import { appUrl } from "./utils";
import type { MediaRef } from "./media";
import { transformUrl } from "./media";

interface SeoInput {
  title: string;
  description?: string;
  path: string;
  image?: MediaRef | null;
  seo?: { metaTitle?: string; metaDescription?: string; ogImage?: MediaRef; canonicalUrl?: string; noIndex?: boolean } | null;
}

export function buildMetadata({ title, description, path, image, seo }: SeoInput): Metadata {
  const t = seo?.metaTitle || title;
  const d = seo?.metaDescription || description;
  const og = seo?.ogImage?.url || image?.url;
  const canonical = seo?.canonicalUrl || `${appUrl()}${path}`;
  return {
    title: t,
    description: d,
    alternates: { canonical },
    robots: seo?.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: t,
      description: d,
      url: canonical,
      siteName: "VHI · Vrindavan Holiday Inn",
      locale: "en_IN",
      type: "website",
      images: og ? [{ url: transformUrl(og, "f_jpg,q_auto,w_1200,h_630,c_fill,g_auto"), width: 1200, height: 630 }] : undefined,
    },
    twitter: { card: "summary_large_image", title: t, description: d },
  };
}
