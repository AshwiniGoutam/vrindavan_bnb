import { createHash, randomBytes } from "node:crypto";
import type { TokenType } from "@/lib/db";
import { db } from "./db";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** Returns the raw token (goes in the email link). Only its hash is stored. */
export async function issueToken(userId: string, type: TokenType, ttlMs: number) {
  const raw = randomBytes(32).toString("hex");
  await db.authToken.deleteMany({ where: { userId, type } });
  await db.authToken.create({ data: { userId, type, tokenHash: sha(raw), expiresAt: new Date(Date.now() + ttlMs) } });
  return raw;
}

/** One-time use. Returns the user id or null. */
export async function consumeToken(raw: string, type: TokenType) {
  const t = await db.authToken.findUnique({ where: { tokenHash: sha(raw) } });
  if (!t || t.type !== type || t.expiresAt < new Date()) return null;
  await db.authToken.delete({ where: { id: t.id } });
  return t.userId;
}
