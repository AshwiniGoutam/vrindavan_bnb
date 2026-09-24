import { nightlyPrice, type DayRates, type PricedStay } from "./pricing";

export type CalBooking = {
  id: string; code: string; guestName: string; source: string; status: string; paymentStatus: string;
  checkIn: string; checkOut: string; total: number; guests: number;
};
export type CalBlock = { id: string; start: string; end: string; source: string; feedId: string | null; summary: string | null };

export type DayCell = {
  date: string;
  kind: "free" | "booking" | "channel" | "blocked";
  refId?: string;
  label?: string;
  source?: string;
  price: number;
  overridden: boolean;
  minNights: number | null;
  conflict: boolean;
  isFirst: boolean; // first visible night of the booking/block (used to print the label once)
};

/** One cell per night. A booking covers nights [checkIn, checkOut). */
export function buildMonth(
  days: string[], stay: PricedStay, bookings: CalBooking[], blocks: CalBlock[], dayRates: DayRates,
): DayCell[] {
  const live = bookings.filter((b) => b.status !== "CANCELLED");
  return days.map((date, idx) => {
    const b = live.filter((x) => x.checkIn <= date && date < x.checkOut);
    const bl = blocks.filter((x) => x.start <= date && date < x.end);
    const dr = dayRates[date];
    const base = {
      date,
      price: nightlyPrice(stay, date, dayRates),
      overridden: !!dr?.price,
      minNights: dr?.minNights ?? null,
      conflict: b.length + bl.length > 1,
    };
    if (b.length) {
      const x = b[0];
      return { ...base, kind: "booking" as const, refId: x.id, label: x.guestName, source: x.source, isFirst: x.checkIn === date || idx === 0 };
    }
    const ch = bl.find((x) => x.feedId);
    if (ch) return { ...base, kind: "channel" as const, refId: ch.id, label: ch.source, source: ch.source, isFirst: ch.start === date || idx === 0 };
    if (bl.length) {
      const x = bl[0];
      return { ...base, kind: "blocked" as const, refId: x.id, label: x.summary ?? "Blocked", source: "Manual", isFirst: x.start === date || idx === 0 };
    }
    return { ...base, kind: "free" as const, isFirst: false };
  });
}
