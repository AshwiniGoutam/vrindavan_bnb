import type { NextRequest } from "next/server";
import { connectDB } from "@/server/db/connect";
import { withAdmin, errorResponse, ok } from "@/server/auth/with-admin";
import { getAdmin } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { resourceOrThrow, validatePayload, diffForAudit, syncMediaLinks } from "@/server/admin/registry";
import { AppError } from "@/server/errors";
import { audit } from "@/server/audit";
import { getPath } from "@/lib/utils";

type Params = { params: Promise<{ resource: string; id: string }> };

const isSettings = (key: string) => key === "settings";

async function guard(key: string) {
  const { config, model } = resourceOrThrow(key);
  const admin = await getAdmin();
  if (!admin) throw new AppError("UNAUTHENTICATED", "Please sign in.", 401);
  if (!can(admin.role, config.permission)) throw new AppError("FORBIDDEN", "Your role doesn't allow this.", 403);
  await connectDB();
  return { config, model, admin };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { resource, id } = await params;
    const { model } = await guard(resource);
    const doc = await model.findById(isSettings(resource) ? "site" : id).lean();
    if (!doc && !isSettings(resource)) throw new AppError("NOT_FOUND", "Not found.", 404);
    return ok(doc ?? {});
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { resource, id } = await params;
    const { config, model, admin } = await guard(resource);
    const docId = isSettings(resource) ? "site" : id;
    const before = await model.findById(docId).lean<Record<string, unknown>>();
    if (!before && !isSettings(resource)) throw new AppError("NOT_FOUND", "Not found.", 404);
    const { set } = await validatePayload(config, await req.json(), "update");
    // Unset nullified values instead of storing nulls.
    const $set: Record<string, unknown> = { updatedBy: admin.id };
    const $unset: Record<string, 1> = {};
    for (const [k, v] of Object.entries(set)) {
      if (v === null) $unset[k] = 1;
      else $set[k] = v;
    }
    if (isSettings(resource)) delete $set.updatedBy;
    await model.updateOne({ _id: docId }, { $set, ...(Object.keys($unset).length ? { $unset } : {}) }, { upsert: isSettings(resource), runValidators: true });
    await syncMediaLinks(config, String(docId), await model.findById(docId).lean<Record<string, unknown>>());
    const diff = diffForAudit(before, set);
    await audit(admin, "update", config.model, String(docId), { summary: String(getPath(before ?? set, config.titleField) ?? ""), ...diff });
    return ok({ _id: String(docId) });
  } catch (e) {
    return errorResponse(e);
  }
}

export const DELETE = withAdmin<{ resource: string; id: string }>("dashboard.view", async (_req, { admin, params }) => {
  const { config, model } = resourceOrThrow(params.resource);
  if (!can(admin.role, config.permission) || config.canDelete === false || isSettings(params.resource)) throw new AppError("FORBIDDEN", "Your role doesn't allow this.", 403);
  if (params.resource === "users" && params.id === admin.id) throw new AppError("FORBIDDEN", "You can't delete your own account.", 400);
  await connectDB();
  const before = await model.findById(params.id).lean<Record<string, unknown>>();
  if (!before) throw new AppError("NOT_FOUND", "Not found.", 404);
  await model.deleteOne({ _id: params.id });
  await syncMediaLinks(config, params.id, null);
  await audit(admin, "delete", config.model, params.id, { summary: String(getPath(before, config.titleField) ?? "") });
  return ok({ deleted: true });
});
