/** Client-safe Cloudinary helpers (no secrets). MongoDB stores MediaRef; images are delivered via Cloudinary transforms. */
export interface MediaRef {
  publicId?: string;
  url: string;
  resourceType?: "image" | "video" | "raw";
  width?: number;
  height?: number;
  alt?: string;
  caption?: string;
  /** Photo-tour room, e.g. "Living room" */
  group?: string;
  sortOrder?: number;
}

const CLOUDINARY_UPLOAD = "/upload/";

/** Insert a transformation into a Cloudinary delivery URL; non-Cloudinary URLs are returned unchanged. */
export function transformUrl(url: string, transform: string): string {
  if (!url.includes("res.cloudinary.com") || !url.includes(CLOUDINARY_UPLOAD)) return url;
  return url.replace(CLOUDINARY_UPLOAD, `${CLOUDINARY_UPLOAD}${transform}/`);
}

export function imageSrcSet(url: string, widths = [480, 768, 1080, 1440, 1920], extra = "c_fill,g_auto"): string {
  if (!url.includes("res.cloudinary.com")) return "";
  return widths.map((w) => `${transformUrl(url, `f_auto,q_auto,w_${w},${extra}`)} ${w}w`).join(", ");
}

export const videoPoster = (url: string) => transformUrl(url, "so_1,f_jpg,q_auto,w_1080").replace(/\.(mp4|webm|mov)$/, ".jpg");
