import { test } from "node:test";
import assert from "node:assert/strict";
import { buildQuote, evaluateCoupon, nightlyPrice, taxRateFor, validateRequest, type CouponLike, type PricedStay } from "../src/lib/pricing";
import { todayIST, addDaysISO } from "../src/lib/utils";

const stay: PricedStay = { basePrice: 10000, weekendPrice: 14000, extraGuestFee: 1000, cleaningFee: 1500, baseGuests: 4, maxGuests: 8, minNights: 2 };
const coupon = (o: Partial<CouponLike> = {}): CouponLike => ({
  code: "WELCOME10", type: "PERCENT", value: 10, minNights: 1, minAmount: 0, maxDiscount: null,
  validFrom: null, validTo: null, usageLimit: null, usedCount: 0, active: true, stayIds: [], ...o,
});

test("weekend nights (Fri, Sat) use the weekend price", () => {
  // 2026-10-02 is a Friday
  assert.equal(nightlyPrice(stay, "2026-10-02"), 14000);
  assert.equal(nightlyPrice(stay, "2026-10-03"), 14000);
  assert.equal(nightlyPrice(stay, "2026-10-04"), 10000); // Sunday
  assert.equal(nightlyPrice(stay, "2026-10-01"), 10000); // Thursday
});

test("a per-day override beats base and weekend prices", () => {
  assert.equal(nightlyPrice(stay, "2026-10-03", { "2026-10-03": { price: 20000 } }), 20000);
  assert.equal(nightlyPrice(stay, "2026-10-03", { "2026-10-03": { price: null } }), 14000);
});

test("quote adds extra guests, cleaning fee and GST", () => {
  // Thu + Fri nights = 10000 + 14000, 6 guests => 2 extra * 1000 * 2 nights
  const q = buildQuote(stay, "2026-10-01", "2026-10-03", 6);
  assert.equal(q.nights, 2);
  assert.equal(q.stayTotal, 24000);
  assert.equal(q.extraGuestTotal, 4000);
  assert.equal(q.subtotal, 24000 + 4000 + 1500);
  assert.equal(q.taxRate, 0.18); // avg 12,000 > 7,500
  assert.equal(q.taxes, Math.round(29500 * 0.18));
  assert.equal(q.total, 29500 + q.taxes);
});

test("GST slab is 5% at or below Rs 7,500 a night", () => {
  assert.equal(taxRateFor(7500), 0.05);
  assert.equal(taxRateFor(7501), 0.18);
});

test("discount reduces the taxable amount", () => {
  const q = buildQuote(stay, "2026-10-04", "2026-10-06", 2, { discount: 2000, couponCode: "X" }); // Sun+Mon, 20,000
  assert.equal(q.discount, 2000);
  assert.equal(q.couponCode, "X");
  const taxable = 20000 + 1500 - 2000;
  assert.equal(q.taxes, Math.round(taxable * 0.18));
  assert.equal(q.total, taxable + q.taxes);
});

test("validation: minimum nights, guests, dates in the past", () => {
  const t = todayIST();
  const in5 = addDaysISO(t, 5), in6 = addDaysISO(t, 6), in7 = addDaysISO(t, 7);
  assert.match(validateRequest(stay, in5, in6, 2)!, /minimum of 2/);
  assert.equal(validateRequest(stay, in5, in7, 2), null);
  assert.match(validateRequest(stay, in5, in7, 9)!, /up to 8 guests/);
  assert.match(validateRequest(stay, addDaysISO(t, -1), in5, 2)!, /past/);
  assert.match(validateRequest(stay, in7, in5, 2)!, /after check-in/);
  // A per-day minimum on the arrival date raises the requirement
  assert.match(validateRequest(stay, in5, in7, 2, { [in5]: { minNights: 3 } })!, /minimum of 3/);
});

test("coupon rules", () => {
  const ctx = { stayId: "s1", nights: 2, stayTotal: 20000 };
  assert.deepEqual(evaluateCoupon(coupon(), ctx), { ok: true, discount: 2000 });
  assert.deepEqual(evaluateCoupon(coupon({ maxDiscount: 1500 }), ctx), { ok: true, discount: 1500 });
  assert.deepEqual(evaluateCoupon(coupon({ type: "FLAT", value: 999999 }), ctx), { ok: true, discount: 20000 });
  assert.equal(evaluateCoupon(coupon({ active: false }), ctx).ok, false);
  assert.equal(evaluateCoupon(coupon({ usageLimit: 5, usedCount: 5 }), ctx).ok, false);
  assert.equal(evaluateCoupon(coupon({ stayIds: ["other"] }), ctx).ok, false);
  assert.equal(evaluateCoupon(coupon({ minNights: 3 }), ctx).ok, false);
  assert.equal(evaluateCoupon(coupon({ minAmount: 50000 }), ctx).ok, false);
  assert.equal(evaluateCoupon(coupon({ validTo: new Date("2020-01-01") }), ctx).ok, false);
  assert.equal(evaluateCoupon(coupon({ validFrom: new Date("2999-01-01") }), ctx).ok, false);
});
