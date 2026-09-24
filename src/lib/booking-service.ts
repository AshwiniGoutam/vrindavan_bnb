import { randomBytes } from "node:crypto";
import type { BookingSource } from "@/lib/db";
import { db } from "./db";
import { isAvailable } from "./availability";
import { background } from "./background";
import { channexEnabled, pushAvailability, pushRates } from "./channex";
import { cancellationPolicy } from "./config";
import { getDayRates } from "./dayrates";
import { mail } from "./email";
import { notifyBookingConfirmed } from "./notify";
import { buildQuote } from "./pricing";
import { refundPayment, razorpayConfigured } from "./razorpay";
import { computeRefund } from "./refund";
import { addDaysISO, isISODate, nightsBetween, parseUTC, todayIST, utcISO } from "./utils";

const code = () => `KTH-${randomBytes(3).toString("hex").toUpperCase()}`;

/** Tell the channel manager the dates changed. Runs after the response so the guest isn't kept waiting. */
export function scheduleChannelPush(stayId: string, checkIn: string, checkOut: string, opts: { rates?: boolean } = {}) {
  if (!channexEnabled()) return;
  background(async () => {
    await pushAvailability(stayId, checkIn, addDaysISO(checkOut, -1));
    if (opts.rates) await pushRates(stayId, checkIn, addDaysISO(checkOut, -1));
  });
}

/** Marks a booking paid. Safe to call twice (verify route + webhook). Handles a payment that lands after the hold expired. */
export async function confirmPaidBooking(bookingId: string, paymentId: string) {
  const b = await db.booking.findUnique({ where: { id: bookingId }, include: { stay: true } });
  if (!b) return { ok: false as const, reason: "not_found" as const };
  if (b.paymentStatus === "PAID") return { ok: true as const, already: true };

  const ci = utcISO(b.checkIn), co = utcISO(b.checkOut);

  if (b.status !== "CONFIRMED" && !(await isAvailable(b.stayId, ci, co, b.id))) {
    // The guest paid after the 15-minute hold expired and someone else took the dates: refund in full.
    // (Checked for PENDING as well as CANCELLED: the daily cron is what flips expired holds to CANCELLED.)
    try {
      const r = await refundPayment(paymentId, b.total, { booking: b.code, reason: "dates_taken" });
      const updated = await db.booking.update({
        where: { id: b.id },
        data: { razorpayPaymentId: paymentId, paymentStatus: "REFUNDED", refundAmount: b.total, refundId: r.id, cancelReason: "Paid after hold expired and dates were taken" },
        include: { stay: true },
      });
      await mail.autoRefund(updated);
    } catch (e) {
      console.error("[auto-refund failed]", e);
      await mail.adminAlert("Manual refund needed", `Booking ${b.code} was paid (${paymentId}) after its dates were taken. Refund ₹${b.total} manually in Razorpay.`);
    }
    return { ok: false as const, reason: "refunded" as const };
  }

  const updated = await db.booking.update({
    where: { id: b.id },
    data: { status: "CONFIRMED", paymentStatus: "PAID", razorpayPaymentId: paymentId, cancelledAt: null, cancelReason: null },
    include: { stay: true },
  });
  if (b.couponCode) await db.coupon.updateMany({ where: { code: b.couponCode }, data: { usedCount: { increment: 1 } } });

  await Promise.allSettled([notifyBookingConfirmed(b.id), mail.bookingConfirmed(updated), mail.adminNewBooking(updated)]);
  scheduleChannelPush(b.stayId, ci, co);
  return { ok: true as const, already: false };
}

export type CancelResult = { ok: true; refundAmount: number } | { ok: false; error: string };

/** Cancels a booking and refunds through Razorpay when it was a paid direct booking. */
export async function cancelBooking(opts: {
  bookingId: string; actor: "guest" | "admin"; reason?: string; refundMode?: "policy" | "full" | "none";
}): Promise<CancelResult> {
  const b = await db.booking.findUnique({ where: { id: opts.bookingId }, include: { stay: true } });
  if (!b) return { ok: false, error: "Booking not found." };
  if (b.status === "CANCELLED") return { ok: false, error: "This booking is already cancelled." };
  const ci = utcISO(b.checkIn), co = utcISO(b.checkOut);
  if (opts.actor === "guest" && ci < todayIST()) return { ok: false, error: "This stay has already started, so it can't be cancelled online. Message us." };

  const mode = opts.actor === "guest" ? "policy" : opts.refundMode ?? "policy";
  let refundAmount = 0;
  let refundId: string | undefined;

  if (b.paymentStatus === "PAID" && b.source === "DIRECT" && b.razorpayPaymentId && mode !== "none") {
    const amount = mode === "full" ? b.total : computeRefund(cancellationPolicy, ci, todayIST(), b.total).amount;
    if (amount > 0) {
      const simulated = b.razorpayPaymentId.startsWith("demo_pay_"); // payment made in demo mode without Razorpay keys
      if (!simulated && !razorpayConfigured()) return { ok: false, error: "Refunds aren't configured. Contact support." };
      try {
        const r = simulated ? { id: `demo_refund_${b.code}` } : await refundPayment(b.razorpayPaymentId, amount, { booking: b.code, by: opts.actor });
        refundAmount = amount;
        refundId = r.id;
      } catch (e) {
        console.error("[refund failed]", e);
        return { ok: false, error: "We couldn't process the refund right now. The booking has NOT been cancelled. Please try again or message us." };
      }
    }
  }

  const updated = await db.booking.update({
    where: { id: b.id },
    data: {
      status: "CANCELLED", cancelledAt: new Date(), cancelReason: opts.reason ?? (opts.actor === "guest" ? "Cancelled by guest" : "Cancelled by host"),
      refundAmount: refundAmount || null, refundId: refundId ?? null,
      paymentStatus: refundAmount > 0 ? "REFUNDED" : b.paymentStatus,
    },
    include: { stay: true },
  });
  await Promise.allSettled([mail.cancelled(updated, refundAmount), mail.adminAlert(`Booking ${b.code} cancelled`, `${b.guestName} · ${b.stay.title} · ${ci} to ${co} · refund ₹${refundAmount}`)]);
  scheduleChannelPush(b.stayId, ci, co);
  return { ok: true, refundAmount };
}

export type ManualBookingInput = {
  stayId: string; checkIn: string; checkOut: string; guests: number; guestName: string; guestPhone: string; guestEmail: string;
  total?: number | null; source: BookingSource; paid: boolean; notes?: string;
};

/** Phone / walk-in / offline / other-platform bookings entered by the host from the calendar. */
export async function createManualBooking(i: ManualBookingInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!isISODate(i.checkIn) || !isISODate(i.checkOut) || nightsBetween(i.checkIn, i.checkOut) < 1) return { ok: false, error: "Choose valid dates." };
  if (!i.guestName.trim()) return { ok: false, error: "Enter the guest's name." };
  const stay = await db.stay.findUnique({ where: { id: i.stayId } });
  if (!stay) return { ok: false, error: "Stay not found." };
  if (!(await isAvailable(stay.id, i.checkIn, i.checkOut))) return { ok: false, error: "Those dates overlap an existing booking or block." };

  const dayRates = await getDayRates(stay.id, i.checkIn, addDaysISO(i.checkOut, -1));
  const q = buildQuote(stay, i.checkIn, i.checkOut, Math.max(1, i.guests), { dayRates });
  const custom = i.total && i.total > 0 ? Math.round(i.total) : null;

  const b = await db.booking.create({
    data: {
      code: code(), stayId: stay.id, source: i.source, sourceName: i.source === "MANUAL" ? "Manual" : null,
      checkIn: parseUTC(i.checkIn), checkOut: parseUTC(i.checkOut), guests: Math.max(1, i.guests), nights: q.nights,
      subtotal: custom ?? q.subtotal, taxes: custom ? 0 : q.taxes, total: custom ?? q.total,
      status: "CONFIRMED", paymentStatus: i.paid ? "PAID" : "UNPAID",
      guestName: i.guestName.trim(), guestPhone: i.guestPhone.trim(), guestEmail: i.guestEmail.trim(), notes: i.notes?.trim() || null,
    },
    include: { stay: true },
  });
  if (b.guestEmail) void mail.bookingConfirmed(b);
  scheduleChannelPush(stay.id, i.checkIn, i.checkOut);
  return { ok: true, id: b.id };
}

/** Housekeeping, run daily: expire abandoned payments and mark finished stays completed. */
export async function housekeeping() {
  const expired = await db.booking.updateMany({
    where: { status: "PENDING", paymentStatus: { in: ["UNPAID", "FAILED"] }, createdAt: { lt: new Date(Date.now() - 30 * 60_000) } },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Payment not completed" },
  });
  const done = await db.booking.updateMany({
    where: { status: "CONFIRMED", checkOut: { lt: parseUTC(todayIST()) } },
    data: { status: "COMPLETED" },
  });
  return { expired: expired.count, completed: done.count };
}
