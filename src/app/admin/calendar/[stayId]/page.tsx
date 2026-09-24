import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { db } from "@/lib/db";
import { getDayRates } from "@/lib/dayrates";
import { buildMonth, type CalBlock, type CalBooking } from "@/lib/calendar-pure";
import CalendarManager, { type Detail } from "@/components/admin/CalendarManager";
import StaySwitcher from "@/components/admin/StaySwitcher";
import { eachDay, isMonth, monthLabel, monthRange, parseUTC, shiftMonth, todayIST, utcISO, weekdayUTC } from "@/lib/utils";

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

type SP = { month?: string; notice?: string; error?: string };

export default async function StayCalendar({ params, searchParams }: { params: Promise<{ stayId: string }>; searchParams: Promise<SP> }) {
  const [{ stayId }, sp] = await Promise.all([params, searchParams]);
  const stay = await db.stay.findUnique({ where: { id: stayId } });
  if (!stay) notFound();
  const stays = await db.stay.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } });

  const month = isMonth(sp.month) ? sp.month : todayIST().slice(0, 7);
  const { first, last } = monthRange(month);
  const days = eachDay(first, last);
  const lo = parseUTC(first), hi = parseUTC(last);

  const [bookingRows, blockRows, dayRates] = await Promise.all([
    db.booking.findMany({ where: { stayId, status: { not: "CANCELLED" }, checkIn: { lte: hi }, checkOut: { gt: lo } } }),
    db.externalBlock.findMany({ where: { stayId, start: { lte: hi }, end: { gt: lo } } }),
    getDayRates(stayId, first, last),
  ]);

  const bookings: CalBooking[] = bookingRows.map((b) => ({
    id: b.id, code: b.code, guestName: b.guestName, source: b.source, status: b.status, paymentStatus: b.paymentStatus,
    checkIn: utcISO(b.checkIn), checkOut: utcISO(b.checkOut), total: b.total, guests: b.guests,
  }));
  const blocks: CalBlock[] = blockRows.map((b) => ({ id: b.id, start: utcISO(b.start), end: utcISO(b.end), source: b.source, feedId: b.feedId, summary: b.summary }));
  const cells = buildMonth(days, stay, bookings, blocks, dayRates);

  const details: Record<string, Detail> = {};
  for (const b of bookings) details[b.id] = { type: "booking", ...b, cancellable: b.status !== "CANCELLED" && b.status !== "COMPLETED" };
  for (const b of blocks) details[b.id] = { type: "block", id: b.id, source: b.source, start: b.start, end: b.end, summary: b.summary, removable: !b.feedId };

  const conflicts = cells.filter((c) => c.conflict).length;
  const nav = (m: string) => `/admin/calendar/${stayId}?month=${m}`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href={`/admin/calendar?month=${month}`} className="text-sm text-stone underline underline-offset-4">All properties</Link>
          <h1 className="mt-1 text-3xl">{stay.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StaySwitcher stays={stays} current={stayId} month={month} />
          <div className="flex items-center gap-1">
            <Link href={nav(shiftMonth(month, -1))} className="btn btn-ghost !p-2.5" aria-label="Previous month"><ChevronLeft size={18} /></Link>
            <span className="min-w-36 text-center font-semibold">{monthLabel(month)}</span>
            <Link href={nav(shiftMonth(month, 1))} className="btn btn-ghost !p-2.5" aria-label="Next month"><ChevronRight size={18} /></Link>
            <Link href={nav(todayIST().slice(0, 7))} className="btn btn-ghost !px-4 !py-2 text-sm">Today</Link>
          </div>
        </div>
      </div>

      {sp.notice && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><CheckCircle2 size={17} /> {sp.notice}</p>}
      {sp.error && <p role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle size={17} /> {sp.error}</p>}
      {conflicts > 0 && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"><b>{conflicts} night{conflicts > 1 ? "s" : ""} are double booked this month</b> (outlined in red). Contact one of the guests or the channel to resolve it.</p>}

      <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <CalendarManager key={`${stayId}-${month}`} stayId={stayId} month={month} today={todayIST()} leading={weekdayUTC(first)} cells={cells} details={details} />
      </div>
    </div>
  );
}
