import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/site/LegalPage";
import { cancellationPolicy, site } from "@/lib/config";

export const metadata: Metadata = { title: "Cancellation and refund policy" };

// The table below is generated from `cancellationPolicy` in src/lib/config.ts, so the page and the refund maths never disagree.
export default function CancellationPolicy() {
  const tiers = [...cancellationPolicy].sort((a, b) => b.daysBefore - a.daysBefore);
  const label = (i: number) => {
    const t = tiers[i];
    if (i === 0) return `${t.daysBefore} or more days before check-in`;
    const next = tiers[i - 1];
    return t.daysBefore === 0 ? `Less than ${next.daysBefore} days before check-in, up to check-in` : `${t.daysBefore} to ${next.daysBefore - 1} days before check-in`;
  };
  return (
    <LegalPage title="Cancellation and refund policy">
      <p>Plans change. Here is exactly what you get back if you cancel a booking made directly on {site.name}.</p>

      <h2>Refund by timing</h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-[0.95rem]">
          <thead className="bg-mist"><tr><th className="p-4 font-semibold">When you cancel</th><th className="p-4 font-semibold">Refund</th></tr></thead>
          <tbody className="divide-y divide-line">
            {tiers.map((t, i) => (
              <tr key={t.daysBefore}><td className="p-4">{label(i)}</td><td className="p-4 font-semibold">{t.refundPercent === 0 ? "No refund" : `${t.refundPercent}% of the amount paid`}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>The refund is calculated on the total you paid, including GST. Days are counted from the moment you cancel to the check-in date.</p>

      <h2>How to cancel</h2>
      <p>Log in, open <Link href="/account">My trips</Link>, choose your booking and select Cancel booking. You'll see the exact refund before you confirm.</p>

      <h2>When refunds arrive</h2>
      <p>Refunds go back to the original payment method and usually reach you within 5 to 7 working days, depending on your bank.</p>

      <h2>If we cancel</h2>
      <p>If we cancel your booking for any reason, or can't hold your dates after you've paid, you receive a full refund.</p>

      <h2>Bookings from other platforms</h2>
      <p>If you booked through another travel platform, cancel there. That platform's policy applies.</p>

      <h2>Changing dates</h2>
      <p>To move your dates, message us on WhatsApp. If the new dates are free we'll change them without a fee, and any price difference is adjusted.</p>
    </LegalPage>
  );
}
