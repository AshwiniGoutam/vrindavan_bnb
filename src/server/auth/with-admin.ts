import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/server/errors";
import { can, type Permission } from "./permissions";
import { getAdmin, type AdminUser } from "./session";

type Ctx<P> = { admin: AdminUser; params: P };

/** Wraps every /api/admin route: authentication, RBAC, consistent error shape. */
export function withAdmin<P = Record<string, string>>(permission: Permission, handler: (req: NextRequest, ctx: Ctx<P>) => Promise<Response>) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    try {
      const admin = await getAdmin();
      if (!admin) return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED", message: "Please sign in." } }, { status: 401 });
      if (!can(admin.role, permission)) return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "Your role doesn't allow this." } }, { status: 403 });
      return await handler(req, { admin, params: await context.params });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function errorResponse(e: unknown) {
  if (e instanceof ZodError) {
    const fields = Object.fromEntries(e.issues.map((i) => [i.path.join("."), i.message]));
    return NextResponse.json({ ok: false, error: { code: "VALIDATION", message: "Please check the highlighted fields.", fields } }, { status: 422 });
  }
  if (e instanceof AppError) return NextResponse.json({ ok: false, error: { code: e.code, message: e.message, details: e.details } }, { status: e.status });
  const err = e as { code?: number; keyValue?: Record<string, unknown> };
  if (err?.code === 11000)
    return NextResponse.json({ ok: false, error: { code: "DUPLICATE", message: `That ${Object.keys(err.keyValue ?? {})[0] ?? "value"} is already in use.` } }, { status: 409 });
  console.error(e);
  return NextResponse.json({ ok: false, error: { code: "INTERNAL", message: "Something went wrong. Please try again." } }, { status: 500 });
}

export const ok = (data: unknown, status = 200) => NextResponse.json({ ok: true, data }, { status });
