import { db } from "@/lib/db";
import { buildCalendar } from "@/lib/ical-format";
import { parseUTC, todayIST, utcISO } from "@/lib/utils";

// Give this URL to Airbnb / Booking.com / MakeMyTrip ("import calendar").
// It exports ONLY our own bookings (direct + manual) and manual blocks. Bookings that came from another
// channel are never re-exported, or channels would echo each other's reservations forever.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const stay = await db.stay.findUnique({ where: { icalToken: token.replace(/\.ics$/, "") } });
  if (!stay) return new Response("Not found", { status: 404 });

  const since = parseUTC(todayIST());
  const [bookings, manual] = await Promise.all([
    db.booking.findMany({ where: { stayId: stay.id, status: "CONFIRMED", source: { in: ["DIRECT", "MANUAL"] }, checkOut: { gt: since } } }),
    db.externalBlock.findMany({ where: { stayId: stay.id, feedId: null, end: { gt: since } } }),
  ]);
  const body = buildCalendar(stay.title, [
    ...bookings.map((b) => ({ uid: `${b.code}@vhi`, start: utcISO(b.checkIn), end: utcISO(b.checkOut), summary: "Reserved" })),
    ...manual.map((m) => ({ uid: `${m.id}@vhi`, start: utcISO(m.start), end: utcISO(m.end), summary: "Blocked" })),
  ]);
  return new Response(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
