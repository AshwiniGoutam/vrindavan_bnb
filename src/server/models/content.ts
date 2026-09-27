import { Schema } from "mongoose";
import { authored, defineModel, MediaRefSchema, PublishingSchema, SeoSchema, translations } from "./_shared";

const { ObjectId } = Schema.Types;
const base = { publishing: { type: PublishingSchema, default: () => ({ status: "published" }) }, sortOrder: { type: Number, default: 0 }, translations, ...authored };

export const Banner = defineModel(
  "Banner",
  new Schema(
    {
      placement: { type: String, enum: ["home_hero", "stays", "darshan", "stay_food"], default: "home_hero" },
      eyebrow: String,
      title: { type: String, required: true },
      subtitle: String,
      image: MediaRefSchema,
      mobileImage: MediaRefSchema,
      video: MediaRefSchema,
      ctaLabel: String,
      ctaHref: String,
      ...base,
    },
    { timestamps: true },
  ),
);

/** Temples & Braj experiences shown on the homepage. */
export const Experience = defineModel(
  "Experience",
  new Schema(
    { title: { type: String, required: true }, category: String, description: String, bestTime: String, image: MediaRefSchema, ...base },
    { timestamps: true },
  ),
);

export const Testimonial = defineModel(
  "Testimonial",
  new Schema(
    {
      guestName: { type: String, required: true },
      city: String,
      image: MediaRefSchema,
      rating: { type: Number, min: 1, max: 5, default: 5 },
      text: { type: String, required: true },
      vertical: { type: String, enum: ["stay", "stay_food", "darshan", "general"], default: "general" },
      propertyId: { type: ObjectId, ref: "Property" },
      tourId: { type: ObjectId, ref: "DarshanTour" },
      stayedIn: String, // e.g. "March 2026"
      ...base,
    },
    { timestamps: true },
  ),
);

export const Reel = defineModel(
  "Reel",
  new Schema({ title: String, label: String, instagramUrl: String, thumbnail: MediaRefSchema, video: MediaRefSchema, ...base }, { timestamps: true }),
);

export const Faq = defineModel(
  "Faq",
  new Schema(
    {
      question: { type: String, required: true },
      answer: { type: String, required: true },
      category: { type: String, enum: ["general", "stay", "stay_food", "darshan", "payments"], default: "general" },
      showOnHomepage: { type: Boolean, default: false },
      ...base,
    },
    { timestamps: true },
  ),
);

/** CMS pages: About, Privacy Policy, Terms, and future Braj guides. Body is plain text with blank-line paragraphs and "## " headings. */
export const Page = defineModel(
  "Page",
  new Schema(
    { slug: { type: String, required: true, unique: true }, title: { type: String, required: true }, intro: String, body: String, heroImage: MediaRefSchema, seo: SeoSchema, ...base },
    { timestamps: true },
  ),
);

/** Media library index. Files live in Cloudinary; this is the searchable catalogue. */
export const Media = defineModel(
  "Media",
  new Schema(
    {
      publicId: { type: String, required: true, unique: true },
      url: { type: String, required: true },
      resourceType: { type: String, enum: ["image", "video", "raw"], default: "image" },
      format: String,
      bytes: Number,
      width: Number,
      height: Number,
      title: String,
      alt: { type: String, default: "" },
      folder: { type: String, default: "general", index: true },
      /** Where this file is used — maintained automatically when admin content is saved. */
      linkedTo: [{ _id: false, kind: String, id: String, label: String }],
      uploadedBy: { type: ObjectId, ref: "User" },
    },
    { timestamps: true },
  ),
);
