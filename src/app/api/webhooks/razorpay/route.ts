import { NextResponse, type NextRequest } from "next/server";
import { paymentGateway } from "@/lib/integrations/razorpay";
import { connectDB } from "@/server/db/connect";
import { Payment, WebhookEvent } from "@/server/models";
import { confirmPayment, recordPaymentFailure } from "@/server/services/booking.service";

interface RzpWebhook {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id: string; method?: string; error_description?: string } };
    refund?: { entity: { id: string; status: string } };
  };
}

/**
 * Razorpay → us. Signature verified on the RAW body; idempotent by event id.
 * Subscribe to: payment.captured, payment.failed, order.paid, refund.processed, refund.failed.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!paymentGateway().verifyWebhookSignature(raw, signature)) return NextResponse.json({ ok: false }, { status: 400 });

  await connectDB();
  const body = JSON.parse(raw) as RzpWebhook;
  const eventId = req.headers.get("x-razorpay-event-id") || `${body.event}:${body.payload.payment?.entity.id ?? body.payload.refund?.entity.id}`;
  try {
    await WebhookEvent.create({ provider: "razorpay", eventId, type: body.event });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      const existing = await WebhookEvent.findOne({ provider: "razorpay", eventId }).lean<{ status: string }>();
      if (existing?.status !== "failed") return NextResponse.json({ ok: true, duplicate: true });
    } else throw e;
  }

  try {
    const p = body.payload.payment?.entity;
    switch (body.event) {
      case "payment.captured":
      case "order.paid":
        if (p) await confirmPayment({ orderId: p.order_id, paymentId: p.id, method: p.method, via: "webhook" });
        break;
      case "payment.failed":
        if (p) await recordPaymentFailure({ orderId: p.order_id, paymentId: p.id, reason: p.error_description });
        break;
      case "refund.processed":
      case "refund.failed": {
        const r = body.payload.refund?.entity;
        if (r) await Payment.updateOne({ refundId: r.id }, { status: body.event === "refund.processed" ? "processed" : "failed" });
        break;
      }
    }
    await WebhookEvent.updateOne({ provider: "razorpay", eventId }, { status: "processed" });
  } catch (e) {
    await WebhookEvent.updateOne({ provider: "razorpay", eventId }, { status: "failed", error: (e as Error).message });
    return NextResponse.json({ ok: false }, { status: 500 }); // Razorpay retries
  }
  return NextResponse.json({ ok: true });
}
