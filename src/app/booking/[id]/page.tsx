import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle, Star } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDate, inr, todayIST, utcISO } from "@/lib/utils";
import { cancellationPolicy, waLink } from "@/lib/config";
import { computeRefund } from "@/lib/refund";
import { CancelBooking, ReviewForm } from "@/components/stay/BookingActions";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/booking/${id}`);
  const b = await db.booking.findFirst({ where: { id, userId: user.id }, include: { stay: true, review: true } });
  if (!b) notFound();

  const today = todayIST();
  const ci = utcISO(b.checkIn), co = utcISO(b.checkOut);
  const paid = b.paymentStatus === "PAID";
  const cancelled = b.status === "CANCELLED";
  const canCancel = !cancelled && b.source === "DIRECT" && ci >= today && (paid || b.paymentStatus === "UNPAID");
  const refund = computeRefund(cancellationPolicy, ci, today, b.total);
  const canReview = paid && !cancelled && co <= today && !b.review;

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      {cancelled ? (
        <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-5 text-red-900">
          <XCircle />
          <div><h1 className="font-sans text-xl font-semibold">Booking cancelled</h1>
            <p className="text-sm">{b.refundAmount ? `A refund of ${inr(b.refundAmount)} has been started. It reaches you in 5 to 7 working days.` : "No payment was refunded for this cancellation."}</p></div>
        </div>
      ) : (
        <div className={`flex items-center gap-3 rounded-2xl p-5 ${paid ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
          {paid ? <CheckCircle2 /> : <Clock />}
          <div><h1 className="font-sans text-xl font-semibold">{paid ? "You're booked" : "Waiting for payment"}</h1>
            <p className="text-sm">{paid ? `Booking ${b.code} is confirmed. We've sent the details to your WhatsApp and email.` : "If you've just paid, this updates within a minute. Don't pay twice."}</p></div>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-line bg-white p-6">
        <h2 className="text-2xl">{b.stay.title}</h2>
        <p className="text-stone">{b.stay.city}, {b.stay.state}</p>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-stone">Check-in</dt><dd className="font-semibold">{formatDate(ci)}, from {b.stay.checkInTime}</dd></div>
          <div><dt className="text-stone">Check-out</dt><dd className="font-semibold">{formatDate(co)}, by {b.stay.checkOutTime}</dd></div>
          <div><dt className="text-stone">Guests</dt><dd className="font-semibold">{b.guests}</dd></div>
          <div><dt className="text-stone">Nights</dt><dd className="font-semibold">{b.nights}</dd></div>
        </dl>
        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt>Stay and fees</dt><dd>{inr(b.subtotal)}</dd></div>
          {b.discount > 0 && <div className="flex justify-between text-emerald-800"><dt>Discount {b.couponCode ? `(${b.couponCode})` : ""}</dt><dd>-{inr(b.discount)}</dd></div>}
          <div className="flex justify-between"><dt>GST</dt><dd>{inr(b.taxes)}</dd></div>
          <div className="flex justify-between text-base font-semibold"><dt>{paid ? "Paid" : "Total"}</dt><dd>{inr(b.total)}</dd></div>
        </dl>
      </div>

      {canCancel && (
        <div className="mt-6">
          <CancelBooking percent={paid ? refund.percent : 100} amount={paid ? refund.amount : 0} />
          <p className="mt-2 text-xs text-stone">See the <Link href="/cancellation-policy" className="underline">cancellation policy</Link>.</p>
        </div>
      )}

      {canReview && (
        <section className="mt-10 rounded-2xl border border-line bg-white p-6">
          <h2 className="text-2xl">How was {b.stay.title}?</h2>
          <p className="mb-5 mt-1 text-sm text-stone">Your review helps future guests and the host.</p>
          <ReviewForm bookingId={b.id} />
        </section>
      )}
      {b.review && (
        <section className="mt-10 rounded-2xl border border-line bg-white p-6">
          <h2 className="text-xl">Your review</h2>
          <p className="mt-2 flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={18} className={i < b.review!.rating ? "fill-marigold text-marigold" : "text-line"} />)}</p>
          <p className="mt-2 text-stone">{b.review.comment}</p>
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <a className="btn btn-primary" target="_blank" rel="noreferrer" href={waLink(`Hi, I have a question about booking ${b.code} at ${b.stay.title}.`)}>Message us about this booking</a>
        <Link className="btn btn-ghost" href="/account">All my trips</Link>
      </div>
    </div>
  );
}
