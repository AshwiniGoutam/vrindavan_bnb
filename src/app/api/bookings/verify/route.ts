import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { confirmPaidBooking } from "@/lib/booking-service";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const b = await req.json().catch(() => null);
  const booking = b?.bookingId ? await db.booking.findFirst({ where: { id: String(b.bookingId), userId: user.id } }) : null;
  if (!booking || booking.razorpayOrderId !== b.razorpay_order_id) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (!verifyPaymentSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature)) {
    return NextResponse.json({ error: "Payment couldn't be verified" }, { status: 400 });
  }
  const r = await confirmPaidBooking(booking.id, b.razorpay_payment_id);
  if (!r.ok) return NextResponse.json({ error: "Those dates were taken while you were paying. We've started a full refund." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
