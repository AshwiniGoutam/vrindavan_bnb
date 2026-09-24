import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { issueToken } from "@/lib/tokens";
import { mail } from "@/lib/email";
import { site } from "@/lib/config";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  if (user.emailVerifiedAt) return NextResponse.json({ ok: true });
  if (!rateLimit(`resend:${user.id}`, 3, 15 * 60_000)) return NextResponse.json({ error: "Please wait a few minutes before asking again." }, { status: 429 });
  const token = await issueToken(user.id, "VERIFY_EMAIL", 24 * 3600_000);
  await mail.verify(user.email, user.name, `${site.url}/api/auth/verify-email?token=${token}`);
  return NextResponse.json({ ok: true });
}
