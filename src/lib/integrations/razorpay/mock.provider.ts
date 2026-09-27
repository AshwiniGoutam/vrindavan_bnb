import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import type { GatewayPayment, PaymentGateway } from "./types";

/** Development gateway: lets the full booking flow run without Razorpay keys. Refused in production. */
const DEV_SECRET = "vhi-dev-mock-gateway";

export class MockGateway implements PaymentGateway {
  readonly name = "mock" as const;
  readonly publicKeyId = "mock";
  async createOrder(i: { amount: number }) {
    return { orderId: `order_mock_${randomBytes(8).toString("hex")}`, amount: i.amount };
  }
  static sign(orderId: string, paymentId: string) {
    return createHmac("sha256", DEV_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  }
  /** The dev checkout sends "mock_signature" (mock mode is refused in production, see index.ts). */
  verifyCheckoutSignature(i: { orderId: string; paymentId: string; signature: string }) {
    return i.orderId.startsWith("order_mock_") && (i.signature === "mock_signature" || MockGateway.sign(i.orderId, i.paymentId) === i.signature);
  }
  verifyWebhookSignature() {
    return false; // no webhooks in mock mode
  }
  async fetchPayment(paymentId: string): Promise<GatewayPayment> {
    return { id: paymentId, orderId: "", status: "captured", amount: 0, method: "mock" };
  }
  async fetchOrderPayments(): Promise<GatewayPayment[]> {
    return [];
  }
  async refund(i: { paymentId: string; amount: number }) {
    return { id: `rfnd_mock_${randomBytes(6).toString("hex")}`, paymentId: i.paymentId, amount: i.amount, status: "processed" as const };
  }
}
