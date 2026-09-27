import Link from "next/link";
import { Download, Search } from "lucide-react";
import { requireAdmin } from "@/server/auth/session";
import { connectDB } from "@/server/db/connect";
import { Booking } from "@/server/models";
import { PageHeader, Badge } from "@/components/admin/shell";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Bookings" };

const STATUSES = ["pending_payment", "confirmed", "checked_in", "checked_out", "cancelled", "expired", "failed"];

export default async function BookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin("bookings.view");
  const sp = await searchParams;
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (sp.status) filter.status = sp.status;
  if (sp.vertical) filter.vertical = sp.vertical;
  if (sp.q) {
    const rx = new RegExp(sp.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ code: rx }, { "guest.name": rx }, { "guest.phone": rx }, { "guest.email": rx }];
  }
  if (sp.upcoming) filter.$and = [{ status: "confirmed" }, { $or: [{ "items.checkIn": { $gte: new Date().toISOString().slice(0, 10) } }, { "items.travelDate": { $gte: new Date().toISOString().slice(0, 10) } }] }];
  const page = Math.max(1, Number(sp.page ?? 1));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows, total] = await Promise.all([Booking.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 50).limit(50).lean<any[]>(), Booking.countDocuments(filter)]);
  const qs = (patch: Record<string, string | undefined>) => {
    const n = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    n.delete("page");
    return `?${n}`;
  };

  return (
    <>
      <PageHeader eyebrow="Operations" title="Bookings" actions={<a href={`/api/admin/bookings/export${qs({})}`} className="btn btn-outline !py-3"><Download className="h-4 w-4" /> Export CSV</a>} />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <form className="flex items-center gap-2 border hairline bg-paper px-3">
          <Search className="h-4 w-4 text-muted" />
          <input name="q" defaultValue={sp.q} placeholder="Code, name, phone…" className="w-56 bg-transparent py-2.5 text-sm outline-none" />
        </form>
        <Link href={qs({ upcoming: sp.upcoming ? undefined : "1" })} className={`border px-3 py-2 text-xs ${sp.upcoming ? "border-charcoal bg-charcoal text-ivory" : "hairline"}`}>Upcoming</Link>
        {["stay", "stay_food", "darshan"].map((v) => (
          <Link key={v} href={qs({ vertical: sp.vertical === v ? undefined : v })} className={`border px-3 py-2 text-xs ${sp.vertical === v ? "border-charcoal bg-charcoal text-ivory" : "hairline"}`}>{v.replace("_", " + ")}</Link>
        ))}
        <span className="mx-1 h-5 w-px bg-sand" />
        {STATUSES.map((s) => (
          <Link key={s} href={qs({ status: sp.status === s ? undefined : s })} className={`border px-3 py-2 text-xs ${sp.status === s ? "border-charcoal bg-charcoal text-ivory" : "hairline"}`}>{s.replace("_", " ")}</Link>
        ))}
      </div>
      <div className="overflow-x-auto border hairline bg-paper">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr><th className="px-4 py-3 font-normal">Code</th><th className="px-4 py-3 font-normal">Guest</th><th className="px-4 py-3 font-normal">Stay / tour</th><th className="px-4 py-3 font-normal">Dates</th><th className="px-4 py-3 font-normal">Guests</th><th className="px-4 py-3 text-right font-normal">Total</th><th className="px-4 py-3 font-normal">Status</th><th className="px-4 py-3 font-normal">Payment</th></tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const i = b.items?.[0] ?? {};
              return (
                <tr key={String(b._id)} className="border-t hairline hover:bg-ivory">
                  <td className="px-4 py-3 font-mono text-xs"><Link href={`/admin/bookings/${b._id}`} className="underline">{b.code}</Link></td>
                  <td className="px-4 py-3">{b.guest?.name}<div className="text-xs text-muted">{b.guest?.phone}</div></td>
                  <td className="px-4 py-3">{i.title}<div className="text-xs text-muted">{b.vertical.replace("_", " + ")}{i.mealPlanName ? ` · ${i.mealPlanName}` : ""}</div></td>
                  <td className="px-4 py-3 text-xs">{i.checkIn ? `${i.checkIn} → ${i.checkOut}` : i.travelDate}</td>
                  <td className="px-4 py-3 text-xs">{(i.adults ?? 0) + (i.children ?? 0)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatINR(b.pricing?.total ?? 0)}</td>
                  <td className="px-4 py-3"><Badge value={b.status} /></td>
                  <td className="px-4 py-3"><Badge value={b.paymentStatus} /></td>
                </tr>
              );
            })}
            {!rows.length ? <tr><td colSpan={8} className="px-4 py-12 text-center text-muted">No bookings match.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-muted">{total} booking{total === 1 ? "" : "s"}{total > 50 ? ` · page ${page}` : ""}</p>
      {total > page * 50 ? <Link className="text-sm underline" href={`${qs({})}&page=${page + 1}`}>Next page →</Link> : null}
    </>
  );
}
