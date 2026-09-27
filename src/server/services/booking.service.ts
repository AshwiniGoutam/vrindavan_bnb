import "server-only";
import { randomBytes } from "node:crypto";
import type { ClientSession } from "mongoose";
import { addDays, nightsBetween, todayIST, type ISODate } from "@/lib/dates";
import { paiseToRupees } from "@/lib/money";
import { paymentGateway } from "@/lib/integrations/razorpay";
import { channelManager } from "@/lib/integrations/channel-manager";
import { sendMetaEvent } from "@/lib/integrations/meta/capi";
import { connectDB, withTransaction } from "@/server/db/connect";
import {
  Booking, CancellationPolicy, Counter, Coupon, CouponRedemption, Customer, InventoryLock, Payment, Property, TourDeparture,
} from "@/server/models";
import { AppError } from "@/server/errors";
import type { AdminUser } from "@/server/auth/session";
import { audit } from "@/server/audit";
import { quoteStayRequest, quoteTourRequest, type StayQuoteRequest, type TourQuoteRequest } from "./quote.service";
import { isStayAvailable, channelRef } from "./availability.service";
import { calculateRefund } from "./cancellation";
import { dispatchOutbox, enqueueBookingNotifications, enqueueCancellationNotifications, enqueueUrgentAdminAlert } from "./notification.service";
import { getSettings } from "./settings.service";
import { trackServerEvent } from "./analytics.service";
import type { Quote } from "./pricing";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any;

export interface GuestInput {
  name: string;
  phone: string; // E.164
  email?: string;
  city?: string;
  gstin?: string;
}
export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  landingPage?: string;
  referrer?: string;
}

export interface CheckoutSession {
  bookingCode: string;
  provider: "razorpay" | "mock";
  keyId: string;
  orderId: string;
  amount: number;
  holdExpiresAt: string;
  prefill: { name: string; email?: string; contact: string };
  description: string;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function bookingCode() {
  const now = new Date(Date.now() + 330 * 60_000);
  const yymm = now.toISOString().slice(2, 7).replace("-", "");
  const rand = Array.from(randomBytes(5), (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `VHI-${yymm}-${rand}`;
}

const history = (from: string | null, to: string, note?: string, by?: string) => ({ from, to, at: new Date(), note, by });

function isDuplicateKey(e: unknown) {
  const err = e as { code?: number; writeErrors?: { code?: number }[] };
  return err?.code === 11000 || err?.writeErrors?.some((w) => w.code === 11000);
}

/* ─────────────── Locks & capacity ─────────────── */

async function takePropertyHold(propertyId: string, nights: ISODate[], bookingId: unknown, expiresAt: Date | null, session?: ClientSession) {
  // Clear holds that expired but haven't been swept by the TTL monitor yet.
  await InventoryLock.deleteMany({ propertyId, night: { $in: nights }, type: "hold", expiresAt: { $lt: new Date() } }, { session });
  try {
    await InventoryLock.insertMany(
      nights.map((night) => ({ propertyId, night, type: expiresAt ? "hold" : "booked", bookingId, expiresAt: expiresAt ?? undefined })),
      { session, ordered: true },
    );
  } catch (e) {
    if (isDuplicateKey(e)) throw new AppError("NOT_AVAILABLE", "Those dates were just taken. Please choose different dates.", 409);
    throw e;
  }
}

async function reserveTourCapacity(tour: Doc, travelDate: ISODate, people: number, session?: ClientSession) {
  const capacity = tour.dailyCapacity ?? 999;
  const dep = await TourDeparture.findOneAndUpdate(
    { tourId: tour._id, date: travelDate },
    { $setOnInsert: { tourId: tour._id, date: travelDate, capacity, booked: 0, status: "open" } },
    { upsert: true, new: true, session },
  ).lean<Doc>();
  if (dep.status !== "open") throw new AppError("SOLD_OUT", "This date isn't available.", 409);
  const res = await TourDeparture.updateOne({ _id: dep._id, booked: { $lte: dep.capacity - people } }, { $inc: { booked: people } }, { session });
  if (res.modifiedCount !== 1) throw new AppError("SOLD_OUT", "Not enough places left on this date.", 409);
  return dep._id;
}

async function releaseInventory(booking: Doc, session?: ClientSession) {
  await InventoryLock.deleteMany({ bookingId: booking._id }, { session });
  for (const item of booking.items ?? []) {
    if (item.kind === "tour" && item.departureId) {
      await TourDeparture.updateOne({ _id: item.departureId }, { $inc: { booked: -((item.adults ?? 0) + (item.children ?? 0)) } }, { session });
    }
  }
}

async function reserveCoupon(quote: Quote, discountKind: string | null, bookingId: unknown, phone: string, session: ClientSession) {
  if (discountKind !== "coupon" || !quote.discount) return;
  const coupon = await Coupon.findById(quote.discount.id).session(session).lean<Doc>();
  if (!coupon) throw new AppError("COUPON_INVALID", "That coupon is no longer valid.");
  const filter: Record<string, unknown> = { _id: coupon._id };
  if (coupon.usageLimit) filter.usedCount = { $lt: coupon.usageLimit };
  const res = await Coupon.updateOne(filter, { $inc: { usedCount: 1 } }, { session });
  if (res.modifiedCount !== 1) throw new AppError("COUPON_INVALID", "That coupon has been fully redeemed.");
  await CouponRedemption.create([{ couponId: coupon._id, bookingId, phone, amount: quote.discount.amount, status: "reserved" }], { session });
}

async function releaseCoupon(bookingId: unknown, session?: ClientSession) {
  const r = await CouponRedemption.findOneAndUpdate({ bookingId, status: "reserved" }, { status: "released" }, { session }).lean<Doc>();
  if (r) await Coupon.updateOne({ _id: r.couponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
}

/* ─────────────── Create ─────────────── */

async function openPayment(booking: Doc, description: string): Promise<CheckoutSession> {
  const gateway = paymentGateway();
  const order = await gateway.createOrder({ amount: booking.pricing.total, receipt: booking.code, notes: { bookingCode: booking.code, vertical: booking.vertical } });
  await Payment.create({ bookingId: booking._id, bookingCode: booking.code, provider: gateway.name, orderId: order.orderId, amount: order.amount, status: "created" });
  await Booking.updateOne({ _id: booking._id }, { paymentStatus: "pending" });
  return {
    bookingCode: booking.code,
    provider: gateway.name,
    keyId: gateway.publicKeyId,
    orderId: order.orderId,
    amount: order.amount,
    holdExpiresAt: new Date(booking.holdExpiresAt).toISOString(),
    prefill: { name: booking.guest.name, email: booking.guest.email, contact: booking.guest.phone },
    description,
  };
}

export async function createStayBooking(input: { request: StayQuoteRequest; guest: GuestInput; specialRequests?: string; attribution?: Attribution }): Promise<CheckoutSession> {
  const { quote, discountKind, property, pkg, meal, settings } = await quoteStayRequest({ ...input.request, phone: input.guest.phone });
  const { request } = input;

  const check = await isStayAvailable(property, request.checkIn, request.checkOut, { live: true });
  if (!check.available) throw new AppError("NOT_AVAILABLE", "Sorry, some of those nights are no longer available.", 409, { blockedNights: check.blockedNights });

  const holdExpiresAt = new Date(Date.now() + settings.booking.holdMinutes * 60_000);
  const nights = nightsBetween(request.checkIn, request.checkOut);

  const booking = await withTransaction(async (session) => {
    const [created] = await Booking.create(
      [
        {
          code: bookingCode(),
          vertical: pkg ? "stay_food" : "stay",
          guest: input.guest,
          items: [
            {
              kind: "property",
              propertyId: property._id,
              packageId: pkg?._id,
              title: pkg ? `${pkg.title} · ${property.name}` : property.name,
              checkIn: request.checkIn,
              checkOut: request.checkOut,
              nights: nights.length,
              adults: request.adults,
              children: request.children,
              childAges: request.childAges,
              mealPlanId: meal?._id,
              mealPlanName: meal?.name,
            },
          ],
          addOns: quote.lines.filter((l) => l.type === "addon").map((l) => ({ addOnId: l.meta?.addOnId, name: l.label, qty: l.quantity, unitPrice: l.unitPrice, amount: l.amount })),
          specialRequests: input.specialRequests,
          pricing: { ...quote, discount: quote.discount ? { ...quote.discount, kind: discountKind } : undefined },
          holdExpiresAt,
          attribution: input.attribution,
          statusHistory: [history(null, "pending_payment", "Checkout started")],
        },
      ],
      { session },
    );
    await takePropertyHold(property._id, nights, created._id, holdExpiresAt, session);
    await reserveCoupon(quote, discountKind, created._id, input.guest.phone, session);
    return created.toObject();
  });

  await trackServerEvent({ type: "begin_checkout", vertical: booking.vertical, itemId: property._id, value: quote.total, utm_source: input.attribution?.utm_source, utm_campaign: input.attribution?.utm_campaign });
  return openPayment(booking, booking.items[0].title);
}

export async function createTourBooking(input: { request: TourQuoteRequest; guest: GuestInput; specialRequests?: string; pickupPoint?: string; attribution?: Attribution }): Promise<CheckoutSession> {
  const { quote, discountKind, tour, settings } = await quoteTourRequest({ ...input.request, phone: input.guest.phone });
  const { request } = input;
  const people = request.adults + request.children;
  const holdExpiresAt = new Date(Date.now() + settings.booking.holdMinutes * 60_000);

  // Auto-allocate a VHI property for the tour's nights, if configured.
  let stayPropertyId: string | undefined;
  if (tour.stayAllocation === "auto" && tour.stayPropertyIds?.length && (tour.nights ?? 0) > 0) {
    const checkOut = addDays(request.travelDate, tour.nights!);
    for (const pid of tour.stayPropertyIds) {
      const p = await Property.findById(pid).lean<Doc>();
      if (p && (await isStayAvailable(p, request.travelDate, checkOut, { live: true })).available) {
        stayPropertyId = pid;
        break;
      }
    }
  }

  const booking = await withTransaction(async (session) => {
    const departureId = await reserveTourCapacity(tour, request.travelDate, people, session);
    const items: Doc[] = [
      {
        kind: "tour",
        tourId: tour._id,
        departureId,
        title: tour.title,
        travelDate: request.travelDate,
        nights: tour.nights,
        adults: request.adults,
        children: request.children,
        childAges: request.childAges,
      },
    ];
    if (stayPropertyId) {
      items.push({ kind: "property", propertyId: stayPropertyId, title: "Tour stay", checkIn: request.travelDate, checkOut: addDays(request.travelDate, tour.nights!), nights: tour.nights, adults: request.adults, children: request.children });
    }
    const [created] = await Booking.create(
      [
        {
          code: bookingCode(),
          vertical: "darshan",
          guest: input.guest,
          items,
          addOns: quote.lines.filter((l) => l.type === "addon").map((l) => ({ addOnId: l.meta?.addOnId, name: l.label, qty: l.quantity, unitPrice: l.unitPrice, amount: l.amount })),
          specialRequests: [input.pickupPoint ? `Pickup: ${input.pickupPoint}` : "", input.specialRequests ?? ""].filter(Boolean).join("\n") || undefined,
          pricing: { ...quote, discount: quote.discount ? { ...quote.discount, kind: discountKind } : undefined },
          holdExpiresAt,
          attribution: input.attribution,
          statusHistory: [history(null, "pending_payment", "Checkout started")],
        },
      ],
      { session },
    );
    if (stayPropertyId) await takePropertyHold(stayPropertyId, nightsBetween(request.travelDate, addDays(request.travelDate, tour.nights!)), created._id, holdExpiresAt, session);
    await reserveCoupon(quote, discountKind, created._id, input.guest.phone, session);
    return created.toObject();
  });

  await trackServerEvent({ type: "begin_checkout", vertical: "darshan", itemId: tour._id, value: quote.total, utm_source: input.attribution?.utm_source, utm_campaign: input.attribution?.utm_campaign });
  return openPayment(booking, tour.title);
}

/* ─────────────── Payment results ─────────────── */

async function nextInvoiceNumber(prefix: string, session: ClientSession) {
  const now = new Date(Date.now() + 330 * 60_000);
  const y = now.getUTCFullYear() % 100;
  const fy = now.getUTCMonth() >= 3 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  const c = await Counter.findOneAndUpdate({ _id: `invoice-${fy}` }, { $inc: { seq: 1 } }, { upsert: true, new: true, session }).lean<{ seq: number }>();
  return `${prefix}/${fy}/${String(c!.seq).padStart(5, "0")}`;
}

/** Re-acquire inventory for a booking whose hold lapsed before payment landed. */
async function reacquire(booking: Doc, session: ClientSession) {
  for (const item of booking.items ?? []) {
    if (item.kind === "property" && item.checkIn && item.checkOut) {
      const p = await Property.findById(item.propertyId).lean<Doc>();
      const ok = p && (await isStayAvailable(p, item.checkIn, item.checkOut, { live: true })).available;
      if (!ok) throw new AppError("NOT_AVAILABLE", "Inventory no longer available", 409);
      await takePropertyHold(String(item.propertyId), nightsBetween(item.checkIn, item.checkOut), booking._id, null, session);
    }
    if (item.kind === "tour" && item.departureId) {
      const dep = await TourDeparture.findById(item.departureId).session(session).lean<Doc>();
      const people = (item.adults ?? 0) + (item.children ?? 0);
      const res = await TourDeparture.updateOne({ _id: item.departureId, booked: { $lte: (dep?.capacity ?? 0) - people } }, { $inc: { booked: people } }, { session });
      if (res.modifiedCount !== 1) throw new AppError("SOLD_OUT", "Capacity no longer available", 409);
    }
  }
}

export async function confirmPayment(args: { orderId: string; paymentId: string; method?: string; via: "checkout" | "webhook" | "reconcile" }) {
  await connectDB();
  const payment = await Payment.findOne({ orderId: args.orderId, kind: "payment" }).lean<Doc>();
  if (!payment) throw new AppError("NOT_FOUND", "Unknown payment order.", 404);
  const booking = await Booking.findById(payment.bookingId).lean<Doc>();
  if (!booking) throw new AppError("NOT_FOUND", "Booking not found.", 404);
  if (booking.paymentStatus === "paid") return { code: booking.code, status: booking.status as string };

  const settings = await getSettings();

  try {
    await withTransaction(async (session) => {
      if (booking.status === "expired" || booking.status === "failed") {
        await reacquire(booking, session);
      } else {
        await InventoryLock.updateMany({ bookingId: booking._id }, { $set: { type: "booked" }, $unset: { expiresAt: 1 } }, { session });
      }
      await CouponRedemption.updateOne({ bookingId: booking._id }, { status: "used" }, { session });
      if (booking.status === "expired") {
        // coupon was released on expiry — re-count it
        const r = await CouponRedemption.findOne({ bookingId: booking._id }).session(session).lean<Doc>();
        if (r) await Coupon.updateOne({ _id: r.couponId }, { $inc: { usedCount: 1 } }, { session });
      }
      const prior = await Customer.findOne({ phone: booking.guest.phone }).session(session).lean<Doc>();
      const customer = await Customer.findOneAndUpdate(
        { phone: booking.guest.phone },
        {
          $set: { name: booking.guest.name, email: booking.guest.email, city: booking.guest.city, lastBookingAt: new Date() },
          $setOnInsert: { firstBookingAt: new Date() },
          $inc: { bookingsCount: 1, totalSpent: booking.pricing.total },
        },
        { upsert: true, new: true, session },
      ).lean<Doc>();
      const invoiceNumber = await nextInvoiceNumber(settings.tax.invoicePrefix || "VHI", session);
      const items = (booking.items ?? []).map((i: Doc) => (i.kind === "property" ? { ...i, channel: { ...(i.channel ?? {}), syncStatus: "pending", attempts: 0 } } : i));
      await Booking.updateOne(
        { _id: booking._id },
        {
          $set: {
            status: "confirmed",
            paymentStatus: "paid",
            amountPaid: booking.pricing.total,
            customerId: customer._id,
            isRepeatGuest: (prior?.bookingsCount ?? 0) > 0,
            invoiceNumber,
            items,
          },
          $unset: { holdExpiresAt: 1 },
          $push: { statusHistory: history(booking.status, "confirmed", `Payment ${args.paymentId} via ${args.via}`) },
        },
        { session },
      );
      await Payment.updateOne({ _id: payment._id }, { status: "captured", paymentId: args.paymentId, method: args.method }, { session });
    });
  } catch (e) {
    if (e instanceof AppError && (e.code === "NOT_AVAILABLE" || e.code === "SOLD_OUT")) {
      await handlePaidButUnavailable(booking, payment, args.paymentId);
      return { code: booking.code, status: "failed" };
    }
    throw e;
  }

  const fresh = await Booking.findById(booking._id).lean<Doc>();
  await enqueueBookingNotifications(fresh);
  await trackServerEvent({ type: "purchase", vertical: fresh.vertical, itemId: String(fresh.items?.[0]?.propertyId ?? fresh.items?.[0]?.tourId ?? ""), value: fresh.pricing.total, utm_source: fresh.attribution?.utm_source, utm_campaign: fresh.attribution?.utm_campaign });
  await sendMetaEvent({ name: "Purchase", eventId: fresh.code, value: paiseToRupees(fresh.pricing.total), contentName: fresh.items?.[0]?.title, user: { phone: fresh.guest.phone, email: fresh.guest.email } });
  // Best-effort immediate delivery; cron retries anything that fails.
  await Promise.race([dispatchOutbox(20), new Promise((r) => setTimeout(r, 4000))]).catch(() => undefined);
  syncChannelForBooking(String(fresh._id)).catch(() => undefined);
  return { code: fresh.code, status: "confirmed" };
}

/** Paid after inventory was lost: mark failed, refund in full, alert VHI. */
async function handlePaidButUnavailable(booking: Doc, payment: Doc, paymentId: string) {
  let refundNote = "Automatic refund failed — refund manually.";
  try {
    const refund = await paymentGateway().refund({ paymentId, amount: booking.pricing.total, notes: { reason: "inventory_unavailable", bookingCode: booking.code } });
    await Payment.create({ bookingId: booking._id, bookingCode: booking.code, provider: payment.provider, kind: "refund", paymentId, refundId: refund.id, amount: refund.amount, status: refund.status });
    refundNote = `Refund ${refund.id} initiated.`;
  } catch (e) {
    console.error("[booking] auto-refund failed", e);
  }
  await Payment.updateOne({ _id: payment._id }, { status: "captured", paymentId });
  await Booking.updateOne(
    { _id: booking._id },
    {
      status: "failed",
      paymentStatus: refundNote.startsWith("Refund") ? "refunded" : "paid",
      amountPaid: booking.pricing.total,
      $push: { statusHistory: history(booking.status, "failed", `Paid after hold expired and inventory was taken. ${refundNote}`) },
    },
  );
  await enqueueUrgentAdminAlert(`Booking ${booking.code}: payment received after dates were taken. ${refundNote} Guest: ${booking.guest.name} ${booking.guest.phone}`);
}

export async function recordPaymentFailure(args: { orderId: string; paymentId?: string; reason?: string }) {
  await connectDB();
  const payment = await Payment.findOneAndUpdate(
    { orderId: args.orderId, kind: "payment", status: { $ne: "captured" } },
    { status: "failed", paymentId: args.paymentId, errorDescription: args.reason },
    { new: true },
  ).lean<Doc>();
  if (!payment) return;
  await Booking.updateOne({ _id: payment.bookingId, paymentStatus: { $ne: "paid" } }, { paymentStatus: "failed" });
}

/** New Razorpay order for a pending booking; extends the hold if inventory is still free. */
export async function retryPayment(code: string): Promise<CheckoutSession> {
  await connectDB();
  const booking = await Booking.findOne({ code }).lean<Doc>();
  if (!booking) throw new AppError("NOT_FOUND", "Booking not found.", 404);
  if (booking.paymentStatus === "paid") throw new AppError("ALREADY_PAID", "This booking is already paid.");
  if (booking.status !== "pending_payment") throw new AppError("EXPIRED", "This booking has expired. Please start a new booking.", 410);
  const settings = await getSettings();
  const holdExpiresAt = new Date(Date.now() + settings.booking.holdMinutes * 60_000);
  await InventoryLock.updateMany({ bookingId: booking._id, type: "hold" }, { expiresAt: holdExpiresAt });
  const locks = await InventoryLock.countDocuments({ bookingId: booking._id });
  const expectedLocks = (booking.items ?? [])
    .filter((i: Doc) => i.kind === "property")
    .reduce((s: number, i: Doc) => s + (i.nights ?? 0), 0);
  if (locks < expectedLocks) throw new AppError("EXPIRED", "Your hold expired and the dates are no longer reserved. Please start again.", 410);
  await Booking.updateOne({ _id: booking._id }, { holdExpiresAt, paymentStatus: "pending" });
  return openPayment({ ...booking, holdExpiresAt }, booking.items?.[0]?.title ?? "VHI booking");
}

/* ─────────────── Background jobs ─────────────── */

export async function expireHolds() {
  await connectDB();
  const graceMs = 2 * 60_000; // allow in-flight payments to land
  const stale = await Booking.find({ status: "pending_payment", holdExpiresAt: { $lt: new Date(Date.now() - graceMs) } }).limit(100).lean<Doc[]>();
  for (const b of stale) {
    await withTransaction(async (session) => {
      const res = await Booking.updateOne(
        { _id: b._id, status: "pending_payment" },
        { status: "expired", $push: { statusHistory: history("pending_payment", "expired", "Hold expired without payment") } },
        { session },
      );
      if (res.modifiedCount !== 1) return;
      await releaseInventory(b, session);
      await releaseCoupon(b._id, session);
    });
  }
  return { expired: stale.length };
}

export async function syncChannelForBooking(bookingId: string) {
  await connectDB();
  const booking = await Booking.findById(bookingId).lean<Doc>();
  if (!booking || booking.status !== "confirmed") return;
  const cm = channelManager();
  for (const [idx, item] of (booking.items ?? []).entries()) {
    if (item.kind !== "property" || item.channel?.syncStatus !== "pending") continue;
    const p = await Property.findById(item.propertyId).lean<Doc>();
    if (!p) continue;
    try {
      const { externalReservationId } = await cm.createReservation({
        bookingCode: booking.code,
        ref: channelRef(p),
        checkIn: item.checkIn,
        checkOut: item.checkOut,
        adults: item.adults,
        children: item.children,
        guest: { name: booking.guest.name, phone: booking.guest.phone, email: booking.guest.email },
        totalAmount: booking.pricing.total,
        amountPaid: booking.amountPaid,
        notes: booking.specialRequests,
      });
      await Booking.updateOne({ _id: booking._id }, { $set: { [`items.${idx}.channel.syncStatus`]: "synced", [`items.${idx}.channel.externalReservationId`]: externalReservationId } });
    } catch (e) {
      await Booking.updateOne(
        { _id: booking._id },
        { $set: { [`items.${idx}.channel.lastError`]: (e as Error).message }, $inc: { [`items.${idx}.channel.attempts`]: 1 } },
      );
      const attempts = (item.channel?.attempts ?? 0) + 1;
      if (attempts >= 5) {
        await Booking.updateOne({ _id: booking._id }, { $set: { [`items.${idx}.channel.syncStatus`]: "failed" } });
        await enqueueUrgentAdminAlert(`Channel manager sync FAILED for ${booking.code} (${item.title}). Block these dates in eZee manually.`);
      }
    }
  }
}

export async function syncPendingChannelReservations() {
  await connectDB();
  const pending = await Booking.find({ status: "confirmed", "items.channel.syncStatus": "pending" }).select("_id").limit(25).lean<Doc[]>();
  for (const b of pending) await syncChannelForBooking(String(b._id));
  return { processed: pending.length };
}

export async function reconcilePayments() {
  await connectDB();
  const gateway = paymentGateway();
  if (gateway.name === "mock") return { checked: 0 };
  const stale = await Payment.find({ kind: "payment", status: { $in: ["created", "failed"] }, createdAt: { $lt: new Date(Date.now() - 5 * 60_000), $gt: new Date(Date.now() - 48 * 3_600_000) } })
    .limit(30)
    .lean<Doc[]>();
  let confirmed = 0;
  for (const p of stale) {
    const payments = await gateway.fetchOrderPayments(p.orderId);
    const captured = payments.find((x) => x.status === "captured");
    if (captured) {
      await confirmPayment({ orderId: p.orderId, paymentId: captured.id, method: captured.method, via: "reconcile" });
      confirmed++;
    }
  }
  return { checked: stale.length, confirmed };
}

/* ─────────────── Admin operations ─────────────── */

const ADMIN_TRANSITIONS: Record<string, string[]> = {
  confirmed: ["checked_in"],
  checked_in: ["checked_out"],
};

export async function adminSetStatus(admin: AdminUser, bookingId: string, to: "checked_in" | "checked_out") {
  await connectDB();
  const b = await Booking.findById(bookingId).lean<Doc>();
  if (!b) throw new AppError("NOT_FOUND", "Booking not found.", 404);
  if (!ADMIN_TRANSITIONS[b.status]?.includes(to)) throw new AppError("INVALID_TRANSITION", `Can't move a ${b.status} booking to ${to}.`);
  await Booking.updateOne({ _id: b._id }, { status: to, $push: { statusHistory: history(b.status, to, undefined, admin.id) } });
  await audit(admin, `booking.${to}`, "Booking", String(b._id), { summary: b.code });
}

export async function adminAddNote(admin: AdminUser, bookingId: string, text: string) {
  await connectDB();
  await Booking.updateOne({ _id: bookingId }, { $push: { internalNotes: { text, by: admin.id, byName: admin.name, at: new Date() } } });
}

export async function previewCancellation(bookingId: string) {
  await connectDB();
  const b = await Booking.findById(bookingId).lean<Doc>();
  if (!b) throw new AppError("NOT_FOUND", "Booking not found.", 404);
  const policy = await CancellationPolicy.findOne({ vertical: b.vertical, isDefault: true }).lean<Doc>();
  const start = b.items?.[0]?.checkIn ?? b.items?.[0]?.travelDate ?? todayIST();
  if (!policy || !policy.rules?.length) return { booking: b, calc: null, reason: "No cancellation policy rules configured for this offering — enter the refund amount manually." };
  const calc = calculateRefund({
    policy: {
      id: String(policy._id),
      name: policy.name,
      rules: policy.rules,
      nonRefundableLineTypes: policy.nonRefundableLineTypes ?? [],
      fixedDeduction: policy.fixedDeduction ?? 0,
      refundGst: policy.refundGst ?? true,
    },
    lines: b.pricing.lines,
    total: b.pricing.total,
    amountPaid: b.amountPaid ?? 0,
    alreadyRefunded: b.amountRefunded ?? 0,
    serviceStartDate: start,
    cancelDate: todayIST(),
  });
  return { booking: b, calc, reason: null };
}

export async function adminCancel(admin: AdminUser, bookingId: string, opts: { reason: string; refundAmount: number; notifyGuest: boolean }) {
  await connectDB();
  const b = await Booking.findById(bookingId).lean<Doc>();
  if (!b) throw new AppError("NOT_FOUND", "Booking not found.", 404);
  if (!["confirmed", "pending_payment"].includes(b.status)) throw new AppError("INVALID_TRANSITION", `A ${b.status} booking can't be cancelled.`);
  const refundable = (b.amountPaid ?? 0) - (b.amountRefunded ?? 0);
  if (opts.refundAmount < 0 || opts.refundAmount > refundable) throw new AppError("INVALID_REFUND", `Refund must be between ₹0 and ₹${paiseToRupees(refundable)}.`);

  let refundStatus: string | null = null;
  if (opts.refundAmount > 0) {
    const pay = await Payment.findOne({ bookingId: b._id, kind: "payment", status: "captured" }).lean<Doc>();
    if (!pay?.paymentId) throw new AppError("NO_PAYMENT", "No captured payment to refund.");
    const refund = await paymentGateway().refund({ paymentId: pay.paymentId, amount: opts.refundAmount, notes: { bookingCode: b.code, reason: opts.reason } });
    await Payment.create({ bookingId: b._id, bookingCode: b.code, provider: pay.provider, kind: "refund", paymentId: pay.paymentId, refundId: refund.id, amount: refund.amount, status: refund.status });
    refundStatus = refund.status;
  }

  await withTransaction(async (session) => {
    await releaseInventory(b, session);
    if (b.status === "pending_payment") await releaseCoupon(b._id, session);
    const totalRefunded = (b.amountRefunded ?? 0) + opts.refundAmount;
    await Booking.updateOne(
      { _id: b._id },
      {
        status: "cancelled",
        paymentStatus: totalRefunded === 0 ? b.paymentStatus : totalRefunded >= (b.amountPaid ?? 0) ? "refunded" : "partially_refunded",
        amountRefunded: totalRefunded,
        cancellation: { at: new Date(), by: admin.id, reason: opts.reason, refundAmount: opts.refundAmount },
        $push: { statusHistory: history(b.status, "cancelled", `${opts.reason}${refundStatus ? ` · refund ${refundStatus}` : ""}`, admin.id) },
      },
      { session },
    );
  });

  // Release in the channel manager.
  for (const item of b.items ?? []) {
    if (item.channel?.externalReservationId) {
      await channelManager()
        .cancelReservation(item.channel.externalReservationId, opts.reason)
        .catch(async (e: Error) => {
          await enqueueUrgentAdminAlert(`Cancel ${b.code} in eZee manually: ${e.message}`);
        });
    }
  }
  await audit(admin, "booking.cancel", "Booking", String(b._id), { summary: `${b.code} · refund ₹${paiseToRupees(opts.refundAmount)}`, after: { reason: opts.reason } });
  if (opts.notifyGuest) await enqueueCancellationNotifications(String(b._id), opts.refundAmount);
  await dispatchOutbox(10).catch(() => undefined);
}
