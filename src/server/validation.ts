import { z } from "zod";
import { normalizeIndianPhone } from "@/lib/utils";

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");
const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
const clean = (max: number) => z.string().trim().max(max).transform((s) => s.replace(/[<>]/g, ""));

export const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizeIndianPhone(v);
    if (!n) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid mobile number" });
    return n ?? "";
  });

export const addOnsSchema = z.array(z.object({ id: objectId, qty: z.number().int().min(0).max(50) })).max(20).default([]);

const party = {
  adults: z.number().int().min(1).max(40),
  children: z.number().int().min(0).max(20).default(0),
  childAges: z.array(z.number().int().min(0).max(17)).max(20).default([]),
};

export const stayQuoteSchema = z
  .object({
    propertySlug: z.string().min(1).max(120),
    packageSlug: z.string().max(120).optional(),
    checkIn: isoDate,
    checkOut: isoDate,
    ...party,
    mealPlanId: objectId.optional(),
    addOns: addOnsSchema,
    couponCode: z.string().trim().max(40).optional(),
  })
  .refine((v) => v.checkOut > v.checkIn, { message: "Check-out must be after check-in", path: ["checkOut"] });

export const tourQuoteSchema = z.object({
  tourSlug: z.string().min(1).max(120),
  travelDate: isoDate,
  ...party,
  addOns: addOnsSchema,
  couponCode: z.string().trim().max(40).optional(),
});

export const guestSchema = z.object({
  name: clean(120).pipe(z.string().min(2, "Please enter your full name")),
  phone: phoneSchema,
  email: z.union([z.string().trim().email("Enter a valid email").max(200), z.literal("")]).optional().transform((v) => v || undefined),
  city: clean(80).optional(),
  gstin: z.string().trim().toUpperCase().regex(/^[0-9A-Z]{15}$/, "GSTIN must be 15 characters").optional().or(z.literal("").transform(() => undefined)),
});

export const attributionSchema = z
  .object({
    utm_source: z.string().max(120).optional(),
    utm_medium: z.string().max(120).optional(),
    utm_campaign: z.string().max(200).optional(),
    utm_content: z.string().max(200).optional(),
    utm_term: z.string().max(200).optional(),
    fbclid: z.string().max(500).optional(),
    gclid: z.string().max(500).optional(),
    landingPage: z.string().max(500).optional(),
    referrer: z.string().max(500).optional(),
  })
  .partial()
  .optional();

export const createBookingSchema = z.discriminatedUnion("vertical", [
  z.object({ vertical: z.literal("stay"), request: stayQuoteSchema, guest: guestSchema, specialRequests: clean(1000).optional(), attribution: attributionSchema, acceptTerms: z.literal(true) }),
  z.object({
    vertical: z.literal("darshan"),
    request: tourQuoteSchema,
    guest: guestSchema,
    specialRequests: clean(1000).optional(),
    pickupPoint: clean(200).optional(),
    attribution: attributionSchema,
    acceptTerms: z.literal(true),
  }),
]);

export const enquirySchema = z.object({
  type: z.enum(["tour", "custom_tour", "stay", "general", "advance_window"]).default("general"),
  tourSlug: z.string().max(120).optional(),
  propertySlug: z.string().max(120).optional(),
  subject: clean(200).optional(),
  name: clean(120).pipe(z.string().min(2, "Please enter your name")),
  phone: phoneSchema,
  email: z.union([z.string().trim().email().max(200), z.literal("")]).optional().transform((v) => v || undefined),
  travelDate: isoDate.optional().or(z.literal("").transform(() => undefined)),
  people: z.number().int().min(1).max(200).optional(),
  message: clean(2000).optional(),
  attribution: attributionSchema,
  website: z.string().max(0).optional(), // honeypot
});

export const trackSchema = z.object({
  type: z.enum(["page_view", "view_item", "begin_checkout", "enquiry"]),
  sessionId: z.string().min(6).max(64),
  path: z.string().max(300).optional(),
  vertical: z.string().max(20).optional(),
  itemId: z.string().max(64).optional(),
  utm_source: z.string().max(120).optional(),
  utm_campaign: z.string().max(200).optional(),
  device: z.enum(["mobile", "tablet", "desktop"]).optional(),
});
