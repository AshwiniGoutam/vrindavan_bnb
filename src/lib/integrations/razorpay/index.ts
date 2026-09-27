import "server-only";
import { env } from "@/lib/env";
import { RazorpayGateway } from "./razorpay.provider";
import { MockGateway } from "./mock.provider";
import type { PaymentGateway } from "./types";

let instance: PaymentGateway | undefined;

export function paymentGateway(): PaymentGateway {
  if (instance) return instance;
  const e = env();
  if (e.PAYMENT_PROVIDER === "razorpay") {
    if (!e.RAZORPAY_KEY_ID || !e.RAZORPAY_KEY_SECRET) throw new Error("PAYMENT_PROVIDER=razorpay but RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are missing.");
    instance = new RazorpayGateway({ keyId: e.RAZORPAY_KEY_ID, keySecret: e.RAZORPAY_KEY_SECRET, webhookSecret: e.RAZORPAY_WEBHOOK_SECRET });
  } else {
    if (e.APP_ENV === "production") throw new Error("Mock payments are disabled in production. Set PAYMENT_PROVIDER=razorpay.");
    instance = new MockGateway();
  }
  return instance;
}
export { MockGateway };
export * from "./types";
