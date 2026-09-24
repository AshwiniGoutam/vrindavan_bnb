import { db } from "./db";
import { addDaysISO, eachDay, parseUTC, todayIST, utcISO } from "./utils";

/** A PENDING booking holds the dates for 15 minutes while the guest pays. */
const HOLD_MS = 15 * 60_000;

const activeBookingFilter = () => ({
  OR: [
    { status: "CONFIRMED" as const },
    { status: "PENDING" as const, createdAt: { gt: new Date(Date.now() - HOLD_MS) } },
  ],
});

export async function isAvailable(stayId: string, checkIn: string, checkOut: string, excludeBookingId?: string) {
  const [bookings, blocks] = await Promise.all([
    db.booking.count({
      where: {
        stayId, checkIn: { lt: parseUTC(checkOut) }, checkOut: { gt: parseUTC(checkIn) },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        ...activeBookingFilter(),
      },
    }),
    db.externalBlock.count({ where: { stayId, start: { lt: parseUTC(checkOut) }, end: { gt: parseUTC(checkIn) } } }),
  ]);
  return bookings + blocks === 0;
}

/** Disabled calendar days for a stay: [from, to] inclusive. Check-out day stays selectable. */
export async function getUnavailableRanges(stayId: string) {
  const today = parseUTC(todayIST());
  const [bookings, blocks] = await Promise.all([
    db.booking.findMany({ where: { stayId, checkOut: { gt: today }, ...activeBookingFilter() }, select: { checkIn: true, checkOut: true } }),
    db.externalBlock.findMany({ where: { stayId, end: { gt: today } }, select: { start: true, end: true } }),
  ]);
  const out = [...bookings.map((b) => ({ s: b.checkIn, e: b.checkOut })), ...blocks.map((b) => ({ s: b.start, e: b.end }))];
  return out.map(({ s, e }) => ({ from: utcISO(s), to: addDaysISO(utcISO(e), -1) }));
}

/** Stay ids that clash with the requested dates (used by search filters). */
export async function unavailableStayIds(checkIn: string, checkOut: string) {
  const [b, x] = await Promise.all([
    db.booking.findMany({
      where: { checkIn: { lt: parseUTC(checkOut) }, checkOut: { gt: parseUTC(checkIn) }, ...activeBookingFilter() },
      select: { stayId: true },
    }),
    db.externalBlock.findMany({ where: { start: { lt: parseUTC(checkOut) }, end: { gt: parseUTC(checkIn) } }, select: { stayId: true } }),
  ]);
  return [...new Set([...b, ...x].map((r) => r.stayId))];
}

/**
 * Per-night availability (1 = free, 0 = taken) for pushing to a channel manager.
 * Only CONFIRMED bookings and blocks count; short payment holds are deliberately not pushed
 * (they'd need a second push when they expire).
 */
export async function getDayAvailability(stayId: string, from: string, to: string) {
  const endExclusive = addDaysISO(to, 1);
  const [b, x] = await Promise.all([
    db.booking.findMany({
      where: { stayId, status: "CONFIRMED", checkIn: { lt: parseUTC(endExclusive) }, checkOut: { gt: parseUTC(from) } },
      select: { checkIn: true, checkOut: true },
    }),
    db.externalBlock.findMany({
      where: { stayId, start: { lt: parseUTC(endExclusive) }, end: { gt: parseUTC(from) } },
      select: { start: true, end: true },
    }),
  ]);
  const taken = new Set<string>();
  for (const r of [...b.map((r) => [r.checkIn, r.checkOut]), ...x.map((r) => [r.start, r.end])]) {
    for (let d = utcISO(r[0]); d < utcISO(r[1]); d = addDaysISO(d, 1)) taken.add(d);
  }
  return eachDay(from, to).map((date) => ({ date, value: (taken.has(date) ? 0 : 1) as 0 | 1 }));
}
