import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, XCircle, MessageCircle } from "lucide-react";
import { connectDB, isDbConfigured } from "@/server/db/connect";
import { Booking } from "@/server/models";
import { getSettings } from "@/server/services/settings.service";
import { bookingSummary } from "@/server/services/notification.service";
import { HoldCountdown, PurchaseTracker, RetryPayment } from "@/components/booking/booking-actions";
import { Steps } from "@/components/booking/shared";
import { formatINR } from "@/lib/money";
import { whatsappLink } from "@/lib/utils";

export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

const mask = (phone: string) => phone.replace(/(\+\d{2})\d+(\d{3})$/, "$1•••••$2");

export default async function BookingPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ payment?: string }> }) {
  const { code } = await params;
  const { payment } = await searchParams;
  if (!/^VHI-\d{4}-[A-Z0-9]{5}$/.test(code) || !isDbConfigured()) notFound();
  await connectDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = await Booking.findOne({ code }).lean<any>();
  if (!b) notFound();
  const settings = await getSettings();
  const sum = bookingSummary(b);
  const wa = settings.business.whatsapp;
  const confirmed = ["confirmed", "checked_in", "checked_out"].includes(b.status);
  const pending = b.status === "pending_payment";
  const holdActive = pending && b.holdExpiresAt && new Date(b.holdExpiresAt) > new Date();

  return (
    <div className="container-x max-w-4xl pb-24 pt-32 lg:pt-40">
      {b.vertical === "darshan" ? (
        <Steps current={confirmed ? 5 : 4} steps={["Journey", "Your details", "Add-ons & details", "Payment", "Confirmed"]} />
      ) : (
        <Steps current={confirmed ? 5 : 4} steps={["Dates", "Stay", "Your details", "Payment", "Confirmed"]} />
      )}

      {confirmed ? (
        <>
          {payment === "success" ? <PurchaseTracker code={b.code} value={b.pricing.total} name={sum.item} vertical={b.vertical} /> : null}
          <CheckCircle2 className="mt-12 h-10 w-10 text-success" strokeWidth={1.2} />
          <h1 className="display mt-6 text-5xl text-ink md:text-7xl">Radhe Radhe, {b.guest.name.split(" ")[0]}.</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Your booking is confirmed. We&apos;ve sent the details to {mask(b.guest.phone)} on WhatsApp{b.guest.email ? " and to your email" : ""}. The exact address and check-in instructions follow before arrival.
          </p>
        </>
      ) : pending ? (
        <>
          <Clock className="mt-12 h-10 w-10 text-umber" strokeWidth={1.2} />
          <h1 className="display mt-6 text-5xl text-ink md:text-6xl">{payment === "failed" || b.paymentStatus === "failed" ? "Payment didn't go through." : "Payment pending."}</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            {payment === "failed" || b.paymentStatus === "failed"
              ? "No money has been taken — or if it was, it will be confirmed or automatically refunded. You can try again while your dates are held."
              : "If you've just paid, confirmation can take a minute. Refresh this page shortly — or retry below."}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            {holdActive ? <RetryPayment code={b.code} /> : null}
            <p className="text-sm text-muted">{holdActive ? <HoldCountdown until={new Date(b.holdExpiresAt).toISOString()} /> : "Your hold has expired."}</p>
          </div>
        </>
      ) : (
        <>
          <XCircle className="mt-12 h-10 w-10 text-danger" strokeWidth={1.2} />
          <h1 className="display mt-6 text-5xl text-ink md:text-6xl">
            {b.status === "expired" ? "This booking has expired." : b.status === "cancelled" ? "This booking was cancelled." : "We couldn't complete this booking."}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            {b.status === "failed"
              ? "Your payment arrived after the dates were taken. A full refund has been initiated and our team will contact you."
              : b.status === "cancelled" && b.amountRefunded
                ? `A refund of ${formatINR(b.amountRefunded)} has been initiated.`
                : "Please start a new booking — or message us and we'll help."}
          </p>
          <Link href={b.vertical === "darshan" ? "/darshan-tours" : "/stays"} className="btn btn-primary mt-8">Start again</Link>
        </>
      )}

      <div className="mt-14 border hairline bg-paper p-6 md:p-10">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b hairline pb-6">
          <div>
            <p className="eyebrow">Booking ID</p>
            <p className="mt-2 font-mono text-xl text-ink">{b.code}</p>
          </div>
          <span className="bg-linen px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-umber">{b.status.replace("_", " ")}</span>
        </div>
        <dl className="grid gap-x-10 gap-y-5 pt-6 text-sm md:grid-cols-2">
          {[
            [sum.vertical, sum.item],
            ["Dates", sum.dates],
            ...(b.vertical !== "darshan" ? [["Nights", sum.nights]] : []),
            ["Guests", sum.guests],
            ["Meal plan", sum.mealPlan],
            ["Add-ons", sum.addOns],
            ...(b.pricing.discountTotal ? [["Discount", sum.discount]] : []),
            ...(b.pricing.gstTotal ? [["GST", sum.gst]] : []),
            ["Total", sum.total],
            ...(b.invoiceNumber ? [["Invoice", b.invoiceNumber]] : []),
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="field-label">{k}</dt>
              <dd className="mt-1 text-charcoal">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {wa ? (
        <a href={whatsappLink(wa, `Radhe Radhe! About my booking ${b.code}…`)} target="_blank" rel="noopener noreferrer" className="btn btn-outline mt-8">
          <MessageCircle className="h-4 w-4" strokeWidth={1.5} /> Message us about this booking
        </a>
      ) : null}
    </div>
  );
}
