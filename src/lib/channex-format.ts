import { addDaysISO } from "./utils";

export type Source = "AIRBNB" | "BOOKING_COM" | "MAKEMYTRIP" | "OTHER";

export function mapOta(name: string | null | undefined): Source {
  const n = (name ?? "").toLowerCase();
  if (n.includes("airbnb")) return "AIRBNB";
  if (n.includes("booking")) return "BOOKING_COM";
  if (n.includes("makemytrip") || n.includes("goibibo") || n.includes("mmt")) return "MAKEMYTRIP";
  return "OTHER";
}

/** Channex accepts decimal strings for rates ("8500.00"). */
export const rateString = (n: number) => `${Math.round(n)}.00`;

/** Merge consecutive dates that share the same value into ranges (inclusive). */
export function groupRuns<T>(entries: { date: string; value: T }[], eq: (a: T, b: T) => boolean = (a, b) => a === b) {
  const runs: { from: string; to: string; value: T }[] = [];
  for (const e of entries) {
    const last = runs[runs.length - 1];
    if (last && eq(last.value, e.value) && addDaysISO(last.to, 1) === e.date) last.to = e.date;
    else runs.push({ from: e.date, to: e.date, value: e.value });
  }
  return runs;
}

type Attrs = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type NormalizedRevision = {
  revisionId: string;
  status: "new" | "modified" | "cancelled";
  propertyId: string;
  uniqueId: string;
  otaName: string;
  source: Source;
  checkIn: string;
  checkOut: string;
  guests: number;
  total: number;
  currency: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  prepaidByOta: boolean;
  notes: string | null;
};

/** Turns a Channex booking_revision `attributes` object into what we store. Returns null if unusable. */
export function normalizeRevision(revisionId: string, a: Attrs): NormalizedRevision | null {
  const status = a?.status;
  if (status !== "new" && status !== "modified" && status !== "cancelled") return null;
  const room = Array.isArray(a.rooms) ? a.rooms[0] : undefined;
  const checkIn = a.arrival_date ?? room?.checkin_date;
  const checkOut = a.departure_date ?? room?.checkout_date;
  if (!a.property_id || !a.unique_id || !checkIn || !checkOut) return null;
  const occ = a.occupancy ?? room?.occupancy ?? {};
  const cust = a.customer ?? {};
  const name = [cust.name, cust.surname].filter(Boolean).join(" ").trim();
  return {
    revisionId,
    status,
    propertyId: a.property_id,
    uniqueId: a.unique_id,
    otaName: a.ota_name ?? "OTA",
    source: mapOta(a.ota_name),
    checkIn,
    checkOut,
    guests: Math.max(1, (occ.adults ?? 0) + (occ.children ?? 0)),
    total: Math.round(Number(a.amount) || 0),
    currency: a.currency ?? "INR",
    guestName: name || "Guest (via channel)",
    guestEmail: cust.mail ?? "",
    guestPhone: cust.phone ?? "",
    prepaidByOta: a.payment_collect === "ota",
    notes: a.notes ?? null,
  };
}
