import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { consumeToken } from "@/lib/tokens";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`reset:${clientIp(req)}`, 10, 15 * 60_000)) return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  const parsed = z.object({ token: z.string().min(20), password: z.string().min(8, "Use at least 8 characters").max(100) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const userId = await consumeToken(parsed.data.token, "RESET_PASSWORD");
  if (!userId) return NextResponse.json({ error: "This link has expired or was already used. Request a new one." }, { status: 400 });

  await db.user.update({
    where: { id: userId },
    // Following the emailed link also proves the address, and signs out every older session.
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 12), passwordChangedAt: new Date(), emailVerifiedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
