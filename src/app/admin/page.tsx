import Link from "next/link";
import { db } from "@/lib/db";
import { addDaysISO, formatDate, inr, parseUTC, todayIST, utcISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const today = todayIST();
  const since = parseUTC(addDaysISO(today, -29));
  const horizon = parseUTC(addDaysISO(today, 30));

  const [paid, upcoming, newEnq, publishedStays, occupancyRows, recent, enquiries, pending, syncFailures] = await Promise.all([
    db.booking.findMany({ where: { paymentStatus: "PAID", createdAt: { gte: since } }, select: { total: true, createdAt: true } }),
    db.booking.findMany({
      where: { status: "CONFIRMED", checkIn: { gte: parseUTC(today), lte: parseUTC(addDaysISO(today, 7)) } },
      include: { stay: { select: { title: true } } }, orderBy: { checkIn: "asc" },
    }),
    db.enquiry.count({ where: { status: "NEW" } }),
    db.stay.count({ where: { published: true } }),
    db.booking.findMany({ where: { status: "CONFIRMED", checkOut: { gt: parseUTC(today) }, checkIn: { lt: horizon } }, select: { checkIn: true, checkOut: true } }),
    db.booking.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { stay: { select: { title: true } } } }),
    db.enquiry.findMany({ where: { status: "NEW" }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.booking.count({ where: { status: "PENDING", paymentStatus: "UNPAID", createdAt: { gt: new Date(Date.now() - 864e5) } } }),
    db.channelLog.count({ where: { ok: false, createdAt: { gt: new Date(Date.now() - 7 * 864e5) } } }),
  ]);

  const revenue = paid.reduce((s, b) => s + b.total, 0);
  const days = Array.from({ length: 30 }, (_, i) => addDaysISO(today, i - 29));
  const perDay = new Map(days.map((d) => [d, 0]));
  for (const b of paid) { const k = utcISO(new Date(b.createdAt.getTime() + 5.5 * 3600e3)); if (perDay.has(k)) perDay.set(k, perDay.get(k)! + b.total); }
  const series = days.map((d) => ({ d, v: perDay.get(d)! }));
  const max = Math.max(1, ...series.map((s) => s.v));

  const start = parseUTC(today).getTime(), end = horizon.getTime();
  const bookedNights = occupancyRows.reduce((s, b) => s + Math.max(0, (Math.min(b.checkOut.getTime(), end) - Math.max(b.checkIn.getTime(), start)) / 864e5), 0);
  const occupancy = publishedStays ? Math.round((bookedNights / (publishedStays * 30)) * 100) : 0;

  const kpis = [
    { label: "Revenue, last 30 days", value: inr(revenue) },
    { label: "Paid bookings", value: String(paid.length) },
    { label: "Occupancy, next 30 days", value: `${occupancy}%` },
    { label: "New enquiries", value: String(newEnq), href: "/admin/enquiries" },
  ];

  return (
    <div className="grid gap-8">
      <h1 className="text-3xl">Dashboard</h1>
      {syncFailures > 0 && (
        <Link href="/admin/channels" className="rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-900 hover:bg-red-100">
          <b>{syncFailures} channel sync problem{syncFailures > 1 ? "s" : ""}</b> in the last 7 days, including possible double bookings. Review them in Channels.
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const inner = (<><p className="text-sm text-stone">{k.label}</p><p className="mt-2 font-display text-3xl">{k.value}</p></>);
          return k.href ? <Link key={k.label} href={k.href} className="rounded-2xl bg-white p-5 shadow-sm hover:shadow-md">{inner}</Link> : <div key={k.label} className="rounded-2xl bg-white p-5 shadow-sm">{inner}</div>;
        })}
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between"><h2 className="font-sans text-lg font-semibold">Revenue by day</h2>{pending > 0 && <span className="text-sm text-stone">{pending} payment{pending > 1 ? "s" : ""} in progress</span>}</div>
        <svg viewBox="0 0 600 160" className="mt-4 w-full" role="img" aria-label="Revenue per day for the last 30 days">
          {series.map((s, i) => {
            const h = (s.v / max) * 130;
            return <rect key={s.d} x={i * 20 + 3} y={140 - h} width={14} height={Math.max(h, 2)} rx={3} fill={s.v ? "#12352f" : "#dde3db"}><title>{`${formatDate(s.d)}: ${inr(s.v)}`}</title></rect>;
          })}
          <text x="3" y="157" fontSize="10" fill="#5f6a65">{formatDate(days[0])}</text>
          <text x="597" y="157" fontSize="10" fill="#5f6a65" textAnchor="end">Today</text>
        </svg>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-sans text-lg font-semibold">Arriving in the next 7 days</h2>
          {upcoming.length === 0 ? <p className="mt-3 text-stone">No arrivals this week.</p> : (
            <ul className="mt-3 divide-y divide-line">
              {upcoming.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-3 text-sm">
                  <div><p className="font-semibold">{b.guestName} · {b.guests} guests</p><p className="text-stone">{b.stay.title}</p></div>
                  <p>{formatDate(utcISO(b.checkIn))}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="font-sans text-lg font-semibold">New enquiries</h2><Link href="/admin/enquiries" className="text-sm underline underline-offset-4">View all</Link></div>
          {enquiries.length === 0 ? <p className="mt-3 text-stone">Nothing waiting. Nice.</p> : (
            <ul className="mt-3 divide-y divide-line">
              {enquiries.map((e) => (<li key={e.id} className="py-3 text-sm"><p className="font-semibold">{e.name} · {e.phone}</p><p className="line-clamp-1 text-stone">{e.message}</p></li>))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between"><h2 className="font-sans text-lg font-semibold">Latest bookings</h2><Link href="/admin/bookings" className="text-sm underline underline-offset-4">View all</Link></div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-stone"><tr><th className="py-2 font-medium">Code</th><th className="font-medium">Guest</th><th className="font-medium">Stay</th><th className="font-medium">Dates</th><th className="text-right font-medium">Total</th></tr></thead>
            <tbody className="divide-y divide-line">
              {recent.map((b) => (
                <tr key={b.id}><td className="py-3 font-mono text-xs">{b.code}</td><td>{b.guestName}</td><td>{b.stay.title}</td><td>{formatDate(utcISO(b.checkIn))}</td><td className="text-right">{inr(b.total)}</td></tr>
              ))}
              {recent.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-stone">No bookings yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
