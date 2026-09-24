import type { Stay } from "@/lib/db";
import { db } from "./db";
import { isAvailable } from "./availability";
import { getDayRates } from "./dayrates";
import { buildQuote, evaluateCoupon, validateRequest, type Quote } from "./pricing";
import { addDaysISO, isISODate, nightsBetween } from "./utils";

export type QuoteResult = { ok: true; quote: Quote } | { ok: false; status: number; error: string };

/** One place that validates, checks availability, applies day rates and coupons. Used by every price/booking route. */
export async function resolveQuote(input: {
  stay: Stay; checkIn: unknown; checkOut: unknown; guests: unknown; couponCode?: unknown;
}): Promise<QuoteResult> {
  const { stay, checkIn, checkOut, guests } = input;
  const usable = isISODate(checkIn) && isISODate(checkOut) && nightsBetween(checkIn, checkOut) >= 1 && nightsBetween(checkIn, checkOut) <= 60;
  const dayRates = usable ? await getDayRates(stay.id, checkIn, addDaysISO(checkOut, -1)) : {};

  const err = validateRequest(stay, checkIn, checkOut, guests, dayRates);
  if (err) return { ok: false, status: 400, error: err };
  const ci = checkIn as string, co = checkOut as string, g = guests as number;

  if (!(await isAvailable(stay.id, ci, co))) return { ok: false, status: 409, error: "Those dates are taken. Try different dates." };

  let discount = 0;
  let couponCode: string | null = null;
  const raw = typeof input.couponCode === "string" ? input.couponCode.trim().toUpperCase() : "";
  if (raw) {
    const coupon = await db.coupon.findUnique({ where: { code: raw } });
    if (!coupon) return { ok: false, status: 400, error: "That code isn't valid." };
    const base = buildQuote(stay, ci, co, g, { dayRates });
    const r = evaluateCoupon(coupon, { stayId: stay.id, nights: base.nights, stayTotal: base.stayTotal });
    if (!r.ok) return { ok: false, status: 400, error: r.error };
    discount = r.discount;
    couponCode = coupon.code;
  }
  return { ok: true, quote: buildQuote(stay, ci, co, g, { dayRates, discount, couponCode }) };
}
