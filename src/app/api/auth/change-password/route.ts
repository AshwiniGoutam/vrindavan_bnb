import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, getCurrentUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (!rateLimit(`chpw:${user.id}`, 5, 15 * 60_000)) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  const parsed = z.object({ current: z.string().min(1), password: z.string().min(8, "Use at least 8 characters").max(100) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const row = await db.user.findUnique({ where: { id: user.id } });
  if (!row || !(await bcrypt.compare(parsed.data.current, row.passwordHash))) {
    return NextResponse.json({ error: "Your current password is incorrect" }, { status: 400 });
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 12), passwordChangedAt: new Date() } });
  await createSession(user); // keep this device signed in; all older sessions are now invalid
  return NextResponse.json({ ok: true });
}
