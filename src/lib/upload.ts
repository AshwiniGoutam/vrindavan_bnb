import { createHash } from "node:crypto";

export const uploadConfigured = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

/** Signed direct-to-Cloudinary upload params. The browser uploads the file itself; our server never handles the bytes. */
export function signUpload(folder = "vhi/stays") {
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `folder=${folder}&timestamp=${timestamp}`; // params sorted alphabetically
  const signature = createHash("sha1").update(toSign + process.env.CLOUDINARY_API_SECRET).digest("hex");
  return { cloudName: process.env.CLOUDINARY_CLOUD_NAME!, apiKey: process.env.CLOUDINARY_API_KEY!, timestamp, signature, folder };
}
