import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { confirmPaidBooking } from "@/lib/booking-service";

// Safety net: confirms bookings even if the guest closes the tab right after paying.
// Razorpay dashboard -> Webhooks -> URL: https://YOURDOMAIN/api/webhooks/razorpay
// Events: payment.captured, payment.failed
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") ?? "")) {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }
  const event = JSON.parse(raw);
  const payment = event?.payload?.payment?.entity;
  if (!payment?.order_id) return NextResponse.json({ ok: true });

  const booking = await db.booking.findUnique({ where: { razorpayOrderId: payment.order_id } });
  if (!booking) return NextResponse.json({ ok: true });

  if (event.event === "payment.captured") await confirmPaidBooking(booking.id, payment.id);
  else if (event.event === "payment.failed" && booking.paymentStatus === "UNPAID") {
    await db.booking.update({ where: { id: booking.id }, data: { paymentStatus: "FAILED" } });
  }
  return NextResponse.json({ ok: true });
}
