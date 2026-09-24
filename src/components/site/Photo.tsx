"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Plain <img> on purpose: admins can paste image URLs from any host. Falls back to a gradient if one breaks. */
export default function Photo({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) {
    return <div role="img" aria-label={alt} className={cn("bg-linear-to-br from-pine to-lake", className)} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setBad(true)} className={cn("object-cover", className)} />;
}
