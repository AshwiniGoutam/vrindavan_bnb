import "server-only";
import { addDays, nightsBetween, type ISODate } from "@/lib/dates";
import { channelManager, type ChannelRef } from "@/lib/integrations/channel-manager";
import { connectDB } from "@/server/db/connect";
import { AvailabilityCache, InventoryLock, ManualBlock } from "@/server/models";

interface PropertyLike {
  _id: unknown;
  status?: string;
  channel?: { externalPropertyId?: string; externalRoomTypeId?: string; externalRatePlanId?: string };
}

export const channelRef = (p: PropertyLike): ChannelRef => ({
  propertyId: String(p._id),
  externalPropertyId: p.channel?.externalPropertyId,
  externalRoomTypeId: p.channel?.externalRoomTypeId,
  externalRatePlanId: p.channel?.externalRatePlanId,
});

/**
 * Unavailable nights for one property between `from` and `to` (inclusive):
 * channel manager (source of truth) + our active checkout holds/booked locks + maintenance blocks.
 * `live` bypasses the short cache (used right before taking payment).
 */
export async function unavailableNights(property: PropertyLike, from: ISODate, to: ISODate, opts: { live?: boolean } = {}): Promise<ISODate[]> {
  await connectDB();
  const pid = String(property._id);
  const nights = nightsBetween(from, addDays(to, 1));
  if (property.status && property.status !== "active") return nights;

  let cmUnavailable: ISODate[] = [];
  const cached = opts.live
    ? []
    : await AvailabilityCache.find({ propertyId: pid, night: { $gte: from, $lte: to } }).lean<{ night: string; available: boolean }[]>();
  if (!opts.live && cached.length === nights.length) {
    cmUnavailable = cached.filter((c) => !c.available).map((c) => c.night);
  } else {
    const map = await channelManager().getAvailability({ refs: [channelRef(property)], from, to });
    const byNight = map[pid] ?? {};
    cmUnavailable = nights.filter((n) => !byNight[n]?.available);
    await AvailabilityCache.bulkWrite(
      nights.map((n) => ({
        updateOne: { filter: { propertyId: pid, night: n }, update: { $set: { available: !!byNight[n]?.available, fetchedAt: new Date() } }, upsert: true },
      })),
      { ordered: false },
    ).catch(() => undefined);
  }

  const [locks, maintenance] = await Promise.all([
    InventoryLock.find({
      propertyId: pid,
      night: { $gte: from, $lte: to },
      $or: [{ type: "booked" }, { expiresAt: { $gt: new Date() } }],
    }).lean<{ night: string }[]>(),
    ManualBlock.find({ propertyId: pid, reason: "maintenance", from: { $lte: to }, to: { $gte: from } }).lean<{ from: string; to: string }[]>(),
  ]);
  const blocked = new Set<string>([...cmUnavailable, ...locks.map((l) => l.night)]);
  for (const m of maintenance) for (const n of nights) if (n >= m.from && n <= m.to) blocked.add(n);
  return nights.filter((n) => blocked.has(n));
}

export async function isStayAvailable(property: PropertyLike, checkIn: ISODate, checkOut: ISODate, opts: { live?: boolean } = {}) {
  const lastNight = addDays(checkOut, -1);
  const blocked = await unavailableNights(property, checkIn, lastNight, opts);
  return { available: blocked.length === 0, blockedNights: blocked };
}
