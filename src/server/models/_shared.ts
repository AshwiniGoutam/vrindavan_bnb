/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Schema, type Model } from "mongoose";

/**
 * Models are exported as Model<any>: documents are shaped by the schemas here and by the
 * explicit DTO interfaces in src/server/types.ts, which keeps service code simple and strict where it matters.
 */
export function defineModel(name: string, schema: Schema): Model<any> {
  // In development, hot reload re-runs this file after schema edits: drop the cached model so the
  // new fields are used immediately (otherwise Mongoose silently strips them on save).
  if (process.env.NODE_ENV !== "production" && mongoose.models[name]) mongoose.deleteModel(name);
  return (mongoose.models[name] as Model<any>) ?? mongoose.model(name, schema);
}

/** "YYYY-MM-DD" IST calendar date. */
export const isoDate = { type: String, match: /^\d{4}-\d{2}-\d{2}$/ };
/** Integer paise. */
export const paise = { type: Number, min: 0, validate: { validator: (v: number) => v == null || Number.isInteger(v), message: "Amount must be whole paise" } };

/** Embedded media reference (the file lives in Cloudinary; the Media collection indexes it). */
export const MediaRefSchema = new Schema(
  {
    mediaId: { type: Schema.Types.ObjectId, ref: "Media" },
    publicId: String,
    url: { type: String, required: true },
    resourceType: { type: String, enum: ["image", "video", "raw"], default: "image" },
    width: Number,
    height: Number,
    alt: { type: String, default: "" },
    caption: String,
    /** Room / section for the photo tour, e.g. "Living room". Empty = "Additional photos". */
    group: String,
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false },
);
/** Property gallery items are MediaRefs — alias kept for clarity. */
export const PropertyMediaSchema = MediaRefSchema;

export const SeoSchema = new Schema(
  { metaTitle: String, metaDescription: String, ogImage: MediaRefSchema, canonicalUrl: String, noIndex: { type: Boolean, default: false } },
  { _id: false },
);

export const PublishingSchema = new Schema(
  {
    status: { type: String, enum: ["draft", "published", "unpublished"], default: "draft" },
    publishedAt: Date,
  },
  { _id: false },
);

export const FaqItemSchema = new Schema({ question: String, answer: String }, { _id: false });

/** One day of a Darshan tour or Stay + Food itinerary (embedded). */
export const TourDaySchema = new Schema(
  { day: Number, title: String, summary: String, items: [String], image: MediaRefSchema },
  { _id: false },
);

export const authored = {
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
};

/** Reserved for Hindi later: { hi: { title, description, ... } }. */
export const translations = { type: Schema.Types.Mixed, default: undefined };

export const published = { "publishing.status": "published" };