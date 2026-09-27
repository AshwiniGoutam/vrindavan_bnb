import "server-only";
import { headers } from "next/headers";
import { connectDB } from "@/server/db/connect";
import { RateLimit } from "@/server/models";
import { AppError } from "@/server/errors";

/** Fixed-window limiter backed by a MongoDB TTL collection (no extra infrastructure). */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `${bucket}:${ip}:${windowStart}`;
  await connectDB();
  const doc = await RateLimit.findOneAndUpdate(
    { key },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((windowStart + 1) * windowSeconds * 1000) } },
    { upsert: true, new: true },
  ).lean<{ count: number }>();
  if ((doc?.count ?? 0) > limit) throw new AppError("RATE_LIMITED", "Too many requests. Please wait a moment and try again.", 429);
}

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
}
