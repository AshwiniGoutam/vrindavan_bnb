import { Schema } from "mongoose";
import { defineModel, MediaRefSchema, paise } from "./_shared";

const { ObjectId, Mixed } = Schema.Types;

export const USER_ROLES = ["owner", "manager", "staff", "editor"] as const;

/** Admin users (guests do not need accounts). */
export const User = defineModel(
  "User",
  new Schema(
    {
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash: { type: String, required: true, select: false },
      role: { type: String, enum: USER_ROLES, default: "staff" },
      active: { type: Boolean, default: true },
      lastLoginAt: Date,
      failedLogins: { type: Number, default: 0 },
      lockedUntil: Date,
    },
    { timestamps: true },
  ),
);

const SessionSchema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: ObjectId, ref: "User", required: true, index: true },
  ip: String,
  userAgent: String,
  expiresAt: { type: Date, required: true },
});
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Session = defineModel("Session", SessionSchema);

const AuditLogSchema = new Schema({
  userId: { type: ObjectId, ref: "User", index: true },
  userName: String,
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: String,
  summary: String,
  before: Mixed,
  after: Mixed,
  ip: String,
  at: { type: Date, default: Date.now },
});
AuditLogSchema.index({ at: -1 });
export const AuditLog = defineModel("AuditLog", AuditLogSchema);

/** Singleton (_id "site"): everything the client changes without a deploy. */
export const Settings = defineModel(
  "Settings",
  new Schema(
    {
      _id: { type: String, default: "site" },
      business: {
        brandName: { type: String, default: "Vrindavan Holiday Inn" },
        tagline: { type: String, default: "Luxury Homestays" },
        legalName: String,
        gstin: String,
        registeredAddress: String,
        invoiceAddress: String,
        phone: String,
        whatsapp: String,
        email: String,
        address: String,
        mapUrl: String,
        instagram: String,
        facebook: String,
        youtube: String,
      },
      home: {
        heroEyebrow: String,
        heroTitle: String,
        heroAccent: String,
        heroSubtitle: String,
        heroImage: MediaRefSchema,
        introTitle: String,
        introBody: String,
        introImage: MediaRefSchema,
        foodTitle: String,
        foodBody: String,
        foodImage: MediaRefSchema,
        whyVhi: [{ _id: false, title: String, body: String }],
      },
      tax: {
        accommodationRate: { type: Number, default: 0 },
        accommodationSlabLimit: paise, // optional: per-night tariff up to which the lower rate applies
        accommodationRateAboveSlab: Number,
        stayFoodRate: { type: Number, default: 0 },
        darshanRate: { type: Number, default: 0 },
        mealRate: { type: Number, default: 0 },
        addonRate: { type: Number, default: 0 },
        showPricesWithTax: { type: Boolean, default: false },
        invoicePrefix: { type: String, default: "VHI" },
        sacAccommodation: String,
        sacTour: String,
      },
      booking: {
        holdMinutes: { type: Number, default: 12 },
        maxAdvanceDays: { type: Number, default: 365 },
        defaultMinGroupSize: { type: Number, default: 4 },
        defaultAdvanceDays: { type: Number, default: 15 },
        defaultMealMinNights: { type: Number, default: 3 },
      },
      notifications: {
        adminWhatsappNumbers: [String],
        adminEmails: [String],
        templateLanguage: { type: String, default: "en" },
        guestConfirmationTemplate: { type: String, default: "vhi_booking_confirmed" },
        adminBookingTemplate: { type: String, default: "vhi_admin_new_booking" },
        adminEnquiryTemplate: { type: String, default: "vhi_admin_new_enquiry" },
        guestCancellationTemplate: { type: String, default: "vhi_booking_cancelled" },
        sendGuestWhatsapp: { type: Boolean, default: true },
        sendGuestEmail: { type: Boolean, default: true },
      },
      contacts: [{ _id: false, name: String, role: String, phone: String, showToGuests: Boolean }],
      seo: { defaultTitle: String, defaultDescription: String, ogImage: MediaRefSchema },
    },
    { timestamps: true },
  ),
);

const RateLimitSchema = new Schema({ key: { type: String, unique: true }, count: Number, expiresAt: Date });
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RateLimit = defineModel("RateLimit", RateLimitSchema);

/** Outbox: every WhatsApp / email goes through here and is retried by cron. */
const NotificationSchema = new Schema(
  {
    channel: { type: String, enum: ["whatsapp", "email"], required: true },
    audience: { type: String, enum: ["guest", "admin"], required: true },
    event: { type: String, required: true },
    to: { type: String, required: true },
    template: String,
    variables: [String],
    subject: String,
    body: String, // rendered text (WhatsApp preview / email text)
    html: String,
    bookingId: { type: ObjectId, ref: "Booking", index: true },
    status: { type: String, enum: ["queued", "sent", "failed"], default: "queued" },
    attempts: { type: Number, default: 0 },
    lastError: String,
    nextAttemptAt: { type: Date, default: Date.now },
    providerMessageId: String,
    sentAt: Date,
  },
  { timestamps: true },
);
NotificationSchema.index({ status: 1, nextAttemptAt: 1 });
export const Notification = defineModel("Notification", NotificationSchema);

const WebhookEventSchema = new Schema({
  provider: { type: String, required: true },
  eventId: { type: String, required: true },
  type: String,
  status: { type: String, enum: ["received", "processed", "failed", "ignored"], default: "received" },
  error: String,
  receivedAt: { type: Date, default: Date.now },
});
WebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
export const WebhookEvent = defineModel("WebhookEvent", WebhookEventSchema);

const AnalyticsEventSchema = new Schema({
  sessionId: { type: String, index: true },
  type: { type: String, enum: ["page_view", "view_item", "begin_checkout", "purchase", "enquiry"], required: true },
  vertical: String,
  itemId: String,
  value: paise,
  path: String,
  utm_source: String,
  utm_campaign: String,
  device: String,
  at: { type: Date, default: Date.now },
});
AnalyticsEventSchema.index({ type: 1, at: -1 });
AnalyticsEventSchema.index({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 400 });
export const AnalyticsEvent = defineModel("AnalyticsEvent", AnalyticsEventSchema);
