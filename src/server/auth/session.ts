import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/server/db/connect";
import { Session, User } from "@/server/models";
import { can, type Permission, type Role } from "./permissions";

const COOKIE = "vhi_admin";
const TTL_HOURS = 12;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** Opaque random token in an httpOnly cookie; only its hash is stored, so sessions are revocable. */
export async function createSession(userId: string, meta: { ip?: string; userAgent?: string }) {
  await connectDB();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_HOURS * 3_600_000);
  await Session.create({ tokenHash: sha256(token), userId, expiresAt, ...meta });
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}

export async function getAdmin(): Promise<AdminUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  await connectDB();
  const session = await Session.findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } }).lean<{ userId: unknown }>();
  if (!session) return null;
  const user = await User.findById(session.userId).lean<{ _id: unknown; name: string; email: string; role: Role; active: boolean }>();
  if (!user || !user.active) return null;
  return { id: String(user._id), name: user.name, email: user.email, role: user.role };
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await connectDB();
    await Session.deleteOne({ tokenHash: sha256(token) });
  }
  jar.delete(COOKIE);
}

/** For admin pages (server components): redirect to login / show forbidden. */
export async function requireAdmin(permission?: Permission): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (permission && !can(admin.role, permission)) redirect("/admin?forbidden=1");
  return admin;
}
