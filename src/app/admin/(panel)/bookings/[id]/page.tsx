import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { isValidObjectId } from "mongoose";
import { requireAdmin } from "@/server/auth/session";
import { can } from "@/server/auth/permissions";
import { connectDB } from "@/server/db/connect";
import { Booking, Notification, Payment } from "@/server/models";
import { PageHeader, Badge } from "@/components/admin/shell";
import { BookingAdminActions } from "@/components/admin/booking-admin-actions";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Booking" };
const dt = (d?: string | Date) => (d ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—");

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin("bookings.view");
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = await Booking.findById(id).lean<any>();
  if (!b) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [payments, notes] = await Promise.all([Payment.find({ bookingId: b._id }).sort({ createdAt: 1 }).lean<any[]>(), Notification.find({ bookingId: b._id }).sort({ createdAt: 1 }).lean<any[]>()]);

  return (
    <>
      <Link href="/admin/bookings" className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" /> Bookings</Link>
      <PageHeader
        eyebrow={`${b.vertical.replace("_", " + ")} · created ${dt(b.createdAt)}`}
        title={b.code}
        actions={
          <>
            <Badge value={b.status} /> <Badge value={b.paymentStatus} />
            {b.invoiceNumber ? <Link href={`/admin/bookings/${id}/invoice`} target="_blank" className="btn btn-outline !py-2.5"><Printer className="h-4 w-4" /> Invoice</Link> : null}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className="border hairline bg-paper p-6">
            <p className="field-label mb-4">Guest</p>
            <p className="text-lg text-ink">{b.guest.name}</p>
            <p className="text-sm"><a href={`tel:${b.guest.phone}`} className="underline">{b.guest.phone}</a>{b.guest.email ? <> · <a href={`mailto:${b.guest.email}`} className="underline">{b.guest.email}</a></> : null}</p>
            <p className="text-sm text-muted">{[b.guest.city, b.guest.gstin && `GSTIN ${b.guest.gstin}`, b.isRepeatGuest && "Repeat guest"].filter(Boolean).join(" · ")}</p>
            {b.specialRequests ? <p className="mt-4 whitespace-pre-line bg-linen p-4 text-sm">{b.specialRequests}</p> : null}
          </section>

          <section className="border hairline bg-paper p-6">
            <p className="field-label mb-4">Items</p>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {b.items.map((i: any, k: number) => (
              <div key={k} className="border-b hairline pb-4 last:border-0">
                <p className="font-medium text-ink">{i.title}</p>
                <p className="text-sm text-muted">
                  {i.checkIn ? `${i.checkIn} → ${i.checkOut} · ${i.nights} nights` : `Travel ${i.travelDate}`} · {i.adults} adults{i.children ? `, ${i.children} children (${(i.childAges ?? []).join(", ")})` : ""}
                  {i.mealPlanName ? ` · ${i.mealPlanName}` : ""}
                </p>
                {i.kind === "property" ? <p className="mt-1 text-xs">Channel sync: <Badge value={i.channel?.syncStatus} /> {i.channel?.externalReservationId ?? ""} {i.channel?.lastError ? <span className="text-danger">{i.channel.lastError}</span> : null}</p> : null}
              </div>
            ))}
          </section>

          <section className="border hairline bg-paper p-6">
            <p className="field-label mb-4">Price breakdown (snapshot at booking)</p>
            <table className="w-full text-sm">
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {b.pricing.lines.map((l: any, k: number) => (
                  <tr key={k} className="border-b hairline"><td className="py-2">{l.label}</td><td className="py-2 text-xs text-muted">GST {l.gstRate}%</td><td className="py-2 text-right tabular-nums">{formatINR(l.amount)}</td></tr>
                ))}
                {b.pricing.discountTotal ? <tr><td className="py-2">Discount {b.pricing.discount?.code ? `(${b.pricing.discount.code})` : b.pricing.discount?.name ?? ""}</td><td /><td className="py-2 text-right tabular-nums text-success">−{formatINR(b.pricing.discountTotal)}</td></tr> : null}
                <tr><td className="py-2">GST</td><td /><td className="py-2 text-right tabular-nums">{formatINR(b.pricing.gstTotal)}</td></tr>
                <tr className="font-medium"><td className="py-2">Total</td><td /><td className="py-2 text-right tabular-nums">{formatINR(b.pricing.total)}</td></tr>
                <tr className="text-muted"><td className="py-1">Paid / refunded</td><td /><td className="py-1 text-right tabular-nums">{formatINR(b.amountPaid ?? 0)} / {formatINR(b.amountRefunded ?? 0)}</td></tr>
              </tbody>
            </table>
          </section>

          <section className="border hairline bg-paper p-6">
            <p className="field-label mb-4">Payments & refunds</p>
            <table className="w-full text-sm">
              <tbody>
                {payments.map((p) => (
                  <tr key={String(p._id)} className="border-b hairline"><td className="py-2">{p.kind}</td><td className="py-2 font-mono text-xs">{p.refundId ?? p.paymentId ?? p.orderId}</td><td className="py-2">{p.method ?? p.provider}</td><td className="py-2"><Badge value={p.status} /></td><td className="py-2 text-right tabular-nums">{formatINR(p.amount)}</td><td className="py-2 text-right text-xs text-muted">{dt(p.createdAt)}</td></tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="border hairline bg-paper p-6">
            <p className="field-label mb-4">Notifications</p>
            <ul className="space-y-2 text-sm">
              {notes.map((n) => (
                <li key={String(n._id)} className="flex flex-wrap gap-2"><Badge value={n.status} /> {n.channel} → {n.audience} ({n.to}) · {n.event}{n.lastError ? <span className="text-danger">{n.lastError}</span> : null}</li>
              ))}
              {!notes.length ? <li className="text-muted">None.</li> : null}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <BookingAdminActions id={id} status={b.status} canRefund={can(admin.role, "bookings.refund")} canManage={can(admin.role, "bookings.manage")} refundable={(b.amountPaid ?? 0) - (b.amountRefunded ?? 0)} />
          <section className="border hairline bg-paper p-6">
            <p className="field-label mb-4">History</p>
            <ol className="space-y-3 text-sm">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(b.statusHistory ?? []).map((h: any, k: number) => (
                <li key={k}><span className="text-muted">{dt(h.at)}</span><br />{h.from ? `${h.from} → ` : ""}{h.to}{h.note ? ` · ${h.note}` : ""}</li>
              ))}
            </ol>
          </section>
          <section className="border hairline bg-paper p-6">
            <p className="field-label mb-4">Internal notes</p>
            <ul className="space-y-3 text-sm">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(b.internalNotes ?? []).map((n: any, k: number) => <li key={k}><span className="text-muted">{n.byName} · {dt(n.at)}</span><br />{n.text}</li>)}
            </ul>
          </section>
          {b.attribution?.utm_source ? (
            <section className="border hairline bg-paper p-6 text-sm">
              <p className="field-label mb-3">Attribution</p>
              <p>{b.attribution.utm_source} / {b.attribution.utm_medium ?? "—"} / {b.attribution.utm_campaign ?? "—"}</p>
              {b.attribution.landingPage ? <p className="text-muted">Landed on {b.attribution.landingPage}</p> : null}
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
