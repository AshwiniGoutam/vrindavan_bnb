import { allocate, percentOf, type Paise } from "@/lib/money";
import type { ISODate } from "@/lib/dates";
import {
  PRICING_VERSION,
  type DiscountContext,
  type DiscountInput,
  type GstVertical,
  type Quote,
  type QuoteLine,
  type TaxConfig,
  type Vertical,
} from "./types";

export type RawLine = Omit<QuoteLine, "discount" | "taxable" | "gstRate" | "gstAmount">;

export function line(
  type: RawLine["type"],
  label: string,
  quantity: number,
  unitPrice: Paise,
  gstVertical: GstVertical,
  meta?: Record<string, unknown>,
): RawLine {
  return { type, label, quantity, unitPrice, amount: quantity * unitPrice, gstVertical, meta };
}

export function gstRateFor(tax: TaxConfig, vertical: GstVertical, unitPrice: Paise): number {
  const cfg = tax.verticals[vertical];
  if (!cfg) throw new Error(`No GST configuration for vertical "${vertical}"`);
  if (cfg.slabs?.length) {
    const slab = [...cfg.slabs]
      .sort((a, b) => (a.maxUnitPrice ?? Infinity) - (b.maxUnitPrice ?? Infinity))
      .find((s) => s.maxUnitPrice === null || unitPrice <= s.maxUnitPrice);
    if (slab) return slab.rate;
  }
  return cfg.rate;
}

export interface DiscountScope {
  vertical: Vertical;
  propertyId?: string;
  tourId?: string;
  packageId?: string;
  nights?: number;
  /** Date the discount validity is checked against (booking date, IST). */
  today: ISODate;
}

/** Returns null if the discount applies, otherwise a guest-safe reason. */
export function discountRejection(
  d: DiscountInput,
  scope: DiscountScope,
  ctx: DiscountContext,
  eligibleSubtotal: Paise,
): string | null {
  if (!d.active) return "This offer is no longer active.";
  if (d.startsAt && scope.today < d.startsAt) return "This offer has not started yet.";
  if (d.endsAt && scope.today > d.endsAt) return "This offer has expired.";
  if (!d.verticals.includes(scope.vertical)) return "This offer doesn't apply to this booking type.";
  if (d.propertyIds?.length && (!scope.propertyId || !d.propertyIds.includes(scope.propertyId)))
    return "This offer doesn't apply to this stay.";
  if (d.tourIds?.length && (!scope.tourId || !d.tourIds.includes(scope.tourId))) return "This offer doesn't apply to this tour.";
  if (d.packageIds?.length && (!scope.packageId || !d.packageIds.includes(scope.packageId)))
    return "This offer doesn't apply to this package.";
  if (d.minNights && (scope.nights ?? 0) < d.minNights) return `This offer needs a stay of at least ${d.minNights} nights.`;
  if (d.minAmount && eligibleSubtotal < d.minAmount) return "Booking value is below this offer's minimum.";
  if (d.firstBookingOnly && !ctx.isFirstBooking) return "This offer is for first bookings only.";
  if (ctx.usageLimitReached) return "This offer has been fully redeemed.";
  if (ctx.perCustomerLimitReached) return "You've already used this offer.";
  return null;
}

export function finalizeQuote(args: {
  vertical: Vertical;
  lines: RawLine[];
  tax: TaxConfig;
  discount?: DiscountInput;
  discountContext?: DiscountContext;
  scope: DiscountScope;
  compareAtTotal?: Paise;
  meta?: Record<string, unknown>;
}): Quote {
  const { vertical, lines, tax, discount, scope } = args;
  const ctx = args.discountContext ?? { isFirstBooking: false, usageLimitReached: false, perCustomerLimitReached: false };
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);

  // Discount
  const eligible = lines.map((l) => l.type !== "addon" || !!discount?.appliesToAddOns);
  const eligibleSubtotal = lines.reduce((s, l, i) => (eligible[i] ? s + l.amount : s), 0);
  let discountAmount = 0;
  let discountRejected: string | undefined;
  if (discount) {
    const reason = discountRejection(discount, scope, ctx, eligibleSubtotal);
    if (reason) discountRejected = reason;
    else {
      discountAmount = discount.type === "percent" ? percentOf(eligibleSubtotal, discount.value) : Math.round(discount.value);
      if (discount.maxDiscount != null) discountAmount = Math.min(discountAmount, discount.maxDiscount);
      discountAmount = Math.max(0, Math.min(discountAmount, eligibleSubtotal));
    }
  }
  const shares = allocate(
    discountAmount,
    lines.map((l, i) => (eligible[i] ? l.amount : 0)),
  );

  // GST per line on the discounted (taxable) amount. Slab is chosen on the pre-discount unit price.
  const finalLines: QuoteLine[] = lines.map((l, i) => {
    const taxable = l.amount - shares[i];
    const gstRate = gstRateFor(tax, l.gstVertical, l.unitPrice);
    return { ...l, discount: shares[i], taxable, gstRate, gstAmount: percentOf(taxable, gstRate) };
  });

  const taxableAmount = finalLines.reduce((s, l) => s + l.taxable, 0);
  const gstTotal = finalLines.reduce((s, l) => s + l.gstAmount, 0);

  const showStrike = discountAmount > 0 && discount?.kind === "auto_offer" && discount.showStrikeThrough;
  const compareAt = args.compareAtTotal ?? (showStrike ? subtotal : undefined);
  const payable = subtotal - discountAmount;

  return {
    vertical,
    lines: finalLines,
    subtotal,
    discountTotal: discountAmount,
    taxableAmount,
    gstTotal,
    total: taxableAmount + gstTotal,
    discount:
      discount && discountAmount > 0 ? { id: discount.id, code: discount.code, name: discount.name, amount: discountAmount } : undefined,
    discountRejected,
    display:
      compareAt && compareAt > payable
        ? { compareAtTotal: compareAt, savePercent: Math.round(((compareAt - payable) / compareAt) * 100) }
        : {},
    meta: args.meta ?? {},
    pricingVersion: PRICING_VERSION,
  };
}
