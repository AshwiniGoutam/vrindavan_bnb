import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { consumeToken } from "@/lib/tokens";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const userId = token ? await consumeToken(token, "VERIFY_EMAIL") : null;
  if (userId) await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return NextResponse.redirect(new URL(`/verify-email?status=${userId ? "ok" : "invalid"}`, req.url));
}
