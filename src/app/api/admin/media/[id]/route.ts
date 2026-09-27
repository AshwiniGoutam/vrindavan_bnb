import { z } from "zod";
import { withAdmin, ok } from "@/server/auth/with-admin";
import { connectDB } from "@/server/db/connect";
import { Media } from "@/server/models";
import { destroyAsset } from "@/lib/integrations/cloudinary/server";
import { AppError } from "@/server/errors";
import { audit } from "@/server/audit";

const patchSchema = z.object({ title: z.string().max(200).optional(), alt: z.string().max(300).optional(), folder: z.string().max(40).optional() });

export const PATCH = withAdmin<{ id: string }>("media.manage", async (req, { params, admin }) => {
  await connectDB();
  const body = patchSchema.parse(await req.json());
  await Media.updateOne({ _id: params.id }, { $set: body });
  await audit(admin, "update", "Media", params.id, { after: body });
  return ok({ updated: true });
});

export const DELETE = withAdmin<{ id: string }>("media.manage", async (_req, { params, admin }) => {
  await connectDB();
  const m = await Media.findById(params.id).lean<{ publicId: string; resourceType: "image" | "video" | "raw"; url: string }>();
  if (!m) throw new AppError("NOT_FOUND", "Not found.", 404);
  if (m.url.includes("res.cloudinary.com")) await destroyAsset(m.publicId, m.resourceType);
  await Media.deleteOne({ _id: params.id });
  await audit(admin, "delete", "Media", params.id, { summary: m.publicId });
  return ok({ deleted: true });
});
