import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { issueToken } from "@/lib/tokens";
import { mail } from "@/lib/email";
import { background } from "@/lib/background";
import { site } from "@/lib/config";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().regex(/^\+?\d[\d\s-]{8,14}$/, "Enter a valid phone number"),
  password: z.string().min(8, "Use at least 8 characters").max(100),
  consent: z.literal(true, { errorMap: () => ({ message: "Please accept the Terms and Privacy Policy" }) }),
});

export async function POST(req: Request) {
  if (!rateLimit(`register:${clientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { name, email, phone, password } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "An account with this email already exists. Log in instead." }, { status: 409 });
  }
  const user = await db.user.create({ data: { name, email, phone, passwordHash: await bcrypt.hash(password, 12) } });
  await createSession(user);

  background(async () => {
    const token = await issueToken(user.id, "VERIFY_EMAIL", 24 * 3600_000);
    await mail.verify(email, name, `${site.url}/api/auth/verify-email?token=${token}`);
  });
  return NextResponse.json({ ok: true });
}
