import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { GatewayPayment, GatewayRefund, PaymentGateway } from "./types";

const API = "https://api.razorpay.com/v1";

const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
};

interface RzpPayment {
  id: string;
  order_id: string;
  status: GatewayPayment["status"];
  amount: number;
  method?: string;
  error_description?: string;
}

/** Razorpay via REST (no SDK dependency). Secrets never leave the server. */
export class RazorpayGateway implements PaymentGateway {
  readonly name = "razorpay" as const;
  constructor(private cfg: { keyId: string; keySecret: string; webhookSecret?: string }) {}
  get publicKeyId() {
    return this.cfg.keyId;
  }

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    const auth = Buffer.from(`${this.cfg.keyId}:${this.cfg.keySecret}`).toString("base64");
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as { error?: { description?: string } };
    if (!res.ok) throw new Error(`Razorpay ${path} failed (${res.status}): ${body.error?.description ?? "unknown error"}`);
    return body as T;
  }

  private map = (p: RzpPayment): GatewayPayment => ({
    id: p.id,
    orderId: p.order_id,
    status: p.status,
    amount: p.amount,
    method: p.method,
    errorDescription: p.error_description,
  });

  async createOrder(i: { amount: number; receipt: string; notes?: Record<string, string> }) {
    const o = await this.call<{ id: string; amount: number }>("/orders", {
      method: "POST",
      body: JSON.stringify({ amount: i.amount, currency: "INR", receipt: i.receipt.slice(0, 40), notes: i.notes }),
    });
    return { orderId: o.id, amount: o.amount };
  }

  verifyCheckoutSignature({ orderId, paymentId, signature }: { orderId: string; paymentId: string; signature: string }) {
    const expected = createHmac("sha256", this.cfg.keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    return safeEqual(expected, signature);
  }

  verifyWebhookSignature(rawBody: string, signature: string) {
    if (!this.cfg.webhookSecret) return false;
    const expected = createHmac("sha256", this.cfg.webhookSecret).update(rawBody).digest("hex");
    return safeEqual(expected, signature);
  }

  async fetchPayment(paymentId: string) {
    return this.map(await this.call<RzpPayment>(`/payments/${paymentId}`));
  }

  async fetchOrderPayments(orderId: string) {
    const r = await this.call<{ items: RzpPayment[] }>(`/orders/${orderId}/payments`);
    return r.items.map(this.map);
  }

  async refund(i: { paymentId: string; amount: number; notes?: Record<string, string> }): Promise<GatewayRefund> {
    const r = await this.call<{ id: string; payment_id: string; amount: number; status: GatewayRefund["status"] }>(
      `/payments/${i.paymentId}/refund`,
      { method: "POST", body: JSON.stringify({ amount: i.amount, speed: "normal", notes: i.notes }) },
    );
    return { id: r.id, paymentId: r.payment_id, amount: r.amount, status: r.status };
  }
}
