import { Schema } from "mongoose";
import { authored, defineModel, isoDate, MediaRefSchema, paise } from "./_shared";

const { ObjectId, Mixed } = Schema.Types;

/**
 * Concurrency guard over channel-manager inventory (NOT a second inventory).
 * One document per property-night; the unique index makes double-holding impossible.
 * "hold" documents expire through the TTL index; "booked" documents are pruned after checkout.
 */
const InventoryLockSchema = new Schema(
  {
    propertyId: { type: ObjectId, ref: "Property", required: true },
    night: { ...isoDate, required: true },
    type: { type: String, enum: ["hold", "booked"], required: true },
    bookingId: { type: ObjectId, ref: "Booking", required: true, index: true },
    expiresAt: Date,
  },
  { timestamps: true },
);
InventoryLockSchema.index({ propertyId: 1, night: 1 }, { unique: true });
InventoryLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const InventoryLock = defineModel("InventoryLock", InventoryLockSchema);

const AvailabilityCacheSchema = new Schema({
  propertyId: { type: ObjectId, required: true },
  night: { ...isoDate, required: true },
  available: Boolean,
  rate: paise,
  fetchedAt: { type: Date, default: Date.now },
});
AvailabilityCacheSchema.index({ propertyId: 1, night: 1 }, { unique: true });
AvailabilityCacheSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 180 });
export const AvailabilityCache = defineModel("AvailabilityCache", AvailabilityCacheSchema);

const discountFields = {
  name: { type: String, required: true },
  type: { type: String, enum: ["percent", "flat"], required: true },
  value: { type: Number, required: true }, // % or paise
  maxDiscount: paise,
  minAmount: paise,
  minNights: Number,
  verticals: { type: [String], default: ["stay", "stay_food", "darshan"] },
  propertyIds: [{ type: ObjectId, ref: "Property" }],
  tourIds: [{ type: ObjectId, ref: "DarshanTour" }],
  packageIds: [{ type: ObjectId, ref: "StayPackage" }],
  startsAt: isoDate,
  endsAt: isoDate,
  firstBookingOnly: { type: Boolean, default: false },
  appliesToAddOns: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  ...authored,
};

/** Automatically applied offers (shown with strike-through pricing and on the homepage). */
export const Offer = defineModel(
  "Offer",
  new Schema(
    {
      ...discountFields,
      title: String, // homepage headline
      description: String,
      badgeText: String, // e.g. "Save 15%"
      image: MediaRefSchema,
      showStrikeThrough: { type: Boolean, default: true },
      showOnHomepage: { type: Boolean, default: true },
      priority: { type: Number, default: 0 },
    },
    { timestamps: true },
  ),
);

/** Code-based discounts entered at checkout. */
export const Coupon = defineModel(
  "Coupon",
  new Schema(
    {
      ...discountFields,
      code: { type: String, required: true, unique: true, uppercase: true, trim: true },
      usageLimit: Number,
      perCustomerLimit: { type: Number, default: 1 },
      usedCount: { type: Number, default: 0 },
    },
    { timestamps: true },
  ),
);

export const CouponRedemption = defineModel(
  "CouponRedemption",
  new Schema(
    {
      couponId: { type: ObjectId, ref: "Coupon", required: true, index: true },
      bookingId: { type: ObjectId, ref: "Booking", required: true, unique: true },
      phone: { type: String, index: true },
      amount: paise,
      status: { type: String, enum: ["reserved", "used", "released"], default: "reserved" },
    },
    { timestamps: true },
  ),
);

export const Customer = defineModel(
  "Customer",
  new Schema(
    {
      phone: { type: String, required: true, unique: true }, // primary repeat-guest identifier (E.164)
      email: { type: String, lowercase: true, index: true },
      name: String,
      city: String,
      bookingsCount: { type: Number, default: 0 },
      totalSpent: { ...paise, default: 0 },
      firstBookingAt: Date,
      lastBookingAt: Date,
      notes: String,
      anonymizedAt: Date,
    },
    { timestamps: true },
  ),
);

const QuoteLineSchema = new Schema(
  { type: String, label: String, quantity: Number, unitPrice: paise, amount: paise, discount: paise, taxable: paise, gstVertical: String, gstRate: Number, gstAmount: paise, meta: Mixed },
  { _id: false },
);

/** A booked unit inside a booking (embedded — always read with its booking). Multi-item ready. */
export const BookingItemSchema = new Schema({
  kind: { type: String, enum: ["property", "tour"], required: true },
  propertyId: { type: ObjectId, ref: "Property" },
  tourId: { type: ObjectId, ref: "DarshanTour" },
  packageId: { type: ObjectId, ref: "StayPackage" },
  departureId: { type: ObjectId, ref: "TourDeparture" },
  title: String,
  checkIn: isoDate,
  checkOut: isoDate,
  nights: Number,
  travelDate: isoDate,
  adults: Number,
  children: Number,
  childAges: [Number],
  mealPlanId: { type: ObjectId, ref: "MealPlan" },
  mealPlanName: String,
  channel: {
    externalReservationId: String,
    syncStatus: { type: String, enum: ["pending", "synced", "failed", "not_required"], default: "not_required" },
    lastError: String,
    attempts: { type: Number, default: 0 },
  },
});

export const BOOKING_STATUSES = ["pending_payment", "confirmed", "checked_in", "checked_out", "cancelled", "expired", "failed"] as const;
export const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "failed", "partially_refunded", "refunded"] as const;

const BookingSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    vertical: { type: String, enum: ["stay", "stay_food", "darshan"], required: true },
    customerId: { type: ObjectId, ref: "Customer", index: true },
    guest: { name: { type: String, required: true }, phone: { type: String, required: true }, email: String, city: String, gstin: String },
    items: [BookingItemSchema],
    addOns: [{ _id: false, addOnId: ObjectId, name: String, qty: Number, unitPrice: paise, amount: paise }],
    specialRequests: String,
    pricing: {
      lines: [QuoteLineSchema],
      subtotal: paise,
      discountTotal: paise,
      taxableAmount: paise,
      gstTotal: paise,
      total: paise,
      discount: { kind: String, id: ObjectId, code: String, name: String, amount: paise },
      pricingVersion: String,
    },
    status: { type: String, enum: BOOKING_STATUSES, default: "pending_payment" },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "unpaid" },
    amountPaid: { ...paise, default: 0 },
    amountRefunded: { ...paise, default: 0 },
    holdExpiresAt: Date,
    statusHistory: [{ _id: false, from: String, to: String, at: Date, by: ObjectId, note: String }],
    source: { type: String, enum: ["website", "admin", "whatsapp", "phone"], default: "website" },
    attribution: { utm_source: String, utm_medium: String, utm_campaign: String, utm_content: String, utm_term: String, fbclid: String, gclid: String, landingPage: String, referrer: String },
    invoiceNumber: String,
    cancellation: { at: Date, by: ObjectId, reason: String, refundAmount: paise, calculation: Mixed },
    internalNotes: [{ _id: false, text: String, by: ObjectId, byName: String, at: Date }],
    isRepeatGuest: { type: Boolean, default: false },
    notificationsQueued: { type: Boolean, default: false },
  },
  { timestamps: true },
);
BookingSchema.index({ status: 1, createdAt: -1 });
BookingSchema.index({ vertical: 1, createdAt: -1 });
BookingSchema.index({ "items.propertyId": 1, "items.checkIn": 1 });
BookingSchema.index({ "items.tourId": 1, "items.travelDate": 1 });
BookingSchema.index({ "guest.phone": 1 });
BookingSchema.index({ status: 1, holdExpiresAt: 1 });
export const Booking = defineModel("Booking", BookingSchema);

/** Every gateway transaction (orders, captures, failures, refunds). */
const PaymentSchema = new Schema(
  {
    bookingId: { type: ObjectId, ref: "Booking", required: true, index: true },
    bookingCode: { type: String, index: true },
    provider: { type: String, enum: ["razorpay", "mock", "offline"], required: true },
    kind: { type: String, enum: ["payment", "refund"], default: "payment" },
    orderId: { type: String, index: true },
    paymentId: { type: String, index: true },
    refundId: String,
    amount: { ...paise, required: true },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["created", "authorized", "captured", "failed", "pending", "processed"], default: "created" },
    method: String,
    errorDescription: String,
    raw: Mixed,
  },
  { timestamps: true },
);
export const Payment = defineModel("Payment", PaymentSchema);

export const Enquiry = defineModel(
  "Enquiry",
  new Schema(
    {
      type: { type: String, enum: ["tour", "custom_tour", "stay", "general", "advance_window"], default: "general" },
      tourId: { type: ObjectId, ref: "DarshanTour" },
      propertyId: { type: ObjectId, ref: "Property" },
      subject: String,
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: String,
      travelDate: isoDate,
      people: Number,
      message: String,
      attribution: Mixed,
      status: { type: String, enum: ["new", "contacted", "converted", "closed"], default: "new", index: true },
      notes: String,
    },
    { timestamps: true },
  ),
);

export const Counter = defineModel("Counter", new Schema({ _id: String, seq: { type: Number, default: 0 } }));
