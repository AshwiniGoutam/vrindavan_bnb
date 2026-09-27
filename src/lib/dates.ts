/**
 * Calendar dates are handled as ISO strings "YYYY-MM-DD" representing the IST calendar day.
 * This avoids timezone drift: a "night" of 2026-10-04 is the same everywhere
 * (server in UTC, guest in IST, admin anywhere).
 */
export type ISODate = string;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 86_400_000;

export function isISODate(value: string): value is ISODate {
  if (!ISO_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function toUTC(date: ISODate): number {
  if (!isISODate(date)) throw new Error(`Invalid ISO date: ${date}`);
  return Date.parse(`${date}T00:00:00Z`);
}

export function addDays(date: ISODate, days: number): ISODate {
  return new Date(toUTC(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (to - from). */
export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to) - toUTC(from)) / DAY_MS);
}

/** Nights of a stay: checkIn inclusive, checkOut exclusive. */
export function nightsBetween(checkIn: ISODate, checkOut: ISODate): ISODate[] {
  const n = diffDays(checkIn, checkOut);
  return Array.from({ length: Math.max(0, n) }, (_, i) => addDays(checkIn, i));
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(date: ISODate): number {
  return new Date(toUTC(date)).getUTCDay();
}

/** Today's calendar date in India. */
export function todayIST(now: Date = new Date()): ISODate {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function isWithin(date: ISODate, from: ISODate, to: ISODate): boolean {
  return date >= from && date <= to; // ISO strings compare lexicographically
}
