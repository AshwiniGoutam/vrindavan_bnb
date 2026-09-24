import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { buildMonth, type CalBlock, type CalBooking, type DayCell } from "@/lib/calendar-pure";
import { sourceColor } from "@/lib/source-style";
import { eachDay, isMonth, monthLabel, monthRange, parseUTC, shiftMonth, todayIST, utcISO, weekdayUTC } from "@/lib/utils";
import type { DayRates } from "@/lib/pricing";

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

export default async function CalendarOverview({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams;
  const month = isMonth(sp.month) ? sp.month : todayIST().slice(0, 7);
  const { first, last } = monthRange(month);
  const days = eachDay(first, last);
  const lo = parseUTC(first), hi = parseUTC(last);
  const today = todayIST();

  const [stays, bookings, blocks, rates] = await Promise.all([
    db.stay.findMany({ orderBy: { title: "asc" } }),
    db.booking.findMany({ where: { status: { not: "CANCELLED" }, checkIn: { lte: hi }, checkOut: { gt: lo } } }),
    db.externalBlock.findMany({ where: { start: { lte: hi }, end: { gt: lo } } }),
    db.dayRate.findMany({ where: { date: { gte: lo, lte: hi } } }),
  ]);

  let conflicts = 0;
  const rows = stays.map((s) => {
    const rs: DayRates = {};
    for (const r of rates.filter((r) => r.stayId === s.id)) rs[utcISO(r.date)] = { price: r.price, minNights: r.minNights };
    const cb: CalBooking[] = bookings.filter((b) => b.stayId === s.id).map((b) => ({
      id: b.id, code: b.code, guestName: b.guestName, source: b.source, status: b.status, paymentStatus: b.paymentStatus,
      checkIn: utcISO(b.checkIn), checkOut: utcISO(b.checkOut), total: b.total, guests: b.guests,
    }));
    const bl: CalBlock[] = blocks.filter((b) => b.stayId === s.id).map((b) => ({ id: b.id, start: utcISO(b.start), end: utcISO(b.end), source: b.source, feedId: b.feedId, summary: b.summary }));
    const cells = buildMonth(days, s, cb, bl, rs);
    conflicts += cells.filter((c) => c.conflict).length;
    // Merge consecutive nights that belong to the same booking or block into one bar.
    const segs: { cell: DayCell; span: number }[] = [];
    for (const c of cells) {
      const prev = segs[segs.length - 1];
      if (prev && c.kind !== "free" && prev.cell.kind === c.kind && prev.cell.refId === c.refId) prev.span++;
      else segs.push({ cell: c, span: 1 });
    }
    return { stay: s, segs };
  });

  const nav = (m: string) => `/admin/calendar?month=${m}`;
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl">Calendar</h1><p className="mt-1 text-stone">All properties at a glance. Open one to add bookings, block dates and set prices.</p></div>
        <div className="flex items-center gap-1">
          <Link href={nav(shiftMonth(month, -1))} className="btn btn-ghost !p-2.5" aria-label="Previous month"><ChevronLeft size={18} /></Link>
          <span className="min-w-36 text-center font-semibold">{monthLabel(month)}</span>
          <Link href={nav(shiftMonth(month, 1))} className="btn btn-ghost !p-2.5" aria-label="Next month"><ChevronRight size={18} /></Link>
          <Link href={nav(today.slice(0, 7))} className="btn btn-ghost !px-4 !py-2 text-sm">Today</Link>
        </div>
      </div>
      {conflicts > 0 && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"><b>{conflicts} double-booked night{conflicts > 1 ? "s" : ""}</b> this month. Open the affected property to see them outlined in red.</p>}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[1100px] table-fixed border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-44 bg-white p-3 text-left text-sm font-semibold">Property</th>
              {days.map((d) => (
                <th key={d} className={`p-1 text-center font-medium ${d === today ? "bg-marigold/30" : ""} ${[0, 6].includes(weekdayUTC(d)) ? "text-stone" : ""}`}>
                  <div>{Number(d.slice(8))}</div><div className="text-[10px] text-stone">{"SMTWTFS"[weekdayUTC(d)]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ stay, segs }) => (
              <tr key={stay.id} className="border-t border-line">
                <th className="sticky left-0 z-10 bg-white p-3 text-left text-sm font-semibold"><Link href={`/admin/calendar/${stay.id}?month=${month}`} className="hover:underline">{stay.title}</Link><div className="text-[11px] font-normal text-stone">{stay.city}</div></th>
                {segs.map(({ cell, span }) => (
                  <td key={cell.date} colSpan={span} className={`h-14 p-0.5 ${cell.date === today && cell.kind === "free" ? "bg-marigold/15" : ""}`}>
                    <Link href={`/admin/calendar/${stay.id}?month=${month}`} aria-label={cell.kind === "free" ? `${stay.title} ${cell.date}, available` : `${stay.title}: ${cell.label}`}
                      className={`flex h-full items-center overflow-hidden rounded-md px-1.5 ${cell.kind === "free" ? "hover:bg-mist" : cell.kind === "blocked" ? "bg-slate-300 text-slate-800" : sourceColor(cell.source)} ${cell.conflict ? "outline outline-2 outline-red-600" : ""}`}>
                      {cell.kind !== "free" && <span className="truncate">{cell.label}</span>}
                    </Link>
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={days.length + 1} className="p-10 text-center text-stone">Add a stay to see its calendar.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
