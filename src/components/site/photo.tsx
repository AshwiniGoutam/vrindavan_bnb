import { imageSrcSet, transformUrl, type MediaRef } from "@/lib/media";
import { cn } from "@/lib/utils";

interface PhotoProps {
  media?: MediaRef | null;
  alt?: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  /** Aspect crop hint for Cloudinary, e.g. "ar_4:5" */
  crop?: string;
  label?: string;
}

/**
 * Responsive Cloudinary image with a warm on-brand placeholder when no image has been uploaded yet.
 * Plain <img> + srcset: Cloudinary does the optimisation (f_auto, q_auto, g_auto).
 */
export function Photo({ media, alt, className, imgClassName, sizes = "100vw", priority, crop, label }: PhotoProps) {
  if (!media?.url) {
    return (
      <div className={cn("photo-fallback relative flex items-end overflow-hidden", className)} role="img" aria-label={alt ?? label ?? "Image coming soon"}>
        {label ? <span className="eyebrow m-4 text-[0.62rem] text-umber/70">{label}</span> : null}
      </div>
    );
  }
  const extra = ["c_fill", "g_auto", crop].filter(Boolean).join(",");
  return (
    <div className={cn("relative overflow-hidden bg-linen", className)}>
      <img
        src={transformUrl(media.url, `f_auto,q_auto,w_1600,${extra}`)}
        srcSet={imageSrcSet(media.url, undefined, extra) || undefined}
        sizes={sizes}
        alt={alt ?? media.alt ?? ""}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={cn("absolute inset-0 h-full w-full object-cover", imgClassName)}
      />
    </div>
  );
}
