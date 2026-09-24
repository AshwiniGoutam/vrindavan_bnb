import Link from "next/link";
import { db } from "@/lib/db";
import { updateBookingStatus } from "../actions";
import { cancelBookingAdmin } from "../more-actions";
import StatusSelect from "@/components/admin/StatusSelect";
import { formatDate, inr, utcISO } from "@/lib/utils";
import { waLink } from "@/lib/config";
import { normalizePhone } from "@/lib/notify";
import ConfirmButton from "@/components/admin/ConfirmButton";
import type { BookingStatus } from "@/lib/db";

export const metadata = { title: "Bookings" };
export const dynamic = "force-dynamic";

const statuses = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"] as const;

export default async function AdminBookings({ searchParams }: { searchParams: Promise<{ status?: string; notice?: string; error?: string }> }) {
  const { status, notice, error } = await searchParams;
  const filter = statuses.includes(status as BookingStatus) ? (status as BookingStatus) : undefined;
  const bookings = await db.booking.findMany({ where: filter ? { status: filter } : {}, orderBy: { createdAt: "desc" }, take: 200, include: { stay: { select: { title: true } } } });

  return (
    <div>
      <h1 className="text-3xl">Bookings</h1>
      {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        {[undefined, ...statuses].map((s) => (
          <Link key={s ?? "all"} href={s ? `/admin/bookings?status=${s}` : "/admin/bookings"}
            className={`rounded-full border px-4 py-1.5 ${filter === s ? "border-pine bg-pine text-white" : "border-line bg-white hover:border-pine"}`}>
            {s ? s.charAt(0) + s.slice(1).toLowerCase() : "All"}
          </Link>
        ))}
      </div>
      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-line text-stone"><tr><th className="p-4 font-medium">Code</th><th className="font-medium">Guest</th><th className="font-medium">Stay</th><th className="font-medium">Dates</th><th className="font-medium">Payment</th><th className="font-medium">Total</th><th className="font-medium">Source</th><th className="font-medium">Status</th><th className="font-medium">Cancel</th></tr></thead>
          <tbody className="divide-y divide-line">
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className="p-4 font-mono text-xs">{b.code}</td>
                <td><p className="font-semibold">{b.guestName}</p><a className="text-xs text-lake underline" target="_blank" rel="noreferrer" href={waLink(`Hi ${b.guestName}, regarding your booking ${b.code}.`, normalizePhone(b.guestPhone))}>{b.guestPhone}</a></td>
                <td>{b.stay.title}<p className="text-xs text-stone">{b.guests} guests</p></td>
                <td>{formatDate(utcISO(b.checkIn))}<br /><span className="text-stone">to {formatDate(utcISO(b.checkOut))}</span></td>
                <td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${b.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-900" : b.paymentStatus === "FAILED" ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-900"}`}>{b.paymentStatus.toLowerCase()}</span></td>
                <td>{inr(b.total)}</td>
                <td className="text-xs">{b.sourceName ?? ({ DIRECT: "Website", MANUAL: "Manual" } as Record<string, string>)[b.source] ?? b.source}</td>
                <td><form action={updateBookingStatus}><input type="hidden" name="id" value={b.id} /><StatusSelect value={b.status} options={[...statuses]} /></form></td>
                <td>
                  {b.status !== "CANCELLED" && b.status !== "COMPLETED" ? (
                    <form action={cancelBookingAdmin} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={b.id} />
                      {b.source === "DIRECT" && b.paymentStatus === "PAID" ? (
                        <select name="refundMode" aria-label="Refund" className="rounded-lg border border-line bg-white px-1.5 py-1 text-xs"><option value="policy">Per policy</option><option value="full">Full refund</option><option value="none">No refund</option></select>
                      ) : null}
                      <ConfirmButton message={`Cancel booking ${b.code}?`} className="rounded-lg border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-600 hover:text-white">Cancel</ConfirmButton>
                    </form>
                  ) : <span className="text-xs text-stone">{b.refundAmount ? `Refunded ${inr(b.refundAmount)}` : "-"}</span>}
                </td>
              </tr>
            ))}
            {bookings.length === 0 && <tr><td colSpan={9} className="p-10 text-center text-stone">No bookings here yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-stone">Cancelling frees the dates and updates connected channels. Refunds on paid website bookings are sent through Razorpay automatically. Bookings from other channels must also be cancelled on that platform.</p>
    </div>
  );
}
