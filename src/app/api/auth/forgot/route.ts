import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { issueToken } from "@/lib/tokens";
import { mail } from "@/lib/email";
import { background } from "@/lib/background";
import { site } from "@/lib/config";

export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().trim().toLowerCase().email() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  if (!rateLimit(`forgot:${clientIp(req)}:${parsed.data.email}`, 3, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    background(async () => {
      const token = await issueToken(user.id, "RESET_PASSWORD", 3600_000);
      await mail.reset(user.email, user.name, `${site.url}/reset-password?token=${token}`);
    });
  }
  // Same answer whether or not the account exists, so this can't be used to find registered emails.
  return NextResponse.json({ ok: true });
}
