import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { resolveQuote } from "@/lib/quote-service";
import { createOrder, razorpayConfigured } from "@/lib/razorpay";
import { parseUTC } from "@/lib/utils";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Log in to book this stay." }, { status: 401 });
  if (process.env.REQUIRE_VERIFIED_EMAIL === "true" && !user.emailVerifiedAt) {
    return NextResponse.json({ error: "Please confirm your email first. We sent you a link, or resend it from My trips." }, { status: 403 });
  }
  if (!rateLimit(`book:${user.id}:${clientIp(req)}`, 8, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const stay = body?.stayId ? await db.stay.findFirst({ where: { id: String(body.stayId), published: true } }) : null;
  if (!stay) return NextResponse.json({ error: "Stay not found" }, { status: 404 });

  const r = await resolveQuote({ stay, checkIn: body.checkIn, checkOut: body.checkOut, guests: body.guests, couponCode: body.coupon });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const q = r.quote;
  const code = `KTH-${randomBytes(3).toString("hex").toUpperCase()}`;

  if (!razorpayConfigured()) {
    return NextResponse.json({ error: "Online payments aren't set up yet. Message us on WhatsApp to book." }, { status: 503 });
  }

  try {
    const order = await createOrder({ amountInr: q.total, receipt: code, notes: { stay: stay.title, guest: user.email } });
    const booking = await db.booking.create({
      data: {
        code, stayId: stay.id, userId: user.id,
        checkIn: parseUTC(body.checkIn), checkOut: parseUTC(body.checkOut), guests: body.guests, nights: q.nights,
        subtotal: q.subtotal, discount: q.discount, couponCode: q.couponCode, taxes: q.taxes, total: q.total,
        razorpayOrderId: order.id, guestName: user.name, guestEmail: user.email, guestPhone: user.phone ?? "",
        status: "PENDING", paymentStatus: "UNPAID",
      },
    });
    return NextResponse.json({
      bookingId: booking.id, orderId: order.id, amount: q.total * 100, key: process.env.RAZORPAY_KEY_ID,
      prefill: { name: user.name, email: user.email, contact: user.phone ?? "" },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Couldn't start the payment. Please try again." }, { status: 502 });
  }
}
