"use client";

import { postJSON } from "./shared";

export interface CheckoutSession {
  bookingCode: string;
  provider: "razorpay" | "mock";
  keyId: string;
  orderId: string;
  amount: number;
  holdExpiresAt: string;
  prefill: { name: string; email?: string; contact: string };
  description: string;
}

type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: { error?: { description?: string; metadata?: { payment_id?: string } } }) => void) => void };

function loadRazorpay(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error("Razorpay failed to load")));
    s.onerror = () => reject(new Error("Could not load the payment window. Check your connection."));
    document.body.appendChild(s);
  });
}

/**
 * Step 4: open Razorpay (or the development simulator), verify on the server, then go to the booking page.
 * The booking page (step 5) shows confirmation, pending, or failed + retry.
 */
export async function launchPayment(session: CheckoutSession, opts: { onMockPrompt?: () => Promise<boolean> } = {}) {
  const done = (q: string) => window.location.assign(`/booking/${session.bookingCode}${q}`);
  const fail = async (reason?: string, paymentId?: string) => {
    await postJSON(`/api/bookings/${session.bookingCode}/fail`, { orderId: session.orderId, paymentId, reason });
    done("?payment=failed");
  };
  const verify = async (paymentId: string, signature: string) => {
    const res = await postJSON(`/api/bookings/${session.bookingCode}/verify`, { orderId: session.orderId, paymentId, signature });
    done(res.ok ? "?payment=success" : "?payment=pending");
  };

  if (session.provider === "mock") {
    const success = opts.onMockPrompt ? await opts.onMockPrompt() : window.confirm("Development payment (no money is charged).\n\nOK = simulate success · Cancel = simulate failure");
    if (success) await verify(`pay_mock_${Date.now()}`, "mock_signature");
    else await fail("Simulated failure");
    return;
  }

  const Razorpay = await loadRazorpay();
  const rzp = new Razorpay({
    key: session.keyId,
    order_id: session.orderId,
    amount: session.amount,
    currency: "INR",
    name: "VHI Luxury Homestays",
    description: session.description,
    image: "/brand/vhi-logo-dark.png",
    prefill: session.prefill,
    theme: { color: "#1d1c1a" },
    handler: (r: { razorpay_payment_id: string; razorpay_signature: string }) => verify(r.razorpay_payment_id, r.razorpay_signature),
    modal: { ondismiss: () => fail("Checkout closed") },
  });
  rzp.on("payment.failed", (r) => fail(r.error?.description, r.error?.metadata?.payment_id));
  rzp.open();
}
