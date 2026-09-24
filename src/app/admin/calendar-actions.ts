"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { isAvailable } from "@/lib/availability";
import { cancelBooking, createManualBooking, scheduleChannelPush } from "@/lib/booking-service";
import { addDaysISO, eachDay, isISODate, isMonth, parseUTC, todayIST } from "@/lib/utils";
import type { BookingSource } from "@/lib/db";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optInt = (fd: FormData, k: string) => {
  const v = str(fd, k);
  if (v === "") return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

function ctx(fd: FormData) {
  const stayId = str(fd, "stayId"), from = str(fd, "from"), to = str(fd, "to");
  const month = isMonth(str(fd, "month")) ? str(fd, "month") : todayIST().slice(0, 7);
  return { stayId, from, to, month, valid: isISODate(from) && isISODate(to) && from <= to && eachDay(from, to).length <= 366 };
}

function back(stayId: string, month: string, kind: "notice" | "error", msg: string): never {
  revalidatePath("/admin", "layout");
  redirect(`/admin/calendar/${stayId}?month=${month}&${kind}=${encodeURIComponent(msg)}`);
}

export async function addBookingAction(fd: FormData) {
  await requireAdmin();
  const c = ctx(fd);
  if (!c.valid) back(c.stayId, c.month, "error", "Select valid dates first.");
  const sources = ["MANUAL", "AIRBNB", "BOOKING_COM", "MAKEMYTRIP", "OTHER"];
  const source = (sources.includes(str(fd, "source")) ? str(fd, "source") : "MANUAL") as BookingSource;
  const r = await createManualBooking({
    stayId: c.stayId, checkIn: c.from, checkOut: addDaysISO(c.to, 1), guests: optInt(fd, "guests") ?? 2,
    guestName: str(fd, "guestName"), guestPhone: str(fd, "guestPhone"), guestEmail: str(fd, "guestEmail"),
    total: optInt(fd, "total") ?? null, source, paid: fd.get("paid") === "on", notes: str(fd, "notes"),
  });
  back(c.stayId, c.month, r.ok ? "notice" : "error", r.ok ? "Booking added. Connected channels are being updated." : r.error);
}

export async function blockDatesAction(fd: FormData) {
  await requireAdmin();
  const c = ctx(fd);
  if (!c.valid) back(c.stayId, c.month, "error", "Select valid dates first.");
  const checkOut = addDaysISO(c.to, 1);
  if (!(await isAvailable(c.stayId, c.from, checkOut))) back(c.stayId, c.month, "error", "Some of those nights already have a booking or block.");
  await db.externalBlock.create({
    data: { stayId: c.stayId, start: parseUTC(c.from), end: parseUTC(checkOut), source: "Manual", summary: str(fd, "note") || "Blocked by host" },
  });
  scheduleChannelPush(c.stayId, c.from, checkOut);
  back(c.stayId, c.month, "notice", "Dates blocked. They're now unavailable on your site and connected channels.");
}

export async function unblockAction(fd: FormData) {
  await requireAdmin();
  const c = ctx(fd);
  const block = await db.externalBlock.findFirst({ where: { id: str(fd, "blockId"), stayId: c.stayId, feedId: null } });
  if (!block) back(c.stayId, c.month, "error", "That block can't be removed here. Calendar-sync blocks are removed at the source channel.");
  await db.externalBlock.delete({ where: { id: block.id } });
  scheduleChannelPush(c.stayId, block.start.toISOString().slice(0, 10), block.end.toISOString().slice(0, 10));
  back(c.stayId, c.month, "notice", "Block removed. The dates are open again.");
}

export async function setRatesAction(fd: FormData) {
  await requireAdmin();
  const c = ctx(fd);
  if (!c.valid) back(c.stayId, c.month, "error", "Select valid dates first.");
  const dates = eachDay(c.from, c.to);
  const reset = str(fd, "intent") === "reset";

  if (reset) {
    await db.dayRate.deleteMany({ where: { stayId: c.stayId, date: { gte: parseUTC(c.from), lte: parseUTC(c.to) } } });
  } else {
    const price = optInt(fd, "price"), minNights = optInt(fd, "minNights");
    if (price === undefined && minNights === undefined) back(c.stayId, c.month, "error", "Enter a price, a minimum stay, or both.");
    if (price !== undefined && price < 1) back(c.stayId, c.month, "error", "Price must be more than zero.");
    await db.$transaction(dates.map((d) => db.dayRate.upsert({
      where: { stayId_date: { stayId: c.stayId, date: parseUTC(d) } },
      update: { ...(price !== undefined ? { price } : {}), ...(minNights !== undefined ? { minNights: minNights || null } : {}) },
      create: { stayId: c.stayId, date: parseUTC(d), price: price ?? null, minNights: minNights || null },
    })));
  }
  scheduleChannelPush(c.stayId, c.from, addDaysISO(c.to, 1), { rates: true });
  back(c.stayId, c.month, "notice", reset ? "Back to the standard price for those nights." : `Updated ${dates.length} night${dates.length > 1 ? "s" : ""}. Channels are being updated.`);
}

export async function cancelFromCalendarAction(fd: FormData) {
  await requireAdmin();
  const c = ctx(fd);
  const mode = ["policy", "full", "none"].includes(str(fd, "refundMode")) ? (str(fd, "refundMode") as "policy") : "policy";
  const r = await cancelBooking({ bookingId: str(fd, "bookingId"), actor: "admin", refundMode: mode });
  back(c.stayId, c.month, r.ok ? "notice" : "error", r.ok ? `Booking cancelled${r.refundAmount ? `, refund of ₹${r.refundAmount} started` : ""}. Dates are open again.` : r.error);
}
