import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { recordPaymentFailure } from "@/server/services/booking.service";
import { errorResponse } from "@/server/auth/with-admin";
import { rateLimit } from "@/server/rate-limit";

const schema = z.object({ orderId: z.string().min(5).max(80), paymentId: z.string().max(80).optional(), reason: z.string().max(300).optional() });

/** Browser reports a failed/cancelled checkout so the booking page can offer "retry payment". */
export async function POST(req: NextRequest) {
  try {
    await rateLimit("fail", 20, 60);
    await recordPaymentFailure(schema.parse(await req.json()));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
