import { randomBytes } from "node:crypto";
import { db } from "./db";
import { getDayAvailability, isAvailable } from "./availability";
import { getDayRates } from "./dayrates";
import { nightlyPrice } from "./pricing";
import { groupRuns, normalizeRevision, rateString, type NormalizedRevision } from "./channex-format";
import { addDaysISO, eachDay, parseUTC, todayIST } from "./utils";
import { mail } from "./email";

/**
 * Channex channel-manager integration (https://docs.channex.io).
 * Push: availability + rates/min-stay for a date range whenever something changes.
 * Pull: booking revision feed (new / modified / cancelled), each one acknowledged after we store it.
 * One villa = one Channex property with one room type and one rate plan (mapped on Admin > Channels).
 */
export const channexEnabled = () => !!process.env.CHANNEX_API_KEY;
const base = () => process.env.CHANNEX_BASE_URL ?? "https://secure.channex.io/api/v1";
const HORIZON_DAYS = 364;

async function cx<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: { "user-api-key": process.env.CHANNEX_API_KEY ?? "", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Channex ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

async function log(kind: string, ok: boolean, message: string, stayId?: string) {
  try { await db.channelLog.create({ data: { kind, ok, message: message.slice(0, 500), stayId } }); } catch { /* logging must never break a booking */ }
}

async function mappedStay(stayId: string) {
  if (!channexEnabled()) return null;
  const s = await db.stay.findUnique({ where: { id: stayId } });
  return s?.channexPropertyId && s.channexRoomTypeId ? s : null;
}

const clamp = (from: string, to: string) => {
  const today = todayIST();
  const f = from < today ? today : from;
  const t = to > addDaysISO(today, HORIZON_DAYS) ? addDaysISO(today, HORIZON_DAYS) : to;
  return f <= t ? { from: f, to: t } : null;
};

export async function pushAvailability(stayId: string, from: string, to: string) {
  const s = await mappedStay(stayId);
  const r = clamp(from, to);
  if (!s || !r) return { skipped: true };
  try {
    const runs = groupRuns(await getDayAvailability(stayId, r.from, r.to));
    await cx("POST", "/availability", {
      values: runs.map((x) => ({ property_id: s.channexPropertyId, room_type_id: s.channexRoomTypeId, date_from: x.from, date_to: x.to, availability: x.value })),
    });
    await log("push_availability", true, `${s.title}: ${r.from} to ${r.to} (${runs.length} ranges)`, stayId);
    return { ok: true };
  } catch (e) {
    await log("push_availability", false, `${s.title}: ${(e as Error).message}`, stayId);
    return { ok: false };
  }
}

export async function pushRates(stayId: string, from: string, to: string) {
  const s = await mappedStay(stayId);
  const r = clamp(from, to);
  if (!s || !s.channexRatePlanId || !r) return { skipped: true };
  try {
    const dayRates = await getDayRates(stayId, r.from, r.to);
    const entries = eachDay(r.from, r.to).map((date) => ({
      date,
      value: { rate: nightlyPrice(s, date, dayRates), min: Math.max(s.minNights, dayRates[date]?.minNights ?? 0) },
    }));
    const runs = groupRuns(entries, (a, b) => a.rate === b.rate && a.min === b.min);
    const res = await cx<{ meta?: { warnings?: unknown[] } }>("POST", "/restrictions", {
      values: runs.map((x) => ({
        property_id: s.channexPropertyId, rate_plan_id: s.channexRatePlanId, date_from: x.from, date_to: x.to,
        rate: rateString(x.value.rate), min_stay_through: x.value.min,
      })),
    });
    const warnings = res.meta?.warnings?.length ?? 0;
    await log("push_rates", warnings === 0, warnings ? `${s.title}: Channex returned ${warnings} warning(s), check property min-stay type and rate plan mapping` : `${s.title}: ${r.from} to ${r.to} (${runs.length} ranges)`, stayId);
    return { ok: warnings === 0 };
  } catch (e) {
    await log("push_rates", false, `${s.title}: ${(e as Error).message}`, stayId);
    return { ok: false };
  }
}

/** Once a day (Channex asks for at most one full sync per 24h) or on demand from the admin. */
export async function fullSync(stayId: string) {
  const from = todayIST(), to = addDaysISO(from, HORIZON_DAYS);
  await pushAvailability(stayId, from, to);
  await pushRates(stayId, from, to);
}

export async function fullSyncAll() {
  if (!channexEnabled()) return 0;
  const stays = await db.stay.findMany({ where: { channexPropertyId: { not: null }, channexRoomTypeId: { not: null } }, select: { id: true } });
  for (const s of stays) {
    await fullSync(s.id);
    await new Promise((r) => setTimeout(r, 1500)); // be gentle between properties
  }
  return stays.length;
}

const newCode = () => `OTA-${randomBytes(3).toString("hex").toUpperCase()}`;

async function applyRevision(n: NormalizedRevision): Promise<boolean> {
  const stay = await db.stay.findFirst({ where: { channexPropertyId: n.propertyId } });
  if (!stay) {
    await log("pull_bookings", false, `Booking ${n.uniqueId} is for Channex property ${n.propertyId}, which isn't mapped to any stay. Map it on Admin > Channels.`);
    return false; // don't ack, so it isn't lost
  }
  const existing = await db.booking.findUnique({ where: { externalRef: n.uniqueId } });

  if (n.status === "cancelled") {
    if (existing && existing.status !== "CANCELLED") {
      await db.booking.update({ where: { id: existing.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: `Cancelled on ${n.otaName}` } });
      await pushAvailability(stay.id, existing.checkIn.toISOString().slice(0, 10), addDaysISO(existing.checkOut.toISOString().slice(0, 10), -1));
    }
    await log("pull_bookings", true, `${n.otaName} ${n.uniqueId} cancelled (${stay.title})`, stay.id);
    return true;
  }

  const nights = Math.max(1, Math.round((parseUTC(n.checkOut).getTime() - parseUTC(n.checkIn).getTime()) / 864e5));
  const data = {
    stayId: stay.id, source: n.source, sourceName: n.otaName, externalRef: n.uniqueId,
    checkIn: parseUTC(n.checkIn), checkOut: parseUTC(n.checkOut), guests: n.guests, nights,
    subtotal: n.total, taxes: 0, total: n.total, status: "CONFIRMED" as const,
    paymentStatus: n.prepaidByOta ? ("PAID" as const) : ("UNPAID" as const),
    guestName: n.guestName, guestEmail: n.guestEmail, guestPhone: n.guestPhone, notes: n.notes,
  };

  if (!existing) {
    const conflict = !(await isAvailable(stay.id, n.checkIn, n.checkOut));
    await db.booking.create({ data: { ...data, code: newCode() } });
    if (conflict) {
      const msg = `DOUBLE BOOKING: ${n.otaName} booking ${n.uniqueId} for ${stay.title} (${n.checkIn} to ${n.checkOut}) overlaps an existing booking or block. Check the calendar.`;
      await log("pull_bookings", false, msg, stay.id);
      void mail.adminAlert("Double booking detected", msg);
    } else {
      await log("pull_bookings", true, `${n.otaName} ${n.uniqueId} stored (${stay.title}, ${n.checkIn} to ${n.checkOut})`, stay.id);
    }
    await pushAvailability(stay.id, n.checkIn, addDaysISO(n.checkOut, -1));
  } else {
    const oldIn = existing.checkIn.toISOString().slice(0, 10), oldOut = existing.checkOut.toISOString().slice(0, 10);
    await db.booking.update({ where: { id: existing.id }, data });
    await log("pull_bookings", true, `${n.otaName} ${n.uniqueId} modified (${stay.title})`, stay.id);
    await pushAvailability(stay.id, oldIn < n.checkIn ? oldIn : n.checkIn, addDaysISO(oldOut > n.checkOut ? oldOut : n.checkOut, -1));
  }
  return true;
}

/** Pulls unacknowledged booking revisions, stores them, then acknowledges each one. */
export async function pullBookings() {
  if (!channexEnabled()) return { processed: 0, failed: 0 };
  let processed = 0, failed = 0;
  try {
    for (let page = 0; page < 10; page++) {
      const feed = await cx<{ data?: { id: string; attributes: Record<string, unknown> }[] }>(
        "GET", "/booking_revisions/feed?order[inserted_at]=asc&pagination[limit]=50");
      const items = feed.data ?? [];
      if (items.length === 0) break;
      let acked = 0;
      for (const item of items) {
        try {
          const n = normalizeRevision(item.id, item.attributes);
          const ok = n ? await applyRevision(n) : (await log("pull_bookings", false, `Skipped unreadable revision ${item.id}`), true);
          if (ok) { await cx("POST", `/booking_revisions/${item.id}/ack`); acked++; processed++; } else failed++;
        } catch (e) {
          failed++;
          await log("pull_bookings", false, `Revision ${item.id}: ${(e as Error).message}`);
        }
      }
      if (acked === 0) break; // nothing progressed, avoid looping on the same items
    }
  } catch (e) {
    await log("pull_bookings", false, (e as Error).message);
    failed++;
  }
  return { processed, failed };
}
