import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/server/db/connect";
import { User } from "@/server/models";
import { verifyPassword } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { rateLimit, clientIp } from "@/server/rate-limit";
import { errorResponse } from "@/server/auth/with-admin";
import { AppError } from "@/server/errors";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200) });
const LOCK_AFTER = 5;
const LOCK_MINUTES = 15;

export async function POST(req: NextRequest) {
  try {
    await rateLimit("login", 10, 300);
    const { email, password } = schema.parse(await req.json());
    await connectDB();
    const user = await User.findOne({ email }).select("+passwordHash").lean<{ _id: unknown; passwordHash: string; active: boolean; failedLogins?: number; lockedUntil?: Date }>();
    const invalid = new AppError("INVALID_LOGIN", "Email or password is incorrect.", 401);
    if (!user || !user.active) throw invalid;
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) throw new AppError("LOCKED", "Too many attempts. Try again in 15 minutes.", 423);
    if (!(await verifyPassword(password, user.passwordHash))) {
      const failed = (user.failedLogins ?? 0) + 1;
      await User.updateOne({ _id: user._id }, { failedLogins: failed, ...(failed >= LOCK_AFTER ? { lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000), failedLogins: 0 } : {}) });
      throw invalid;
    }
    await User.updateOne({ _id: user._id }, { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() });
    await createSession(String(user._id), { ip: await clientIp(), userAgent: req.headers.get("user-agent") ?? undefined });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
