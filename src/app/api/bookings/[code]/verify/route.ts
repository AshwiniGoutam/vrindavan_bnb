import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { paymentGateway } from "@/lib/integrations/razorpay";
import { confirmPayment } from "@/server/services/booking.service";
import { errorResponse } from "@/server/auth/with-admin";
import { AppError } from "@/server/errors";
import { rateLimit } from "@/server/rate-limit";

const schema = z.object({ orderId: z.string().min(5).max(80), paymentId: z.string().min(5).max(80), signature: z.string().min(10).max(200) });

/** Called by the browser after Razorpay Checkout succeeds. The webhook confirms independently (idempotent). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    await rateLimit("verify", 20, 60);
    const { code } = await params;
    const body = schema.parse(await req.json());
    if (!paymentGateway().verifyCheckoutSignature(body)) throw new AppError("BAD_SIGNATURE", "Payment could not be verified.", 400);
    const result = await confirmPayment({ orderId: body.orderId, paymentId: body.paymentId, via: "checkout" });
    if (result.code !== code) throw new AppError("MISMATCH", "Payment does not match this booking.", 400);
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    return errorResponse(e);
  }
}
