import { NextResponse, type NextRequest } from "next/server";
import { createBookingSchema } from "@/server/validation";
import { createStayBooking, createTourBooking } from "@/server/services/booking.service";
import { rateLimit } from "@/server/rate-limit";
import { errorResponse } from "@/server/auth/with-admin";

/** Create a held booking + payment order. Returns what Razorpay Checkout needs. */
export async function POST(req: NextRequest) {
  try {
    await rateLimit("booking", 10, 60);
    const body = createBookingSchema.parse(await req.json());
    const session =
      body.vertical === "stay"
        ? await createStayBooking({ request: body.request, guest: body.guest, specialRequests: body.specialRequests, attribution: body.attribution })
        : await createTourBooking({ request: body.request, guest: body.guest, specialRequests: body.specialRequests, pickupPoint: body.pickupPoint, attribution: body.attribution });
    return NextResponse.json({ ok: true, data: session }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
