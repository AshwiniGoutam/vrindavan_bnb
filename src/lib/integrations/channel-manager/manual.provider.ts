import { addDays, nightsBetween } from "@/lib/dates";
import { connectDB } from "@/server/db/connect";
import { Booking, ManualBlock } from "@/server/models";
import type { AvailabilityMap, ChannelManagerProvider, RateMap, ReservationInput } from "./types";

/**
 * Development / pre-eZee provider.
 * A night is unavailable if an admin "manual block" covers it or a confirmed website booking occupies it.
 * Before eZee is connected in production, mirror OTA (Airbnb etc.) bookings as manual blocks in Admin → Availability.
 */
export class ManualChannelManager implements ChannelManagerProvider {
  readonly name = "manual" as const;

  async getAvailability({ refs, from, to }: { refs: { propertyId: string }[]; from: string; to: string }): Promise<AvailabilityMap> {
    await connectDB();
    const ids = refs.map((r) => r.propertyId);
    const nights = nightsBetween(from, addDays(to, 1));
    const [blocks, bookings] = await Promise.all([
      ManualBlock.find({ propertyId: { $in: ids }, from: { $lte: to }, to: { $gte: from } }).lean(),
      Booking.find(
        { status: { $in: ["confirmed", "checked_in"] }, "items.propertyId": { $in: ids } },
        { items: 1 },
      ).lean(),
    ]);
    const map: AvailabilityMap = {};
    for (const id of ids) map[id] = Object.fromEntries(nights.map((n) => [n, { available: true, units: 1 }]));
    for (const b of blocks) {
      const pid = String(b.propertyId);
      for (const n of nights) if (n >= b.from! && n <= b.to! && map[pid]) map[pid][n] = { available: false, units: 0 };
    }
    for (const bk of bookings)
      for (const item of bk.items ?? []) {
        const pid = String(item.propertyId);
        if (!map[pid] || !item.checkIn || !item.checkOut) continue;
        for (const n of nightsBetween(item.checkIn, item.checkOut)) if (map[pid][n]) map[pid][n] = { available: false, units: 0 };
      }
    return map;
  }

  /** Manual mode has no channel rates; the website pricing engine is used. */
  async getRates(): Promise<RateMap> {
    return {};
  }
  async createReservation(r: ReservationInput) {
    return { externalReservationId: `manual:${r.bookingCode}` };
  }
  async cancelReservation() {}
  async healthCheck() {
    return { ok: true, message: "Manual availability — no channel manager connected. Keep OTA bookings mirrored as blocks." };
  }
}
