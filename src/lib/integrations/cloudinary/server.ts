import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";

export const MEDIA_FOLDERS = ["properties", "tours", "packages", "banners", "experiences", "testimonials", "reels", "itineraries", "pages", "brand", "general"] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export const isCloudinaryConfigured = () => {
  const e = env();
  return Boolean(e.CLOUDINARY_CLOUD_NAME && e.CLOUDINARY_API_KEY && e.CLOUDINARY_API_SECRET);
};

function sign(params: Record<string, string | number>) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + env().CLOUDINARY_API_SECRET).digest("hex");
}

/** Browser uploads directly to Cloudinary with this short-lived signature; files never touch our server or MongoDB. */
export function signUpload(folder: MediaFolder) {
  if (!isCloudinaryConfigured()) throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.");
  const e = env();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: `${e.CLOUDINARY_FOLDER}/${e.APP_ENV}/${folder}`, timestamp };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${e.CLOUDINARY_CLOUD_NAME}/auto/upload`,
    apiKey: e.CLOUDINARY_API_KEY!,
    signature: sign(params),
    ...params,
  };
}

export async function destroyAsset(publicId: string, resourceType: "image" | "video" | "raw" = "image") {
  if (!isCloudinaryConfigured()) return;
  const e = env();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: publicId, timestamp };
  const form = new FormData();
  for (const [k, v] of Object.entries({ ...params, api_key: e.CLOUDINARY_API_KEY!, signature: sign(params) })) form.append(k, String(v));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${e.CLOUDINARY_CLOUD_NAME}/${resourceType}/destroy`, { method: "POST", body: form });
  const body = (await res.json().catch(() => ({}))) as { result?: string };
  if (body.result !== "ok" && body.result !== "not found") throw new Error(`Cloudinary delete failed: ${JSON.stringify(body)}`);
}
