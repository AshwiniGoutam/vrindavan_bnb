import { percentOf, type Paise } from "@/lib/money";
import { diffDays, type ISODate } from "@/lib/dates";
import type { LineType, QuoteLine } from "./pricing/types";

/**
 * Policies are created in Admin (one or more per vertical). Nothing here is client wording —
 * it is only the arithmetic. Example rule set:
 *   [{ daysBeforeMin: 15, refundPercent: 100 }, { daysBeforeMin: 7, refundPercent: 50 }, { daysBeforeMin: 0, refundPercent: 0 }]
 */
export interface CancellationPolicyInput {
  id: string;
  name: string;
  rules: { daysBeforeMin: number; refundPercent: number }[];
  nonRefundableLineTypes: LineType[];
  /** Fixed deduction per cancellation (e.g. processing fee), in paise. */
  fixedDeduction: Paise;
  /** Whether GST on refundable lines is refunded along with them. */
  refundGst: boolean;
}

export interface RefundCalculation {
  policyId: string;
  daysBefore: number;
  refundPercent: number;
  refundableBase: Paise;
  deduction: Paise;
  refundAmount: Paise;
  nonRefundable: Paise;
}

export function calculateRefund(args: {
  policy: CancellationPolicyInput;
  lines: Pick<QuoteLine, "type" | "taxable" | "gstAmount">[];
  total: Paise;
  amountPaid: Paise;
  alreadyRefunded?: Paise;
  serviceStartDate: ISODate; // check-in or travel date
  cancelDate: ISODate; // today, IST
}): RefundCalculation {
  const { policy } = args;
  const daysBefore = diffDays(args.cancelDate, args.serviceStartDate);
  const rule = [...policy.rules].sort((a, b) => b.daysBeforeMin - a.daysBeforeMin).find((r) => daysBefore >= r.daysBeforeMin);
  const refundPercent = rule?.refundPercent ?? 0;

  const refundableFull = args.lines
    .filter((l) => !policy.nonRefundableLineTypes.includes(l.type))
    .reduce((s, l) => s + l.taxable + (policy.refundGst ? l.gstAmount : 0), 0);

  // If only part was paid (advance), the refundable base shrinks proportionally.
  const paidRatio = args.total > 0 ? Math.min(1, args.amountPaid / args.total) : 0;
  const refundableBase = Math.round(refundableFull * paidRatio);
  const gross = percentOf(refundableBase, refundPercent);
  const deduction = gross > 0 ? Math.min(policy.fixedDeduction, gross) : 0;
  const ceiling = Math.max(0, args.amountPaid - (args.alreadyRefunded ?? 0));
  const refundAmount = Math.max(0, Math.min(gross - deduction, ceiling));

  return {
    policyId: policy.id,
    daysBefore,
    refundPercent,
    refundableBase,
    deduction,
    refundAmount,
    nonRefundable: args.amountPaid - refundAmount,
  };
}
