import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDayRates } from "@/lib/dayrates";
import { nightlyPrice } from "@/lib/pricing";
import { eachDay, isMonth, monthRange, parseUTC, utcISO, todayIST } from "@/lib/utils";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(req.url);
  const month = url.searchParams.get("month") ?? todayIST().slice(0, 7);
  if (!isMonth(month)) return NextResponse.json({ error: "Invalid month" }, { status: 400 });

  const stay = await db.stay.findFirst({ where: { slug, published: true } });
  if (!stay) return NextResponse.json({ error: "Stay not found" }, { status: 404 });

  const { first, last } = monthRange(month);
  const days = eachDay(first, last);
  const rates = await getDayRates(stay.id, first, last);
  const [bookings, blocks] = await Promise.all([
    db.booking.findMany({
      where: { stayId: stay.id, status: { not: "CANCELLED" }, checkIn: { lte: parseUTC(last) }, checkOut: { gt: parseUTC(first) } },
      select: { checkIn: true, checkOut: true },
    }),
    db.externalBlock.findMany({
      where: { stayId: stay.id, start: { lte: parseUTC(last) }, end: { gt: parseUTC(first) } },
      select: { start: true, end: true, source: true, summary: true },
    }),
  ]);

  const items = days.map((date) => {
    const blocked = bookings.some((b) => utcISO(b.checkIn) <= date && date < utcISO(b.checkOut)) ||
      blocks.some((b) => utcISO(b.start) <= date && date < utcISO(b.end));
    return {
      date,
      price: nightlyPrice(stay, date, rates),
      blocked,
      overridden: !!rates[date]?.price,
      minNights: rates[date]?.minNights ?? null,
    };
  });

  return NextResponse.json({ month, items });
}
