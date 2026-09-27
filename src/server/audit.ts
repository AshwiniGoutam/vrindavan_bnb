import "server-only";
import { headers } from "next/headers";
import { AuditLog } from "@/server/models";
import type { AdminUser } from "@/server/auth/session";

/** Record an admin action. Store only changed fields — never secrets or password hashes. */
export async function audit(admin: AdminUser, action: string, entity: string, entityId: string, extra?: { summary?: string; before?: unknown; after?: unknown }) {
  try {
    const h = await headers();
    await AuditLog.create({
      userId: admin.id,
      userName: admin.name,
      action,
      entity,
      entityId,
      summary: extra?.summary,
      before: extra?.before,
      after: extra?.after,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim(),
    });
  } catch (e) {
    console.warn("[audit] failed", e);
  }
}
