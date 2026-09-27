import "server-only";
import { z, type ZodTypeAny } from "zod";
import type { Model } from "mongoose";
import * as models from "@/server/models";
import { Media } from "@/server/models";
import { getResource } from "@/admin/resources";
import type { Field, ResourceConfig } from "@/admin/fields";
import { AppError } from "@/server/errors";
import { hashPassword } from "@/server/auth/password";
import { getPath, setPath, slugify } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = Model<any>;

export function resourceOrThrow(key: string): { config: ResourceConfig; model: AnyModel } {
  const config = getResource(key);
  if (!config) throw new AppError("NOT_FOUND", "Unknown admin module.", 404);
  const model = (models as unknown as Record<string, AnyModel>)[config.model];
  if (!model) throw new AppError("NOT_FOUND", `Model ${config.model} not registered.`, 500);
  return { config, model };
}

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid reference");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const mediaRef = z
  .object({
    mediaId: objectId.optional().nullable(),
    publicId: z.string().max(300).optional().nullable(),
    url: z.string().url().max(2000),
    resourceType: z.enum(["image", "video", "raw"]).optional(),
    width: z.number().optional().nullable(),
    height: z.number().optional().nullable(),
    alt: z.string().max(300).optional().nullable(),
    caption: z.string().max(500).optional().nullable(),
    group: z.string().max(80).optional().nullable(),
    sortOrder: z.number().optional().nullable(),
  })
  .strip();

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

/** Zod schema for one field. Unknown keys are dropped: only configured fields can ever be written. */
function fieldSchema(f: Field): ZodTypeAny {
  const req = f.required;
  switch (f.type) {
    case "text":
    case "slug":
    case "textarea":
    case "time":
    case "password": {
      const s = z.string().trim().max(f.type === "textarea" ? 20000 : 500);
      return req ? s.min(1, `${f.label} is required`) : z.preprocess(emptyToNull, s.nullable()).optional();
    }
    case "select": {
      const values = (f.options ?? []).map((o) => o.value) as [string, ...string[]];
      const e = z.enum(values);
      return req ? e : z.preprocess(emptyToNull, e.nullable()).optional();
    }
    case "number":
    case "percent": {
      const n = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().finite().nullable());
      return req ? n.refine((v) => v !== null, `${f.label} is required`) : n.optional();
    }
    case "money": {
      const n = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().int("Amount must be whole paise").min(0).nullable());
      return req ? n.refine((v) => v !== null, `${f.label} is required`) : n.optional();
    }
    case "boolean":
      return z.boolean().optional();
    case "multiselect":
      return f.numeric ? z.array(z.coerce.number()).optional() : z.array(z.string().max(100)).optional();
    case "tags":
    case "lines":
      return z.array(z.string().trim().max(2000)).transform((a) => a.filter(Boolean)).optional();
    case "ref":
      return req ? objectId : z.preprocess(emptyToNull, objectId.nullable()).optional();
    case "refs":
      return z.array(objectId).optional();
    case "date":
      return req ? isoDate : z.preprocess(emptyToNull, isoDate.nullable()).optional();
    case "image":
      return z.preprocess(emptyToNull, mediaRef.nullable()).optional();
    case "gallery":
      return z.array(mediaRef).optional();
    case "list":
      return z.array(z.object(Object.fromEntries((f.fields ?? []).map((sf) => [sf.name, fieldSchema({ ...sf, required: false })]))).strip()).optional();
    case "readonly":
      return z.any();
  }
}

/**
 * Validate an admin payload against the resource's field config.
 * Returns a flat `$set` map (dotted paths) plus a nested object for creation.
 */
export async function validatePayload(config: ResourceConfig, body: Record<string, unknown>, mode: "create" | "update") {
  const set: Record<string, unknown> = {};
  let nested: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const f of config.fields) {
    if (f.type === "readonly") continue;
    let raw = getPath(body, f.name);
    if (raw === undefined && mode === "update") continue;
    if (raw === undefined && f.default !== undefined) raw = f.default;
    if (f.type === "slug" && !raw) raw = slugify(String(getPath(body, config.titleField) ?? ""));
    const res = fieldSchema(f).safeParse(raw);
    if (!res.success) {
      errors[f.name] = res.error.issues[0]?.message ?? "Invalid value";
      continue;
    }
    let value = res.data;
    if (f.type === "slug" && typeof value === "string") value = slugify(value);
    if (f.type === "password") {
      if (!value) {
        if (mode === "create") errors[f.name] = "Password is required";
        continue;
      }
      if (String(value).length < 10) {
        errors[f.name] = "Use at least 10 characters";
        continue;
      }
      set.passwordHash = await hashPassword(String(value));
      nested.passwordHash = set.passwordHash;
      continue;
    }
    set[f.name] = value;
    nested = setPath(nested, f.name, value);
  }
  if (Object.keys(errors).length) throw new AppError("VALIDATION", "Please check the highlighted fields.", 422, { fields: errors });

  if (set["publishing.status"] === "published") {
    set["publishing.publishedAt"] = new Date();
    nested = setPath(nested, "publishing.publishedAt", new Date());
  }
  if (config.key === "users" && typeof set.email === "string") {
    set.email = set.email.toLowerCase();
    nested.email = set.email;
  }
  return { set, nested };
}

/** Before/after diff of only the written paths, for the audit log (never includes password hashes). */
export function diffForAudit(before: Record<string, unknown> | null, set: Record<string, unknown>) {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(set)) {
    if (k === "passwordHash") {
      a[k] = "(changed)";
      continue;
    }
    const prev = before ? getPath(before, k) : undefined;
    if (JSON.stringify(prev) !== JSON.stringify(v)) {
      b[k] = prev;
      a[k] = v;
    }
  }
  return { before: b, after: a };
}

/** Collect Media ids referenced by image/gallery fields (including inside list rows). */
function mediaIdsIn(fields: Field[], doc: unknown): string[] {
  const ids: string[] = [];
  const take = (m: unknown) => {
    const id = (m as { mediaId?: unknown } | null)?.mediaId;
    if (id) ids.push(String(id));
  };
  for (const f of fields) {
    const v = getPath(doc, f.name);
    if (f.type === "image") take(v);
    else if (f.type === "gallery" && Array.isArray(v)) v.forEach(take);
    else if (f.type === "list" && Array.isArray(v) && f.fields) for (const row of v) ids.push(...mediaIdsIn(f.fields, row));
  }
  return ids;
}

/**
 * Keep Media.linkedTo in sync so the Media Library shows where each file is used
 * (property, tour, banner…) and can filter by it.
 */
export async function syncMediaLinks(config: ResourceConfig, docId: string, doc: Record<string, unknown> | null) {
  try {
    const ids = doc ? Array.from(new Set(mediaIdsIn(config.fields, doc))) : [];
    const label = doc ? String(getPath(doc, config.titleField) ?? config.singular) : "";
    await Media.updateMany({ "linkedTo.id": docId, _id: { $nin: ids } }, { $pull: { linkedTo: { id: docId } } });
    if (ids.length) {
      await Media.updateMany({ _id: { $in: ids } }, { $pull: { linkedTo: { id: docId } } });
      await Media.updateMany({ _id: { $in: ids } }, { $push: { linkedTo: { kind: config.key, id: docId, label } } });
    }
  } catch (e) {
    console.warn("[media-links]", e);
  }
}
