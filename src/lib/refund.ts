import { nightsBetween } from "./utils";

export type RefundTier = { daysBefore: number; refundPercent: number };

/** Tiers are "at least N days before check-in => X% refund". Highest matching N wins. */
export function refundPercentFor(tiers: RefundTier[], daysUntilCheckIn: number) {
  const sorted = [...tiers].sort((a, b) => b.daysBefore - a.daysBefore);
  for (const t of sorted) if (daysUntilCheckIn >= t.daysBefore) return t.refundPercent;
  return 0;
}

export function computeRefund(tiers: RefundTier[], checkIn: string, today: string, paidAmount: number) {
  const daysUntil = nightsBetween(today, checkIn);
  const percent = refundPercentFor(tiers, daysUntil);
  return { daysUntil, percent, amount: Math.floor((paidAmount * percent) / 100) };
}
