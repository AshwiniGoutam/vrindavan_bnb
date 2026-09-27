import type { NextRequest } from "next/server";
import { connectDB } from "@/server/db/connect";
import { getAdmin } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { errorResponse, ok } from "@/server/auth/with-admin";
import { resourceOrThrow, validatePayload, diffForAudit, syncMediaLinks } from "@/server/admin/registry";
import { AppError } from "@/server/errors";
import { audit } from "@/server/audit";
import { getPath } from "@/lib/utils";

type Params = { params: Promise<{ resource: string }> };

async function guard(key: string) {
  const { config, model } = resourceOrThrow(key);
  const admin = await getAdmin();
  if (!admin) throw new AppError("UNAUTHENTICATED", "Please sign in.", 401);
  // Ref option lists are readable by anyone who can open the admin.
  return { config, model, admin, allowed: can(admin.role, config.permission) };
}

/** List (paginated, searchable) or `?options=1` for ref pickers. */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { resource } = await params;
    const { config, model, allowed } = await guard(resource);
    await connectDB();
    const sp = req.nextUrl.searchParams;
    if (sp.get("options")) {
      const docs = await model.find({}).select(config.titleField).sort({ [config.titleField]: 1 }).limit(500).lean<Record<string, unknown>[]>();
      return ok(docs.map((d) => ({ value: String(d._id), label: String(getPath(d, config.titleField) ?? d._id) })));
    }
    if (!allowed) throw new AppError("FORBIDDEN", "Your role doesn't allow this.", 403);
    const page = Math.max(1, Number(sp.get("page") ?? 1));
    const q = sp.get("q")?.trim();
    const filter: Record<string, unknown> = {};
    if (q && config.searchFields?.length) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = config.searchFields.map((f) => ({ [f]: rx }));
    }
    const [items, total] = await Promise.all([
      model.find(filter).sort(config.defaultSort ?? { createdAt: -1 }).skip((page - 1) * 50).limit(50).lean(),
      model.countDocuments(filter),
    ]);
    return ok({ items, total, page });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { resource } = await params;
    const { config, model, admin, allowed } = await guard(resource);
    if (!allowed || config.canCreate === false) throw new AppError("FORBIDDEN", "Your role doesn't allow this.", 403);
    await connectDB();
    const { nested, set } = await validatePayload(config, await req.json(), "create");
    const doc = await model.create({ ...nested, createdBy: admin.id, updatedBy: admin.id });
    await syncMediaLinks(config, String(doc._id), nested);
    await audit(admin, "create", config.model, String(doc._id), { summary: String(getPath(nested, config.titleField) ?? ""), after: diffForAudit(null, set).after });
    return ok({ _id: String(doc._id) }, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
