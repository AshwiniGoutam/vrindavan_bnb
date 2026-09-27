import type { Paise } from "@/lib/money";

export interface GatewayPayment {
  id: string;
  orderId: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  amount: Paise;
  method?: string;
  errorDescription?: string;
}
export interface GatewayRefund {
  id: string;
  paymentId: string;
  amount: Paise;
  status: "pending" | "processed" | "failed";
}

export interface PaymentGateway {
  readonly name: "razorpay" | "mock";
  /** Public key for Checkout.js — never the secret. */
  readonly publicKeyId: string;
  createOrder(i: { amount: Paise; receipt: string; notes?: Record<string, string> }): Promise<{ orderId: string; amount: Paise }>;
  verifyCheckoutSignature(i: { orderId: string; paymentId: string; signature: string }): boolean;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  fetchPayment(paymentId: string): Promise<GatewayPayment>;
  fetchOrderPayments(orderId: string): Promise<GatewayPayment[]>;
  refund(i: { paymentId: string; amount: Paise; notes?: Record<string, string> }): Promise<GatewayRefund>;
}
