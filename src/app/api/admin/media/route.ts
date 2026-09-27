import { z } from "zod";
import { withAdmin, ok } from "@/server/auth/with-admin";
import { connectDB } from "@/server/db/connect";
import { Media } from "@/server/models";
import { audit } from "@/server/audit";

/** Library listing (search / folder / type). */
export const GET = withAdmin("media.manage", async (req) => {
  await connectDB();
  const sp = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  if (sp.get("folder")) filter.folder = sp.get("folder");
  if (sp.get("type")) filter.resourceType = sp.get("type");
  const linked = sp.get("linked");
  if (linked === "unused") filter.$or = [{ linkedTo: { $size: 0 } }, { linkedTo: { $exists: false } }];
  else if (linked) filter["linkedTo.kind"] = linked;
  const q = sp.get("q")?.trim();
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$and = [{ $or: [{ title: rx }, { alt: rx }, { publicId: rx }, { "linkedTo.label": rx }] }];
  }
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const [items, total] = await Promise.all([Media.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 48).limit(48).lean(), Media.countDocuments(filter)]);
  return ok({ items, total, page });
});

const registerSchema = z.object({
  publicId: z.string().min(1).max(300),
  url: z.string().url().max(2000),
  resourceType: z.enum(["image", "video", "raw"]).default("image"),
  format: z.string().max(20).optional(),
  bytes: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  title: z.string().max(200).optional(),
  alt: z.string().max(300).default(""),
  folder: z.string().max(40).default("general"),
});

/** Register an uploaded asset (after direct Cloudinary upload) or an external URL. */
export const POST = withAdmin("media.manage", async (req, { admin }) => {
  await connectDB();
  const body = registerSchema.parse(await req.json());
  const doc = await Media.findOneAndUpdate({ publicId: body.publicId }, { $set: { ...body, uploadedBy: admin.id } }, { upsert: true, new: true }).lean<{ _id: unknown }>();
  await audit(admin, "upload", "Media", String(doc!._id), { summary: body.publicId });
  return ok(doc, 201);
});
