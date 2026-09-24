import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export function generateApiKey() {
  const raw = `kth_${randomBytes(24).toString("hex")}`;
  return { raw, prefix: raw.slice(0, 10), hash: sha(raw) };
}

export async function authenticateApiKey(req: Request) {
  const h = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!h) return null;
  const key = await db.apiKey.findUnique({ where: { keyHash: sha(h) } });
  if (!key || key.revokedAt) return null;
  void db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return key;
}
