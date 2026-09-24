import { addDaysISO, isISODate, nightsBetween, parseUTC, todayIST } from "./utils";

export type PricedStay = {
  basePrice: number;
  weekendPrice: number | null;
  extraGuestFee: number;
  cleaningFee: number;
  baseGuests: number;
  maxGuests: number;
  minNights: number;
};

export type DayRate = { price?: number | null; minNights?: number | null };
export type DayRates = Record<string, DayRate | undefined>;

export type Quote = {
  nights: number;
  nightly: { date: string; price: number }[];
  stayTotal: number;
  extraGuests: number;
  extraGuestTotal: number;
  cleaningFee: number;
  discount: number;
  couponCode: string | null;
  subtotal: number; // stay + extras + cleaning, before discount and tax
  taxRate: number;
  taxes: number;
  total: number;
};

/**
 * GST on accommodation in India is slab based on the per-night tariff.
 * Current rule of thumb: 5% up to Rs 7,500/night, 18% above. Confirm the
 * rate that applies to YOUR property type with your CA before going live.
 */
export function taxRateFor(avgNightly: number) {
  return avgNightly <= 7500 ? 0.05 : 0.18;
}

export function nightlyPrice(stay: PricedStay, date: string, dayRates?: DayRates) {
  const override = dayRates?.[date]?.price;
  if (override && override > 0) return override;
  const dow = parseUTC(date).getUTCDay(); // Fri (5) and Sat (6) nights
  return (dow === 5 || dow === 6) && stay.weekendPrice ? stay.weekendPrice : stay.basePrice;
}

export function validateRequest(
  stay: PricedStay, checkIn: unknown, checkOut: unknown, guests: unknown, dayRates?: DayRates,
): string | null {
  if (!isISODate(checkIn) || !isISODate(checkOut)) return "Choose your check-in and check-out dates.";
  if (checkIn < todayIST()) return "Check-in can't be in the past.";
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) return "Check-out must be after check-in.";
  if (nights > 60) return "Stays longer than 60 nights need a custom quote. Message us on WhatsApp.";
  const minNights = Math.max(stay.minNights, dayRates?.[checkIn]?.minNights ?? 0);
  if (nights < minNights) return `This stay needs a minimum of ${minNights} night${minNights > 1 ? "s" : ""} for those dates.`;
  if (!Number.isInteger(guests) || (guests as number) < 1) return "Add at least one guest.";
  if ((guests as number) > stay.maxGuests) return `This stay hosts up to ${stay.maxGuests} guests.`;
  return null;
}

export type CouponLike = {
  code: string; type: "PERCENT" | "FLAT"; value: number; minNights: number; minAmount: number;
  maxDiscount: number | null; validFrom: Date | null; validTo: Date | null;
  usageLimit: number | null; usedCount: number; active: boolean; stayIds: string[];
};

export function evaluateCoupon(
  c: CouponLike, ctx: { stayId: string; nights: number; stayTotal: number; now?: Date },
): { ok: true; discount: number } | { ok: false; error: string } {
  const now = ctx.now ?? new Date();
  if (!c.active) return { ok: false, error: "This code isn't active." };
  if (c.validFrom && now < c.validFrom) return { ok: false, error: "This code isn't valid yet." };
  if (c.validTo && now > c.validTo) return { ok: false, error: "This code has expired." };
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return { ok: false, error: "This code has been fully used." };
  if (c.stayIds.length > 0 && !c.stayIds.includes(ctx.stayId)) return { ok: false, error: "This code doesn't apply to this stay." };
  if (ctx.nights < c.minNights) return { ok: false, error: `This code needs at least ${c.minNights} nights.` };
  if (ctx.stayTotal < c.minAmount) return { ok: false, error: `This code needs a stay total of at least ₹${c.minAmount}.` };
  let discount = c.type === "PERCENT" ? Math.floor((ctx.stayTotal * c.value) / 100) : c.value;
  if (c.maxDiscount !== null) discount = Math.min(discount, c.maxDiscount);
  discount = Math.max(0, Math.min(discount, ctx.stayTotal));
  return discount > 0 ? { ok: true, discount } : { ok: false, error: "This code gives no discount on this stay." };
}

export function buildQuote(
  stay: PricedStay, checkIn: string, checkOut: string, guests: number,
  opts: { dayRates?: DayRates; discount?: number; couponCode?: string | null } = {},
): Quote {
  const nights = nightsBetween(checkIn, checkOut);
  const nightly = Array.from({ length: nights }, (_, i) => {
    const date = addDaysISO(checkIn, i);
    return { date, price: nightlyPrice(stay, date, opts.dayRates) };
  });
  const stayTotal = nightly.reduce((s, n) => s + n.price, 0);
  const extraGuests = Math.max(0, guests - stay.baseGuests);
  const extraGuestTotal = extraGuests * stay.extraGuestFee * nights;
  const subtotal = stayTotal + extraGuestTotal + stay.cleaningFee;
  const discount = Math.min(opts.discount ?? 0, stayTotal);
  const taxable = subtotal - discount;
  const taxRate = taxRateFor((stayTotal - discount) / nights);
  const taxes = Math.round(taxable * taxRate);
  return {
    nights, nightly, stayTotal, extraGuests, extraGuestTotal, cleaningFee: stay.cleaningFee,
    discount, couponCode: discount > 0 ? opts.couponCode ?? null : null,
    subtotal, taxRate, taxes, total: taxable + taxes,
  };
}
