import Link from "next/link";
import { CheckCircle2, ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { formatDate, inr, utcISO } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Booking confirmed", robots: { index: false } };

export default async function BookingSuccess({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const user = await requireUser("/booking/success");
  if (!id) notFound();
  const booking = await db.booking.findFirst({ where: { id, userId: user.id }, include: { stay: true } });
  if (!booking) notFound();
  const confirmed = booking.status === "CONFIRMED" || booking.status === "COMPLETED";
  const cancelled = booking.status === "CANCELLED";

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 sm:p-10">
        <div className="flex size-12 items-center justify-center rounded-full bg-emerald-600 text-white"><CheckCircle2 size={26} /></div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-emerald-800">{confirmed ? "Booking confirmed" : cancelled ? "Booking cancelled" : "Payment processing"}</p>
        <h1 className="mt-2 text-4xl leading-tight">{confirmed ? "Your Vrindavan Holiday Inn is waiting for you." : cancelled ? "This booking was cancelled." : "We're confirming your payment."}</h1>
        <p className="mt-3 max-w-xl text-stone">{confirmed ? `Booking ${booking.code} is confirmed. Your stay details are saved under My Trips.` : cancelled ? `Booking ${booking.code} is no longer active.` : `Booking ${booking.code} isn't confirmed yet. Don't pay again. Check My Trips in a minute, or message us on WhatsApp.`}</p>

        <div className="mt-7 grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-2">
          <div className="flex gap-3"><CalendarDays className="mt-0.5 text-lake" size={18}/><div><small className="text-stone">Stay dates</small><p className="font-semibold">{formatDate(utcISO(booking.checkIn))} – {formatDate(utcISO(booking.checkOut))}</p></div></div>
          <div className="flex gap-3"><MapPin className="mt-0.5 text-lake" size={18}/><div><small className="text-stone">Property</small><p className="font-semibold">{booking.stay.title}, {booking.stay.city}</p></div></div>
          <div><small className="text-stone">Guests</small><p className="font-semibold">{booking.guests}</p></div>
          <div><small className="text-stone">{booking.paymentStatus === "PAID" ? "Total paid" : "Total"}</small><p className="font-semibold">{inr(booking.total)}</p></div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/account" className="btn btn-primary">View My Trips <ArrowRight size={15}/></Link>
          <Link href={`/stays/${booking.stay.slug}`} className="btn btn-ghost">View property</Link>
        </div>
      </section>
    </main>
  );
}
